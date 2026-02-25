import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

/**
 * Parses a PDF buffer, extracts the text (truncated to 4000 chars),
 * and attempts to find a GitHub URL within the text.
 * 
 * @param {Buffer} dataBuffer - The PDF file buffer
 * @returns {Promise<{text: string, githubUrl: string | null}>}
 */
export async function parseResume(dataBuffer) {
    try {
        const parser = new PDFParse({ data: dataBuffer });
        const data = await parser.getText();

        // Truncate text to ~4000 characters to save LLM tokens
        const rawText = data.text || '';
        // const truncatedText = rawText.substring(0, 4000);

        // Regex to find a GitHub profile or repo URL
        const githubRegex = /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:(?:\/[a-zA-Z0-9_-]+)*)/i;
        const match = rawText.match(githubRegex);
        const githubUrl = match ? match[0] : null;

        return {
            text: rawText,
            githubUrl: githubUrl
        };
    } catch (error) {
        console.error("Error parsing PDF resume:", error);
        throw new Error("Failed to parse resume PDF");
    }
}
