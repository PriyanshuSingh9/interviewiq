import { GoogleGenAI } from "@google/genai";

export async function POST(req) {
    try {
        const { text } = await req.json();

        if (!text || text.trim().length === 0) {
            return Response.json({ text: "" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Using 2.5 Flash Lite as requested for fast, lightweight processing
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: `You are a transcription formatting and translation assistant.
Your task:
1. If the text is in any language other than English, translate it to English.
2. Fix any spelling, punctuation, grammar, or speech recognition errors.
3. Keep the exact meaning and tone of the original speech.
4. Do NOT add conversational filler, do NOT respond to the text, and do NOT add markdown.
5. Just output the final, corrected English text.

Raw spoken text:
            
Raw text:
${text}`,
            config: {
                temperature: 0.1, // Low temp for formatting-only
            }
        });

        return Response.json({ text: response.text });
    } catch (err) {
        console.error("Transcription processing failed:", err);
        // Fallback to original text if the API fails
        return Response.json({ error: "Failed to process", text: req.body?.text || "" }, { status: 500 });
    }
}
