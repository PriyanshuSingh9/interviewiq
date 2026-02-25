import { GoogleGenAI } from "@google/genai";

export async function POST() {
    try {
        const client = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { apiVersion: "v1alpha" },
        });

        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const token = await client.authTokens.create({
            config: {
                uses: 1,
                expireTime: expireTime,
                liveConnectConstraints: {
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    config: {
                        responseModalities: ["AUDIO"],
                        // Enable transcription at the token level — the constrained
                        // endpoint only permits features whitelisted here.
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                    },
                },
            },
        });

        return Response.json({ token: token.name });
    } catch (err) {
        console.error("Failed to create ephemeral token:", err);
        return Response.json(
            { error: err.message || "Failed to create token" },
            { status: 500 }
        );
    }
}
