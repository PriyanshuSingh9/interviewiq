/**
 * gemini-live.js
 *
 * Client-side module that manages the full Gemini Live API session:
 *   1. Fetches an ephemeral token from our server
 *   2. Opens a WebSocket connection to Gemini via the SDK
 *   3. Captures mic audio via AudioWorklet, sends it as PCM chunks
 *   4. Receives AI audio, plays it via Web Audio API (gapless)
 *   5. Provides candidate transcript via Web Speech API
 *   6. Emits transcript updates and speaking-state changes via callbacks
 */

import { GoogleGenAI, Modality } from "@google/genai";

// ─── Constants ───────────────────────────────────────────
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const DEFAULT_SYSTEM_INSTRUCTION = `You are a professional AI interviewer built by InterviewIQ — an agentic AI interview platform. Your sole purpose is to conduct a rigorous, realistic mock technical interview. Stay strictly in character at all times.

- YOU SPEAK FIRST. Greet the candidate and ask for their name.
- Ask one question at a time. Wait for them to answer before moving on.
- Cover: fundamentals, frameworks, system design basics, and behavioral questions.
- Give brief, genuine feedback after each answer.
- Adapt difficulty dynamically — increase if they're doing well, decrease slightly if they struggle, but never make it too easy.
- If stuck, offer ONE small hint, then move on.
- After 5-6 questions, wrap up politely and thank the candidate.
- You are speaking out loud. Keep sentences short and natural.
- NEVER break character. You are an interviewer, not a tutor or assistant.`;

// ─── Main Class ──────────────────────────────────────────

export class GeminiLiveSession {
    /**
     * @param {Object} opts
     * @param {MediaStream} opts.stream             – getUserMedia stream (for mic)
     * @param {string}      opts.systemInstruction   – system prompt for the AI (from pre-interview pipeline)
     * @param {Function}    opts.onTranscript        – (role: "ai"|"candidate", text: string) => void
     * @param {Function}    opts.onAiSpeaking        – (isSpeaking: boolean) => void
     * @param {Function}    opts.onStatusChange      – (status: string) => void
     * @param {Function}    opts.onError             – (error: Error) => void
     * @param {Function}    opts.onCandidateChunk    – (text: string) => void  (real-time incremental transcript for interrupt engine)
     * @param {Function}    opts.onEndCall           – () => void (triggered when AI decides to end the interview)
     */
    constructor({ stream, systemInstruction, onTranscript, onAiSpeaking, onStatusChange, onError, onCandidateChunk, onEndCall }) {
        this.stream = stream;
        this.systemInstruction = systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
        this.onTranscript = onTranscript || (() => { });
        this.onAiSpeaking = onAiSpeaking || (() => { });
        this.onStatusChange = onStatusChange || (() => { });
        this.onError = onError || console.error;
        this.onCandidateChunk = onCandidateChunk || (() => { });
        this.onEndCall = onEndCall || (() => { });

        this._session = null;          // Gemini live session
        this._audioCtx = null;         // AudioContext for playback
        this._workletNode = null;      // AudioWorkletNode for mic capture
        this._nextPlayTime = 0;        // scheduled time for next audio chunk
        this._lastSource = null;       // last scheduled AudioBufferSourceNode
        this._aiSpeakingTimeout = null;
        this._recognition = null;      // Web Speech API SpeechRecognition
        this._closed = false;
        this._interruptInProgress = false; // true while executing an interrupt
    }

    // ─── Public API ──────────────────────────────────────

    async connect() {
        try {
            this.onStatusChange("connecting");

            // Step 1: Get ephemeral token from our server
            const res = await fetch("/api/gemini-token", { method: "POST" });
            if (!res.ok) throw new Error("Failed to get token");
            const { token } = await res.json();

            // Step 2: Connect to Gemini Live API
            const ai = new GoogleGenAI({
                apiKey: token,
                httpOptions: { apiVersion: "v1alpha" },
            });

            const END_INTERVIEW_TOOL = {
                functionDeclarations: [
                    {
                        name: "endInterview",
                        description: "Ends the interview immediately. Call this strictly AFTER the 1 coding question has been evaluated and you have fully wrapped up with the candidate.",
                    },
                ]
            };

            this._session = await ai.live.connect({
                model: MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: { parts: [{ text: this.systemInstruction }] },
                    tools: [END_INTERVIEW_TOOL],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log("[Gemini] Connected");
                        this.onStatusChange("connected");
                    },
                    onmessage: (msg) => this._handleMessage(msg),
                    onerror: (e) => {
                        console.error("[Gemini] Error:", e);
                        this.onError(e);
                    },
                    onclose: (e) => {
                        console.log("[Gemini] Closed:", e?.reason || "unknown");
                        this.onStatusChange("disconnected");
                    },
                },
            });

