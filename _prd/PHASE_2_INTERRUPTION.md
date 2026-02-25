# Phase 2: Interruption Engine

*(See `PHASE_2_BRIDGE.md` for how this integrates into the main Director logic)*

### The Interruption Engine (`bridgeserver/interruptionEngine.js`)

**Design principle:** Only interrupt when a multi-signal weighted score exceeds threshold. Never interrupt on a single signal alone. Never interrupt a strong answer.

```js
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export class InterruptionEngine {
  constructor(sessionState) {
    this.state = sessionState
    this.rollingTranscript = ''       // Candidate's current turn transcript
    this.candidateSpeechStartedAt = null
    this.lastSilenceDuration = 0
    this.evalInterval = null
    this.cooldownMs = 45000           // 45s minimum between interrupts
    this.onInterruptDecided = null    // Set by director — callback when interrupt fires
  }

  onCandidateSpeechStart() {
    this.candidateSpeechStartedAt = Date.now()
    this.rollingTranscript = ''
    // Start eval loop — runs every 4 seconds
    this.evalInterval = setInterval(() => this._runEvalCycle(), 4000)
  }

  onCandidateSpeechStop() {
    this.lastSilenceDuration = 0
    // Start silence timer
    this._silenceTimer = setInterval(() => {
      this.lastSilenceDuration += 0.5
    }, 500)
  }

  onCandidateTranscriptUpdate(newText) {
    // Called when a full candidate turn transcript arrives (Whisper result)
    this.rollingTranscript = newText
    clearInterval(this._silenceTimer)
    this.lastSilenceDuration = 0
    clearInterval(this.evalInterval)  // Turn ended — stop eval loop
  }

  stop() {
    clearInterval(this.evalInterval)
    clearInterval(this._silenceTimer)
  }

  async _runEvalCycle() {
    if (!this.rollingTranscript || this.rollingTranscript.length < 20) return

    const elapsedSeconds = (Date.now() - this.candidateSpeechStartedAt) / 1000
    const score = await this._computeScore(elapsedSeconds)

    if (score >= 7 && this._cooldownPassed()) {
      const type = this._chooseInterruptType(score)
      clearInterval(this.evalInterval)
      this.onInterruptDecided?.(type)
    }
  }

  async _computeScore(elapsedSeconds) {
    let score = 0

    // ── SIGNAL 1: TIME vs EXPECTED ──────────────────────────
    const expected = 75  // seconds — reasonable for most technical questions
    const ratio = elapsedSeconds / expected
    if (ratio > 1.4)      score += 4
    else if (ratio > 1.1) score += 2
    else if (ratio < 0.4) return 0  // Too early — never interrupt

    // ── SIGNAL 2: CONTENT QUALITY (fast LLM eval) ──────────
    // Only call if we're past the early window — saves cost
    if (elapsedSeconds > 20) {
      const quality = await this._quickQualityEval()
      const qualityScores = {
        STRONG:    -3,  // Hard veto — never interrupt strong answers
        ADEQUATE:   0,
        WEAK:       2,
        CIRCULAR:   4,  // Repeating themselves
        OFF_TOPIC:  5   // Completely off track
      }
      const qualityScore = qualityScores[quality] ?? 0
      if (quality === 'STRONG') return 0  // Hard veto regardless of other signals
      score += qualityScore
    }

    // ── SIGNAL 3: LINGUISTIC PATTERNS ──────────────────────
    const text = this.rollingTranscript.toLowerCase()
    const words = text.split(/\s+/)
    const fillers = ['um', 'uh', 'like', 'basically', 'you know', 'kind of', 'sort of', 'i think maybe', 'i mean']
    const fillerCount = fillers.reduce((n, f) => n + (text.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length, 0)
    const fillerDensity = fillerCount / Math.max(words.length, 1)

    if (fillerDensity > 0.10) score += 3  // >10% fillers — struggling
    else if (fillerDensity > 0.07) score += 1

    // Long answer but quality is not improving
    if (words.length > 180) score += 2

    // ── SIGNAL 4: SILENCE ───────────────────────────────────
    if (this.lastSilenceDuration > 10) score += 4  // 10s silence = lost
    else if (this.lastSilenceDuration > 6) score += 2
    else if (this.lastSilenceDuration < 2) score -= 2  // Actively speaking — back off

    return score
  }

  async _quickQualityEval() {
    // Uses Gemini chat (not realtime) — fast and cheap
    // Each call: ~150 input tokens + 5 output tokens = ~$0.00003
    const transcriptWindow = this.rollingTranscript.slice(-600);
    const evalPrompt = `Rate this interview answer in one word.
Words to choose from: STRONG, ADEQUATE, WEAK, CIRCULAR, OFF_TOPIC

STRONG = specific, technically accurate, addresses the question directly
ADEQUATE = correct but surface-level, lacks depth
WEAK = vague, incorrect, or mostly filler
CIRCULAR = repeating the same point without adding new information
OFF_TOPIC = not addressing the question asked

Answer transcript so far:
"${this.rollingTranscript.slice(-600)}"

One word only:`
        }]
      })
      return response.choices[0].message.content.trim().toUpperCase()
    } catch {
      return 'ADEQUATE'  // Fail safe — don't interrupt on eval failure
    }
  }

  _chooseInterruptType(score) {
    const text = this.rollingTranscript.toLowerCase()

    // Check for specific patterns
    const words = text.split(/\s+/)
    const isCircular = this._detectCircularRepetition()
    const isOffTopic = score >= 9  // Very high score usually means off-topic

    if (isCircular)                      return 'REDIRECT'
    if (isOffTopic)                      return 'REFOCUS'
    if (this.lastSilenceDuration > 8)   return 'SIMPLIFY'
    if (words.length > 180)             return 'PROBE'
    return 'CUT'
  }

  _detectCircularRepetition() {
    // Split transcript into halves — if second half overlaps heavily with first, it's circular
    const words = this.rollingTranscript.toLowerCase().split(/\s+/)
    if (words.length < 40) return false
    const half = Math.floor(words.length / 2)
    const firstHalf = new Set(words.slice(0, half))
    const secondHalf = words.slice(half)
    const overlap = secondHalf.filter(w => w.length > 4 && firstHalf.has(w)).length
    return overlap / secondHalf.length > 0.55  // >55% word overlap = circular
  }

  _cooldownPassed() {
    if (!this.state.lastInterruptAt) return true
    const elapsed = Date.now() - this.state.lastInterruptAt
    const jitter = Math.random() * 10000  // ±10s randomness feels human
    return elapsed > (45000 + jitter)
  }
}
```
