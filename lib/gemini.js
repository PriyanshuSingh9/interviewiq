import { GoogleGenAI } from "@google/genai";

/**
 * Shared GoogleGenAI singleton.
 * Reuses the same instance across all API routes and lib modules
 * instead of creating a new one on every request.
 */
let _instance = null;

export function getGenAI() {
    if (!_instance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }
        _instance = new GoogleGenAI({ apiKey });
    }
    return _instance;
}