            // Step 3: Set up mic audio capture + sending pipeline
            await this._setupAudioCapture();

            // Step 4: Set up playback AudioContext
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: OUTPUT_SAMPLE_RATE,
            });
            this._nextPlayTime = 0;

            this.onStatusChange("live");

            // Step 5: Trigger AI to speak first
            // The native audio model waits for input before responding.
            // Send an initial text message to make the interviewer greet the candidate.
            this._session.sendClientContent({
                turns: "The interview session has just started. Begin the interview now — greet the candidate and start with your first question, following your system instructions.",
                turnComplete: true,
            });
        } catch (err) {
            console.error("[Gemini] Connection failed:", err);
            this.onError(err);
            this.onStatusChange("error");
        }
    }

    disconnect() {
        this._closed = true;
        this._interruptInProgress = false;
        if (this._workletNode) {
            this._workletNode.disconnect();
            this._workletNode = null;
        }
        if (this._session) {
            try { this._session.close(); } catch (_) { }
            this._session = null;
        }
        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
        }
        if (this._aiSpeakingTimeout) {
            clearTimeout(this._aiSpeakingTimeout);
        }
        this._nextPlayTime = 0;
        this._lastSource = null;
        this._interceptNextTurnPrompt = null;
        this._ignoreCurrentTurn = false;
        this.onAiSpeaking(false);
        this.onStatusChange("disconnected");
    }

    // ─── Interrupt Mechanism ─────────────────────────────────

    /**
     * Pre-emptively arm an intercept for the very next time the AI tries to speak.
     * When the AI attempts to start its response, we drop the audio/text and
     * immediately inject this prompt, seamlessly redirecting its train of thought.
     */
    interceptNextTurn(prompt) {
        this._interceptNextTurnPrompt = prompt;
        console.log("[GeminiLive] 🕵️ Armed silent intercept for next turn.");
    }

    /**
     * Trigger an AI interrupt of the candidate's answer.
     *
     * Flow:
     *   1. Mute the mic audio track so candidate's speech stops reaching Gemini
     *   2. Short delay for the auto-VAD to register silence / end-of-speech
     *   3. Inject the interrupt prompt via sendClientContent (turnComplete=true)
     *   4. Gemini generates an audio response — the interrupt
     *   5. When AI finishes speaking → unmute the mic automatically
     *
     * @param {string} prompt — the interrupt instruction for Gemini
     */
    triggerInterrupt(prompt) {
        if (this._closed || !this._session || this._interruptInProgress) return;

        console.log("[Gemini] 🔴 Interrupt triggered");
        this._interruptInProgress = true;

        // Step 1: Mute the mic track so Gemini hears silence
        if (this.stream) {
            this.stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }

        // Step 2: Small delay for VAD to detect the silence, then inject prompt
        setTimeout(() => {
            if (this._closed || !this._session) return;

            // Step 3: Send the interrupt instruction — turnComplete=true forces a response
            this._session.sendClientContent({
                turns: prompt,
                turnComplete: true,
            });

            console.log("[Gemini] 🔴 Interrupt prompt injected, waiting for AI response...");
        }, 250); // 250ms is enough for VAD to register silence
    }

    /**
     * Called internally when the AI finishes speaking after an interrupt.
     * Restores the mic so the candidate can respond to the interrupt.
     */
    _completeInterrupt() {
        if (!this._interruptInProgress) return;

        console.log("[Gemini] ✅ Interrupt complete, unmuting mic");
        this._interruptInProgress = false;

        // Unmute the mic track
        if (this.stream) {
            this.stream.getAudioTracks().forEach((t) => (t.enabled = true));
        }
    }

    // ─── Context Injection (no mic mute) ────────────────────

    /**
     * Inject a context message into the Gemini session without muting the mic.
     * Used for:
     *   - Coding timer check-in prompts
     *   - Code evaluation result injection
     *   - Any system message where the candidate isn't actively speaking
     *
     * @param {string} prompt — the message to inject
     * @param {boolean} turnComplete — whether to force a Gemini response (default true)
     */
    sendContextMessage(prompt, turnComplete = true) {
        if (this._closed || !this._session) return;

        console.log("[Gemini] 📨 Context message injected");
        this._session.sendClientContent({
            turns: prompt,
            turnComplete,
        });
    }

    // ─── Mic Audio Capture ───────────────────────────────

    async _setupAudioCapture() {
        // Create a separate AudioContext for mic capture at native rate
        const micCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Load the AudioWorklet processor
        await micCtx.audioWorklet.addModule("/audio-processor.worklet.js");

        // Create source from mic stream
        const source = micCtx.createMediaStreamSource(this.stream);

        // Create the worklet node
        this._workletNode = new AudioWorkletNode(micCtx, "audio-send-processor");

        // When the worklet sends a PCM chunk, forward it to Gemini
        this._workletNode.port.onmessage = (event) => {
            if (event.data.type === "audio" && this._session && !this._closed) {
                const pcmBuffer = event.data.data;
                const base64 = this._arrayBufferToBase64(pcmBuffer);

                this._session.sendRealtimeInput({
                    audio: {
                        data: base64,
                        mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                    },
                });
            }
        };

        // Connect: mic → worklet (no output to speakers — that would cause echo)
        source.connect(this._workletNode);

        // Store for cleanup
        this._micCtx = micCtx;
    }

    // ─── Handle Incoming Messages ────────────────────────

    _handleMessage(msg) {
        if (this._closed) return;

        // 1. Interrupted — stop playing AI audio
        if (msg.serverContent?.interrupted) {
            this._flushPlayback();
            this.onAiSpeaking(false);

            // If AI was speaking and got interrupted, flush its partial text
            if (this._aiTextBuffer?.trim()) {
                this.onTranscript("ai", this._aiTextBuffer.trim());
            }
            this._aiTextBuffer = "";
            // Do NOT clear _candidateBuffer here. The user is interrupting, 
            // so their speech is currently in _candidateBuffer and should be processed!
            return;
        }

        // Helper to translate and flush candidate text
        const flushCandidate = () => {
            const candidateText = (this._candidateBuffer || "").trim();
            this._candidateBuffer = "";
            if (!candidateText) return;

            fetch("/api/process-transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: candidateText }),
            })
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    this.onTranscript("candidate", data?.text || candidateText);
                })
                .catch(() => {
                    this.onTranscript("candidate", candidateText);
                });
        };

        // 2. AI audio chunks & function calls
        if (msg.serverContent?.modelTurn?.parts) {

            // ─── Pre-emptive Intercept Logic ───
            if (this._interceptNextTurnPrompt) {
                const prompt = this._interceptNextTurnPrompt;
                this._interceptNextTurnPrompt = null;

                console.log("[GeminiLive] 🛑 Pre-emptive Intercept triggered automatically! Aborting incoming turn & silently redirecting.");

                // Suspend audio just in case it was about to play
                if (this._audioCtx) {
                    this._audioCtx.suspend();
                }
                this._nextPlayTime = 0;
                this._aiTextBuffer = "";

                // We are dropping this entire generated turn from the model.
                this._ignoreCurrentTurn = true;

                // Send the injection immediately to force Gemini to generate a NEW response
                this._session.sendClientContent({
                    turns: prompt,
                    turnComplete: true
                });

                // Resume audio instantly so the NEW response from Gemini can play seamlessly
                if (this._audioCtx) {
                    this._audioCtx.resume();
                }
            }

            if (!this._ignoreCurrentTurn) {
                // If AI is starting to respond normally and we have buffered candidate text, flush it now!
                if (this._candidateBuffer?.trim()) {
                    flushCandidate();
                }

                for (const part of msg.serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        this._scheduleAudio(part.inlineData.data);
                    }
                    // Buffer AI text — wait to flush until AI finishes or is interrupted
                    if (part.text && !part.thought) {
                        this._aiTextBuffer = (this._aiTextBuffer || "") + part.text;
                    }
                    // Handle Function Calls (Tool use)
                    if (part.functionCall) {
                        const call = part.functionCall;
                        if (call.name === "endInterview") {
                            console.log("[Gemini] AI called endInterview tool");
                            this.onEndCall();
                            // Acknowledge the function call
                            this._session.sendToolResponse({
                                functionResponses: [
                                    {
                                        id: call.id,
                                        name: call.name,
                                        response: { success: true }
                                    }
                                ]
                            });
                        }
                    }
                }
            }
        }

        // 3. On turnComplete / generationComplete
        const isTurnComplete =
            msg.serverContent?.turnComplete ||
            msg.serverContent?.generationComplete;

        if (this._ignoreCurrentTurn) {
            if (isTurnComplete) {
                console.log("[GeminiLive] 🛑 Ignored turn finished generating. Resuming normal operation.");
                this._ignoreCurrentTurn = false;
            }
            return; // DROP EVERYTHING (do not buffer AI text, do not buffer candidate audio)
        }

        // 4. Buffer candidate (user) transcription
        const candidateChunk =
            msg.inputTranscription?.text ||
            msg.serverContent?.inputTranscription?.text ||
            "";
        if (candidateChunk.trim()) {
            // Note: inputTranscription chunk from Live API is actually incremental? 
            // In many Live API implementations, inputTranscription.text IS incremental.
            this._candidateBuffer = (this._candidateBuffer || "") + candidateChunk;
            this.onCandidateChunk(candidateChunk);
        }

        // 5. AI output transcription — also buffer (keep in sync with AI text delay)
        const aiTranscriptChunk =
            msg.outputTranscription?.text ||
            msg.serverContent?.outputTranscription?.text ||
            "";
        if (aiTranscriptChunk.trim()) {
            this._aiTextBuffer = (this._aiTextBuffer || "") + aiTranscriptChunk;
        }

        if (isTurnComplete) {
            // Flush any remaining candidate text
            if (this._candidateBuffer?.trim()) {
                flushCandidate();
            }

            // Flush the full AI text for this turn
            const aiText = (this._aiTextBuffer || "").trim();
            this._aiTextBuffer = "";
            if (aiText) {
                this.onTranscript("ai", aiText);
            }
        }
    }

    // ─── Gapless Audio Playback (Time-Based Scheduling) ──

    /**
     * Schedule a chunk of audio on the Web Audio API timeline.
     * Pre-schedules chunks so they play back-to-back with zero gaps.
     */
    _scheduleAudio(base64Data) {
        if (!this._audioCtx) return;

        // Decode base64 → Int16 → Float32
        const raw = atob(base64Data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
        }

        // Create an AudioBuffer and fill it
        const buffer = this._audioCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
        buffer.copyToChannel(float32, 0);

        // Determine when this chunk should start playing
        const now = this._audioCtx.currentTime;
        if (this._nextPlayTime < now) {
            this._nextPlayTime = now + 0.02;
        }

        // Create the source and schedule it
        const source = this._audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this._audioCtx.destination);
        source.start(this._nextPlayTime);

        // Advance the timeline for the next chunk
        this._nextPlayTime += buffer.duration;

        // Track the last source so we know when AI stops speaking
        this._lastSource = source;
        this.onAiSpeaking(true);

        // Reset the "stopped speaking" timer
        if (this._aiSpeakingTimeout) clearTimeout(this._aiSpeakingTimeout);

        source.onended = () => {
            if (this._lastSource === source) {
                this._aiSpeakingTimeout = setTimeout(() => {
                    this.onAiSpeaking(false);
                    // If this was an interrupt response, unmute the mic now
                    if (this._interruptInProgress) {
                        this._completeInterrupt();
                    }
                }, 300);
            }
        };
    }

    /**
     * Flush all scheduled audio (barge-in).
     */
    _flushPlayback() {
        if (!this._audioCtx) return;
        const sampleRate = this._audioCtx.sampleRate;
        this._audioCtx.close();
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: sampleRate,
        });
        this._nextPlayTime = 0;
        this._lastSource = null;
    }

    // ─── Utilities ───────────────────────────────────────

    _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}
