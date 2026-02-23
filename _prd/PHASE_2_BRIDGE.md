# Phase 2: Bridge Server & Director

*(See `SCHEMAS.md` for session state schema)*

### 2.1 Bridge Server Setup (`bridgeserver/index.js`)

```js
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { createInterviewSession } from './director.js'
import 'dotenv/config'

const app = express()
const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (browserWs, req) => {
  const sessionId = req.url.split('/').pop()
  if (!sessionId) return browserWs.close(1008, 'Missing sessionId')
  createInterviewSession(browserWs, sessionId)
})

httpServer.listen(process.env.BRIDGE_PORT || 3001)
```

### 2.2 The Director (`bridgeserver/director.js`)

The director is the brain of the bridge server. It manages:
1. The OpenAI Realtime connection
2. Round transitions (injecting new system prompts)
3. Transcript logging

```js
import WebSocket from 'ws'
import { redis } from './redisClient.js'
import { InterruptionEngine } from './interruptionEngine.js'

const OPENAI_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview'

export async function createInterviewSession(browserWs, sessionId) {
  // Load pre-built context
  const contextRaw = await redis.get(`context:${sessionId}`)
  const promptsRaw = await redis.get(`systemprompts:${sessionId}`)
  if (!contextRaw || !promptsRaw) {
    browserWs.send(JSON.stringify({ type: 'error', message: 'Session not found. Re-upload your materials.' }))
    return browserWs.close()
  }

  const context = JSON.parse(contextRaw)
  const roundPrompts = JSON.parse(promptsRaw)
  const rounds = context.interviewPlan.rounds

  // Live session state
  const state = {
    sessionId,
    currentRoundIndex: 0,
    turnsInCurrentRound: 0,
    totalTurns: 0,
    interviewStartedAt: Date.now(),
    lastCandidateTurnStartedAt: null,
    lastInterruptAt: null,
    interviewComplete: false,
    transcript: []
  }

  const engine = new InterruptionEngine(state)

  // Open OpenAI connection
  const openaiWs = new WebSocket(OPENAI_URL, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  })

  // ─── OPENAI → BROWSER ────────────────────────────────────────────────────
  openaiWs.on('message', async (raw) => {
    const event = JSON.parse(raw.toString())

    switch (event.type) {

      case 'session.created':
        // Inject Round 1 system prompt + configure session
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'echo',
            instructions: roundPrompts[rounds[0].id],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600
            },
            temperature: 0.75,
            max_response_output_tokens: 200  // ~30 seconds of speech max
          }
        }))
        browserWs.send(JSON.stringify({ type: 'session_ready' }))
        break

      case 'input_audio_buffer.speech_started':
        // Candidate started speaking — start timing their turn
        state.lastCandidateTurnStartedAt = Date.now()
        engine.onCandidateSpeechStart()
        browserWs.send(raw.toString())
        break

      case 'input_audio_buffer.speech_stopped':
        engine.onCandidateSpeechStop()
        browserWs.send(raw.toString())
        break

      case 'conversation.item.input_audio_transcription.completed': {
        const text = event.transcript
        const timestamp = Date.now() - state.interviewStartedAt
        const entry = { role: 'candidate', text, timestamp, turnIndex: state.totalTurns }

        state.transcript.push(entry)
        state.turnsInCurrentRound++
        state.totalTurns++

        await persistTranscript(sessionId, state.transcript)
        engine.onCandidateTranscriptUpdate(text)

        browserWs.send(JSON.stringify({ type: 'transcript_candidate', text, timestamp }))

        // Check round transition AFTER logging the turn
        await checkRoundTransition(state, rounds, roundPrompts, openaiWs, browserWs)
        break
      }

      case 'response.audio_transcript.done': {
        const text = event.transcript
        const timestamp = Date.now() - state.interviewStartedAt
        state.transcript.push({ role: 'interviewer', text, timestamp })

        await persistTranscript(sessionId, state.transcript)
        browserWs.send(JSON.stringify({ type: 'transcript_ai_done', text, timestamp }))

        // Check if closing phrase was spoken
        if (text.toLowerCase().includes("thanks for your time") ||
            text.toLowerCase().includes("we'll be in touch")) {
          await endInterview(state, sessionId, browserWs, openaiWs)
        }
        break
      }

      case 'response.audio_transcript.delta':
        browserWs.send(raw.toString())  // Stream to transcript UI
        break

      case 'response.audio.delta':
        browserWs.send(raw.toString())  // Stream audio to browser
        break

      default:
        browserWs.send(raw.toString())
    }
  })

  // ─── BROWSER → OPENAI ────────────────────────────────────────────────────
  browserWs.on('message', (raw) => {
    const event = JSON.parse(raw.toString())
    const allowed = [
      'input_audio_buffer.append',
      'input_audio_buffer.commit',
      'input_audio_buffer.clear'
    ]
    if (allowed.includes(event.type) && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(raw.toString())
    }
    // All other client events are ignored — browser cannot control the session directly
  })

  // ─── CLEANUP ─────────────────────────────────────────────────────────────
  browserWs.on('close', () => {
    engine.stop()
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close()
  })

  openaiWs.on('close', () => {
    engine.stop()
    browserWs.send(JSON.stringify({ type: 'openai_disconnected' }))
  })

  openaiWs.on('error', (err) => {
    console.error(`OpenAI WS error [${sessionId}]:`, err.message)
    browserWs.send(JSON.stringify({ type: 'error', message: 'Connection to interview engine lost.' }))
  })

  // ─── INTERRUPTION ENGINE CALLBACKS ───────────────────────────────────────
  engine.onInterruptDecided = async (interruptType) => {
    if (openaiWs.readyState !== WebSocket.OPEN) return

    const lines = {
      REDIRECT:  "Hold on — you've covered that point. Give me the core answer in one sentence.",
      REFOCUS:   "Let me stop you there — I asked specifically about X. Address that directly.",
      PROBE:     "Stop — you've been talking for a while. What's your actual answer in one sentence?",
      CUT:       "I get the context. But how would you implement it? Specifically.",
      SIMPLIFY:  "Let's step back. Start from the very beginning — what's the simplest version of this?"
    }
    const line = lines[interruptType] || lines.REDIRECT

    // Cancel current model response if it's speaking
    openaiWs.send(JSON.stringify({ type: 'response.cancel' }))
    // Clear audio buffer
    openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
    // Inject the interrupt as a new conversation item
    openaiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: line }]
      }
    }))
    // Trigger the model to speak it
    openaiWs.send(JSON.stringify({ type: 'response.create' }))

    state.lastInterruptAt = Date.now()
    browserWs.send(JSON.stringify({ type: 'interrupt_fired', interruptType, line }))
  }
}

// ─── ROUND TRANSITION ──────────────────────────────────────────────────────
async function checkRoundTransition(state, rounds, roundPrompts, openaiWs, browserWs) {
  const currentRound = rounds[state.currentRoundIndex]
  const nextRoundIndex = state.currentRoundIndex + 1

  // Transition when allocated turns for this round are exhausted
  if (state.turnsInCurrentRound < currentRound.turnCount) return
  if (nextRoundIndex >= rounds.length) return  // Already on last round

  const nextRound = rounds[nextRoundIndex]
  state.currentRoundIndex = nextRoundIndex
  state.turnsInCurrentRound = 0

  // Inject new system prompt for next round
  // This is a session.update — the model will incorporate it on next response
  openaiWs.send(JSON.stringify({
    type: 'session.update',
    session: {
      instructions: roundPrompts[nextRound.id]
    }
  }))

  browserWs.send(JSON.stringify({
    type: 'round_transition',
    fromRound: currentRound.name,
    toRound: nextRound.name,
    roundIndex: nextRoundIndex
  }))
}

async function persistTranscript(sessionId, transcript) {
  await redis.set(`transcript:${sessionId}`, JSON.stringify(transcript), 'EX', 86400)
}

async function endInterview(state, sessionId, browserWs, openaiWs) {
  state.interviewComplete = true
  await persistTranscript(sessionId, state.transcript)

  browserWs.send(JSON.stringify({ type: 'interview_complete', sessionId }))

  setTimeout(() => {
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close()
    browserWs.close()
  }, 3000)
}
```

### 2.3 Session Recovery & Resilience

**Browser tab close mid-interview:**
- Bridge detects `browserWs.close` event → closes OpenAI WS → saves transcript to Redis
- On reconnect (user returns to `/interview/[sessionId]`): bridge loads transcript from Redis, resumes from current round
- Frontend: on page load, check `/api/session-status/[sessionId]` — if `interviewComplete: false` and transcript exists, show "Resume your interview" prompt

**OpenAI connection drop:**
- Bridge detects `openaiWs.close` → notifies browser via `{ type: 'openai_disconnected' }`
- Bridge attempts reconnect once after 2s delay, re-injects current round system prompt
- If reconnect fails → notify browser → show "Interview paused" UI → let user retry

**Redis unavailable:**
- All Redis calls wrapped in try/catch
- If Redis is down, transcript is kept in bridge server memory only
- On Redis recovery, flush memory transcript to Redis
- If Redis is down at report generation time → show "Report temporarily unavailable, try again in a moment"
