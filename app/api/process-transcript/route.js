import { getGenAI } from "@/lib/gemini";

export async function POST(req) {
    try {
        const { text } = await req.json();

        if (!text || text.trim().length === 0) {
            return Response.json({ text: "" });
        }

        const ai = getGenAI();

        // Using 2.5 Flash Lite as requested for fast, lightweight processing
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: `You are a strict transcription formatting and translation assistant.
Your task:
1. YOU MUST OUTPUT ONLY ENGLISH. If the input is in Hindi or any other language, TRANSLATE IT TO ENGLISH.
2. Fix any spelling, punctuation, grammar, or speech recognition errors.
3. Do NOT truncate or summarize. Output the FULL translated text.
4. Do NOT add conversational filler, do NOT respond to the text, and do NOT add markdown.
5. The output must be the literal translation in English, and nothing else.

Raw spoken text:
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
