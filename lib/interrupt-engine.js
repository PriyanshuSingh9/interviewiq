/**
 * interrupt-engine.js
 *
 * Intelligent Interrupt Decision Engine for InterviewIQ.
 *
 * A client-side scoring system that monitors the candidate's live answer
 * and decides when + how the AI interviewer should interrupt — just like
 * a real human interviewer would.
 *
 * Runs a scoring evaluation every ~3-4 seconds on 4 signal channels:
 *   1. Time vs Question Complexity
 *   2. Linguistic Patterns (filler density, verbosity)
 *   3. Circular Repetition (n-gram overlap)
 *   4. Silence Gaps (thinking vs lost)
 *
 * Only fires an interrupt when the combined score crosses a threshold,
 * never on a single signal alone. Includes hard rules, cooldown with
 * randomized backoff, and progressive escalation.
 */

// ─── Interrupt Types ────────────────────────────────────────
// Each interrupt type + severity maps to a specific instruction sent
// to Gemini via sendClientContent so it delivers the right tone.

const INTERRUPT_PROMPTS = {
    RESCUE: {
        gentle: `The candidate has been silent for a while and appears stuck. Help them along naturally — say something like "Take your best guess" or "What's the first thing that comes to mind?" or "Want me to rephrase that?" Keep it warm and natural.`,
        firm: `The candidate has gone quiet and seems lost. Prompt them directly — ask if they'd like you to move on to a different question or offer a small hint. Be professional, not patronizing.`,
    },
    REDIRECT: {
        gentle: `The candidate is starting to circle back to the same point. Naturally acknowledge what they said and steer them forward with a sharper follow-up question.`,
        firm: `The candidate is repeating themselves. Interject smoothly — say something like "I understand that part — but what specifically would you do about [the core point]?" or "You've covered that — let's go deeper."`,
        neutral: `The candidate's answer is losing focus. Bring them back to the core of the question in a natural, conversational way.`,
    },
    CUT: {
        assertive: `The candidate has been talking too long on this question. Cut them off professionally — say something like "Let me stop you there — I think I have a good picture of your approach. Let me ask you something else." or "Okay great, I want to make sure we cover everything, so let's move on." Be firm and decisive.`,
        firm: `The candidate is over-explaining. Politely but firmly wrap up their answer and transition to the next question or a follow-up.`,
    },
    PROBE: {
        gentle: `The candidate appears to be struggling. Give them ONE small hint or rephrase the question in a simpler way. Don't hand them the answer — nudge them toward the right direction.`,
        firm: `The candidate has been talking but hasn't given a clear or strong answer. Interrupt naturally and say something like "Okay — give me the key takeaway in one sentence" or "What's the bottom line here?"`,
    },
    REFOCUS: {
        firm: `The candidate has gone off-topic. Bring them back directly — say something like "Hold on — I was asking specifically about [the original topic]. Can you address that?" Be direct but not rude.`,
    },
};

// ─── Time Budgets (seconds per question type) ──────────────
// How long a candidate should reasonably take before signaling overrun.
const TIME_BUDGETS = {
    simple_factual: 30,       // "What is polymorphism?" → 30s max
    conceptual: 60,           // "Explain how a hash map works" → 1min
    behavioral: 120,          // "Tell me about a conflict" → 2min
    system_design: 180,       // "Design Twitter" → 3min
    case_study: 150,          // Business case analysis → 2.5min
    coding: 120,              // Live coding explanation → 2min
    general: 90,              // Default fallback
};

// ─── Filler Patterns ────────────────────────────────────────
// Ordered roughly by how "damaging" each filler is.
// We match word boundaries to avoid false positives.
const FILLER_PATTERNS = [
    "um", "uh", "uhh", "umm",
    "basically", "like", "you know", "kind of", "sort of",
    "i think maybe", "i guess", "right", "so yeah",
    "i mean", "actually", "literally", "honestly",
    "obviously", "to be honest", "in a sense",
    "and stuff", "or something", "or whatever",
];

// Pre-compile regexes for performance (called every 3.5s)
const FILLER_REGEXES = FILLER_PATTERNS.map(
    (f) => new RegExp(`\\b${f.replace(/\s+/g, "\\s+")}\\b`, "gi")
);

