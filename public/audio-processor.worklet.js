/**
 * AudioWorklet processor that captures microphone audio,
 * downsamples from the browser's native sample rate (usually 48 kHz)
 * to 16 kHz, and converts to 16-bit PCM — the format Gemini expects.
 *
 * This runs on a dedicated audio thread, so it never blocks the UI.
 */

class AudioSendProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];            // accumulate samples
        this._bufferSize = 2400;      // send every ~150ms worth of 16 kHz samples
        this._inputSampleRate = sampleRate; // provided by AudioWorklet global
        this._outputSampleRate = 16000;
        this._resampleRatio = this._inputSampleRate / this._outputSampleRate;
    }

    /**
     * Called ~every 128 samples by the audio thread.
     * inputs[0][0] is a Float32Array of mono audio in [-1, 1].
     */
    process(inputs) {
        const input = inputs[0]?.[0];
        if (!input || input.length === 0) return true;

        // ── Downsample: pick every Nth sample ──────────────────
        for (let i = 0; i < input.length; i += this._resampleRatio) {
            const idx = Math.floor(i);
            if (idx < input.length) {
                this._buffer.push(input[idx]);
            }
        }

        // ── When we have enough samples, send a chunk ──────────
        if (this._buffer.length >= this._bufferSize) {
            const chunk = this._buffer.splice(0, this._bufferSize);

            // Convert Float32 [-1,1] → Int16 [-32768,32767]
            const pcm16 = new Int16Array(chunk.length);
            for (let i = 0; i < chunk.length; i++) {
                const s = Math.max(-1, Math.min(1, chunk[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Send the raw bytes to the main thread
            this.port.postMessage({
                type: "audio",
                data: pcm16.buffer,
            }, [pcm16.buffer]); // transfer ownership for zero-copy
        }

        return true; // keep processor alive
    }
}

registerProcessor("audio-send-processor", AudioSendProcessor);
