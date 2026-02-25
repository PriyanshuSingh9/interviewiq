/**
 * gemini-live.js
 *
 * Client-side module that manages the full Gemini Live API session:
 *   1. Fetches an ephemeral token from our server
 *   2. Opens a WebSocket connection to Gemini via the SDK
 *   3. Captures mic audio via AudioWorklet, sends it as PCM chunks
 *   4. Receives AI audio, plays it via Web Audio API
 *   5. Emits transcript updates and speaking-state changes via callbacks
 */

import { GoogleGenAI, Modality } from "@google/genai";

// ─── Constants ───────────────────────────────────────────
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const SYSTEM_INSTRUCTION = `You are a professional and friendly AI interviewer conducting a technical frontend developer interview. 

Your behavior:
- Start by warmly greeting the candidate and asking for their name.
- After they introduce themselves, proceed with the interview.
- Ask one question at a time. Wait for the candidate to answer before moving on.
- Cover topics like: HTML/CSS fundamentals, JavaScript concepts, React, state management, performance optimization, and basic system design.
- Give brief, encouraging feedback after each answer (e.g., "Great point!" or "That's a solid answer.").
- If the candidate seems stuck, offer a small hint.
- Keep your responses concise and conversational — this is a spoken interview, not an essay.
- After 5-6 questions, wrap up the interview politely and thank the candidate.

Important: You are speaking out loud to the candidate. Keep sentences short and natural-sounding. Avoid bullet points or markdown — just talk naturally like a real interviewer would.`;

// ─── Main Class ──────────────────────────────────────────

export class GeminiLiveSession {
    /**
     * @param {Object} opts
     * @param {MediaStream} opts.stream        – getUserMedia stream (for mic)
     * @param {Function}    opts.onTranscript   – (role: "ai"|"candidate", text: string) => void
     * @param {Function}    opts.onAiSpeaking   – (isSpeaking: boolean) => void
     * @param {Function}    opts.onStatusChange – (status: string) => void
     * @param {Function}    opts.onError        – (error: Error) => void
     */
    constructor({ stream, onTranscript, onAiSpeaking, onStatusChange, onError }) {
        this.stream = stream;
        this.onTranscript = onTranscript || (() => { });
        this.onAiSpeaking = onAiSpeaking || (() => { });
        this.onStatusChange = onStatusChange || (() => { });
        this.onError = onError || console.error;

        this._session = null;          // Gemini live session
        this._audioCtx = null;         // AudioContext for playback
        this._workletNode = null;      // AudioWorkletNode for mic capture
        this._nextPlayTime = 0;        // scheduled time for next audio chunk
        this._lastSource = null;       // last scheduled AudioBufferSourceNode
        this._aiSpeakingTimeout = null;
        this._closed = false;
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

            this._session = await ai.live.connect({
                model: MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: SYSTEM_INSTRUCTION,
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
        } catch (err) {
            console.error("[Gemini] Connection failed:", err);
            this.onError(err);
            this.onStatusChange("error");
        }
    }

    disconnect() {
        this._closed = true;
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
        this.onAiSpeaking(false);
        this.onStatusChange("disconnected");
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
            return;
        }

        // 2. AI audio chunks
        if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                    this._scheduleAudio(part.inlineData.data);
                }
            }
        }

        // 3. Input transcription (what the candidate said)
        //    NOTE: In the @google/genai SDK, transcriptions arrive as
        //    TOP-LEVEL fields on the message, NOT under serverContent.
        if (msg.inputTranscription?.text) {
            const text = msg.inputTranscription.text;
            if (text.trim()) {
                this.onTranscript("candidate", text);
            }
        }

        // 4. Output transcription (what the AI said)
        if (msg.outputTranscription?.text) {
            const text = msg.outputTranscription.text;
            if (text.trim()) {
                this.onTranscript("ai", text);
            }
        }
    }

    // ─── Gapless Audio Playback (Time-Based Scheduling) ──

    /**
     * Schedule a chunk of audio on the Web Audio API timeline.
     * Instead of waiting for each chunk to finish before starting the next,
     * we pre-schedule chunks so they play back-to-back with zero gaps.
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
        // If _nextPlayTime is in the past (or first chunk), start from now + tiny buffer
        if (this._nextPlayTime < now) {
            this._nextPlayTime = now + 0.02; // 20ms buffer to avoid underrun
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
            // Only mark as done speaking if THIS is still the last source
            if (this._lastSource === source) {
                this._aiSpeakingTimeout = setTimeout(() => {
                    this.onAiSpeaking(false);
                }, 300);
            }
        };
    }

    /**
     * Flush all scheduled audio (used when interrupted / barge-in).
     * Resets the timeline so the next audio starts fresh.
     */
    _flushPlayback() {
        if (!this._audioCtx) return;
        // Close and recreate the audio context to cancel all scheduled sources
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