// ─── Thinking Phrases (silence classification) ──────────────
const THINKING_PHRASES = [
    "let me think", "good question", "hmm", "let me consider",
    "give me a moment", "give me a second", "that's interesting",
    "let me recall", "let me see", "hold on",
    "interesting question", "i need to think about",
];

// ─── Main Class ─────────────────────────────────────────────

export class InterruptEngine {
    /**
     * @param {Object} opts
     * @param {number}   opts.threshold          – combined score to trigger (default 8)
     * @param {number}   opts.minElapsedSeconds   – never interrupt before this (default 15)
     * @param {number}   opts.cooldownBase        – seconds between interrupts (default 45)
     * @param {number}   opts.cooldownVariance    – ± random variance (default 15)
     * @param {number}   opts.checkIntervalMs     – scoring interval (default 3500)
     * @param {Function} opts.onInterrupt         – (interruptType, prompt) => void
     * @param {Function} opts.onScoreUpdate       – (scoreData) => void (for debug UI)
     */
    constructor(opts = {}) {
        // ── Configuration ──
        this.threshold = opts.threshold ?? 8;
        this.minElapsedSeconds = opts.minElapsedSeconds ?? 15;
        this.cooldownBase = opts.cooldownBase ?? 45;
        this.cooldownVariance = opts.cooldownVariance ?? 15;
        this.checkIntervalMs = opts.checkIntervalMs ?? 3500;

        // ── Callbacks ──
        this.onInterrupt = opts.onInterrupt || (() => { });
        this.onScoreUpdate = opts.onScoreUpdate || (() => { });

        // ── Internal State ──
        this._lastInterruptTime = 0;
        this._currentCooldown = this.cooldownBase;
        this._interruptCount = 0;            // how many times we've interrupted this session
        this._turnInterruptCount = 0;        // how many times for this specific answer
        this._silenceStartTime = null;
        this._lastSilenceDuration = 0;
        this._isSpeaking = false;
        this._intervalId = null;
        this._turnStartTime = null;
        this._candidateTranscript = "";
        this._questionType = "general";
        this._questionText = "";
        this._enabled = true;
        this._aiSpeaking = false;            // don't evaluate while AI is talking
    }

    // ─── Public API ─────────────────────────────────────────

    /**
     * Start monitoring a new answer.
     * Call this when the AI finishes asking a question and the candidate begins.
     */
    start(questionType, questionText) {
        this.stop(); // clean up any previous interval
        this._questionType = questionType || "general";
        this._questionText = questionText || "";
        this._turnStartTime = Date.now();
        this._candidateTranscript = "";
        this._silenceStartTime = null;
        this._lastSilenceDuration = 0;
        this._turnInterruptCount = 0;

        this._intervalId = setInterval(() => this._evaluate(), this.checkIntervalMs);
    }

    /**
     * Stop monitoring.
     */
    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Feed incremental transcript text from Gemini's input transcription.
     * Called on every transcript chunk (word/phrase level).
     */
    feedTranscript(text) {
        if (text && text.trim()) {
            this._candidateTranscript += text;
        }
    }

    /**
     * Update whether the candidate is currently speaking.
     * Called from the audio analyser in the interview room.
     */
    updateSpeakingState(isSpeaking) {
        const now = Date.now();

        if (this._isSpeaking && !isSpeaking) {
            // Transition: speaking → silent — silence starts
            this._silenceStartTime = now;
        } else if (!this._isSpeaking && isSpeaking) {
            // Transition: silent → speaking — record the silence duration
            if (this._silenceStartTime) {
                this._lastSilenceDuration = (now - this._silenceStartTime) / 1000;
            }
            this._silenceStartTime = null;
        }

        this._isSpeaking = isSpeaking;
    }

    /**
     * Update whether the AI is currently speaking.
     * We never evaluate (and never interrupt) while the AI is talking.
     */
    updateAiSpeakingState(isSpeaking) {
        this._aiSpeaking = isSpeaking;
    }

    /**
     * Reset for a new question (called when AI asks the next question).
     */
    resetForNewQuestion(questionType, questionText) {
        this.stop();
        this.start(questionType, questionText);
    }

