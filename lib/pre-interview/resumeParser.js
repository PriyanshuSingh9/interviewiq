import { extractText } from "unpdf";

/**
 * Parses a PDF buffer, extracts the text,
 * and attempts to find a GitHub URL within the text.
 *
 * @param {Buffer} dataBuffer - The PDF file buffer
 * @returns {Promise<{text: string, githubUrl: string | null}>}
 */
export async function parseResume(dataBuffer) {
    try {
        // extractText returns { text: string[], totalPages }
        const { text: pages } = await extractText(new Uint8Array(dataBuffer));
        const rawText = pages.join("\n");

        // Regex to find a GitHub profile or repo URL
        const githubRegex = /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:(?:\/[a-zA-Z0-9_-]+)*)/i;
        const match = rawText.match(githubRegex);
        const githubUrl = match ? match[0] : null;

        return {
            text: rawText,
            githubUrl: githubUrl,
        };
    } catch (error) {
        console.error("Error parsing PDF resume:", error);
        throw new Error("Failed to parse resume PDF");
    }
}