    /**
     * Enable or disable the engine.
     */
    setEnabled(enabled) {
        this._enabled = enabled;
    }

    /**
     * Clean up everything.
     */
    destroy() {
        this.stop();
        this._enabled = false;
    }

    // ─── Scoring Engine ─────────────────────────────────────

    _evaluate() {
        // Bail out if disabled, no active turn, or AI is speaking
        if (!this._enabled || !this._turnStartTime || this._aiSpeaking) return;

        const now = Date.now();
        const elapsed = (now - this._turnStartTime) / 1000;
        const transcript = this._candidateTranscript.trim();
        const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        // ── HARD RULES (checked first, override everything) ──

        // Never interrupt in the first N seconds
        if (elapsed < this.minElapsedSeconds) return;

        // Respect cooldown — don't rapid-fire interrupts
        if (!this._canInterruptNow()) return;

        // Don't interrupt someone actively mid-sentence
        const currentSilence = this._getCurrentSilenceDuration();
        if (this._isSpeaking && currentSilence < 1.5) return;

        // Nothing to evaluate if no transcript yet
        if (wordCount < 5) return;

        // ── SCORING ──

        let score = 0;
        const signals = {};

        // ── SIGNAL 1: Time vs Complexity ──────────────────────
        const budget = TIME_BUDGETS[this._questionType] || TIME_BUDGETS.general;
        const timeRatio = elapsed / budget;

        if (timeRatio > 1.4) {
            score += 4;
            signals.time = { score: 4, ratio: timeRatio, detail: `${Math.round((timeRatio - 1) * 100)}% over budget` };
        } else if (timeRatio > 1.1) {
            score += 2;
            signals.time = { score: 2, ratio: timeRatio, detail: `${Math.round((timeRatio - 1) * 100)}% over budget` };
        } else if (timeRatio < 0.4) {
            // Still early — apply a dampener to prevent premature interrupts
            score -= 1;
            signals.time = { score: -1, ratio: timeRatio, detail: "still early" };
        }

        // ── SIGNAL 2: Filler Density ─────────────────────────
        let fillerCount = 0;
        for (const regex of FILLER_REGEXES) {
            const matches = transcript.match(regex);
            if (matches) fillerCount += matches.length;
        }
        const fillerDensity = wordCount > 0 ? fillerCount / wordCount : 0;

        if (fillerDensity > 0.10) {
            score += 3;
            signals.fillers = { score: 3, density: fillerDensity, count: fillerCount, detail: `${(fillerDensity * 100).toFixed(1)}% filler words` };
        } else if (fillerDensity > 0.06) {
            score += 1;
            signals.fillers = { score: 1, density: fillerDensity, count: fillerCount, detail: `${(fillerDensity * 100).toFixed(1)}% filler words` };
        }

        // ── SIGNAL 3: Circular Repetition (trigram overlap) ──
        const repetitionScore = this._detectRepetition(transcript);

        if (repetitionScore > 0.40) {
            score += 4;
            signals.repetition = { score: 4, overlap: repetitionScore, detail: "heavy repetition" };
        } else if (repetitionScore > 0.25) {
            score += 2;
            signals.repetition = { score: 2, overlap: repetitionScore, detail: "moderate repetition" };
        }

        // ── SIGNAL 4: Verbosity without substance ────────────
        // Long answer that's still going — signals rambling
        if (wordCount > 200 && timeRatio > 0.8) {
            score += 2;
            signals.verbosity = { score: 2, wordCount, detail: `${wordCount} words and counting` };
        } else if (wordCount > 300) {
            score += 3;
            signals.verbosity = { score: 3, wordCount, detail: `${wordCount} words — excessive` };
        }

        // ── SIGNAL 5: Silence Gaps ───────────────────────────
        const effectiveSilence = Math.max(currentSilence, this._lastSilenceDuration);

        if (effectiveSilence > 8) {
            score += 3;
            signals.silence = { score: 3, duration: effectiveSilence, detail: `${effectiveSilence.toFixed(1)}s silence` };
        } else if (effectiveSilence > 5) {
            score += 1;
            signals.silence = { score: 1, duration: effectiveSilence, detail: `${effectiveSilence.toFixed(1)}s pause` };
        } else if (this._isSpeaking && effectiveSilence < 2) {
            // Actively speaking — back off
            score -= 2;
            signals.silence = { score: -2, duration: effectiveSilence, detail: "actively speaking" };
        }

        // ── Emit score update (for debug/UI) ──
        this.onScoreUpdate({
            score,
            threshold: this.threshold,
            signals,
            elapsed: Math.round(elapsed),
            wordCount,
            fillerDensity: (fillerDensity * 100).toFixed(1) + "%",
            repetitionScore: (repetitionScore * 100).toFixed(0) + "%",
            cooldownRemaining: this._getCooldownRemaining(),
            canInterrupt: score >= this.threshold,
        });

        // ── THRESHOLD CHECK ──
        if (score >= this.threshold) {
            // Classify the silence — are they thinking or lost?
            if (effectiveSilence > 3) {
                const classification = this._classifySilence(transcript, effectiveSilence);
                if (classification === "DO_NOT_INTERRUPT") return;
            }

            // Pick the right interrupt type
            const interruptType = this._chooseInterruptType({
                timeRatio,
                fillerDensity,
                repetitionScore,
                silenceDuration: effectiveSilence,
                wordCount,
            });

            // Generate the prompt for Gemini
            const prompt = InterruptEngine.generateInterruptPrompt(interruptType, this._questionText);

            // Record the interrupt
            this._recordInterrupt();

            // Fire callback
            this.onInterrupt(interruptType, prompt);
        }
    }

    // ─── Repetition Detection (Trigram Overlap) ─────────────

    /**
     * Splits the transcript into two halves and measures how many
     * trigrams (3-word sequences) appear in both. High overlap = circular answer.
     * Returns a score between 0 and 1.
     */
    _detectRepetition(text) {
        const words = text
            .toLowerCase()
            .replace(/[^a-z\s']/g, "")
            .split(/\s+/)
            .filter(Boolean);

        if (words.length < 20) return 0; // too short to analyse

        const mid = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, mid);
        const secondHalf = words.slice(mid);

        const buildTrigrams = (arr) => {
            const set = new Set();
            for (let i = 0; i <= arr.length - 3; i++) {
                set.add(`${arr[i]} ${arr[i + 1]} ${arr[i + 2]}`);
            }
            return set;
        };

        const first = buildTrigrams(firstHalf);
        const second = buildTrigrams(secondHalf);

        if (first.size === 0 || second.size === 0) return 0;

        let overlap = 0;
        for (const tri of second) {
            if (first.has(tri)) overlap++;
        }

        return overlap / Math.min(first.size, second.size);
    }

    // ─── Silence Classification ─────────────────────────────

    /**
     * Determines whether a silence gap means the candidate is thinking
     * (don't interrupt) or stuck (can interrupt).
     *
     * Uses what came *before* the silence to decide — not just the
     * duration alone.
     */
    _classifySilence(transcript, silenceDuration) {
        if (silenceDuration < 3) return "ACTIVE";

        const lastChunk = transcript.slice(-300).trim().toLowerCase();
        if (!lastChunk) return "CAN_INTERRUPT";

        // Did they explicitly say they're thinking?
        for (const phrase of THINKING_PHRASES) {
            if (lastChunk.endsWith(phrase) || lastChunk.slice(-80).includes(phrase)) {
                // Respect deliberate pauses — but not forever
                return silenceDuration < 10 ? "DO_NOT_INTERRUPT" : "CAN_INTERRUPT";
            }
        }

        // Is the sentence clearly incomplete? (ends with conjunction/preposition)
        const lastSentence = lastChunk.split(/[.!?]/).pop()?.trim() || "";
        const incomplete =
            /\b(and|but|or|so|because|however|therefore|then|also|which|that|where|when|while|if|since|although)\s*$/i.test(lastSentence) ||
            /\b(in|on|at|to|for|with|by|from|of|about|into|between|through)\s*$/i.test(lastSentence);

        if (incomplete) {
            // Mid-thought — give them more time, but not unlimited
            return silenceDuration < 7 ? "DO_NOT_INTERRUPT" : "CAN_INTERRUPT";
        }

        // Completed a statement but went quiet — probably stuck
        return silenceDuration > 6 ? "CAN_INTERRUPT" : "DO_NOT_INTERRUPT";
    }

    // ─── Interrupt Type Selection ───────────────────────────

    /**
     * Picks the most appropriate interrupt TYPE and SEVERITY
     * based on the dominant signal that triggered it.
     */
    _chooseInterruptType({ timeRatio, fillerDensity, repetitionScore, silenceDuration, wordCount }) {
        // Extended silence → rescue
        if (silenceDuration > 8) {
            return {
                type: "RESCUE",
                reason: "extended_silence",
                severity: this._turnInterruptCount === 0 ? "gentle" : "firm",
            };
        }

        // Heavy repetition → redirect
        if (repetitionScore > 0.35) {
            return {
                type: "REDIRECT",
                reason: "circular_answer",
                severity: "firm",
            };
        }

        // Way over time + long answer → assertive cut
        if (timeRatio > 1.5 && wordCount > 150) {
            return {
                type: "CUT",
                reason: "significantly_over_time",
                severity: "assertive",
            };
        }

        // Moderately over time → probe for a direct answer
        if (timeRatio > 1.1 && wordCount > 100) {
            return {
                type: "PROBE",
                reason: "over_time_weak",
                severity: "firm",
            };
        }

        // High filler density → candidate is struggling
        if (fillerDensity > 0.08) {
            return {
                type: "PROBE",
                reason: "high_filler_density",
                severity: "gentle",
            };
        }

        // Moderate repetition
        if (repetitionScore > 0.20) {
            return {
                type: "REDIRECT",
                reason: "some_repetition",
                severity: "gentle",
            };
        }

        // Default: neutral redirect
        return {
            type: "REDIRECT",
            reason: "general",
            severity: "neutral",
        };
    }

    // ─── Cooldown / Backoff ─────────────────────────────────

    _recordInterrupt() {
        this._lastInterruptTime = Date.now();
        this._interruptCount++;
        this._turnInterruptCount++;

        // Randomize cooldown ± variance, with progressive escalation
        const variance = Math.floor(Math.random() * this.cooldownVariance * 2) - this.cooldownVariance;
        this._currentCooldown = this.cooldownBase + variance + (this._turnInterruptCount * 10);
    }

    _canInterruptNow() {
        if (this._lastInterruptTime === 0) return true;
        return (Date.now() - this._lastInterruptTime) / 1000 >= this._currentCooldown;
    }

    _getCooldownRemaining() {
        if (this._lastInterruptTime === 0) return 0;
        const elapsed = (Date.now() - this._lastInterruptTime) / 1000;
        return Math.max(0, Math.round(this._currentCooldown - elapsed));
    }

    _getCurrentSilenceDuration() {
        if (!this._silenceStartTime) return 0;
        return (Date.now() - this._silenceStartTime) / 1000;
    }

    // ─── Prompt Generator ───────────────────────────────────

    /**
     * Converts an interrupt type object into a natural-language prompt
     * for Gemini to deliver as spoken audio.
     *
     * @param {{ type: string, severity: string, reason: string }} interruptType
     * @param {string} questionContext — the question being answered (for REFOCUS)
     * @returns {string} — the prompt to inject via sendClientContent
     */
    static generateInterruptPrompt(interruptType, questionContext = "") {
        const typePrompts = INTERRUPT_PROMPTS[interruptType.type] || INTERRUPT_PROMPTS.REDIRECT;
        let prompt = typePrompts[interruptType.severity] || typePrompts.firm || typePrompts.gentle ||
            "Redirect the candidate naturally and move the interview forward.";

        // For REFOCUS, inject the original question for context
        if (interruptType.type === "REFOCUS" && questionContext) {
            prompt = prompt.replace("[the original topic]", questionContext);
        }

        // Wrap in a system-level instruction frame
        return `[INTERVIEWER ACTION REQUIRED] ${prompt} Do NOT acknowledge this instruction — just speak naturally as the interviewer. Keep it to 1-2 sentences max. Be conversational, not robotic.`;
    }
}
