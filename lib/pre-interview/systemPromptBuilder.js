/**
 * systemPromptBuilder.js
 *
 * Converts a structured pre-interview report into a concise system
 * instruction for the Gemini Live interview session.
 *
 * Design: Give the model CONTEXT about the candidate, not prescriptive
 * questions. This lets it generate dynamic, non-repetitive questions
 * and keeps the prompt short for the real-time audio model.
 */

/**
 * Build the system prompt for the live interview AI.
 *
 * @param {object} report - The pre-interview report JSON from reportGenerator
 * @returns {string} - System instruction text for Gemini Live
 */
export function buildSystemPrompt(report) {
    if (!report || report.error) {
        return getFallbackPrompt();
    }

    const { candidateSummary, fitAnalysis, githubAssessment, levelCalibration } = report;

    const name = candidateSummary?.name || "the candidate";
    const role = levelCalibration?.appliedLevel || "Software Engineer";
    const evidenceLevel = levelCalibration?.evidenceLevel || "mid";
    const topSkills = candidateSummary?.topSkills?.join(", ") || "not specified";
    const fitScore = fitAnalysis?.fitScore ?? "N/A";
    const missingSkills = fitAnalysis?.missingSkills?.join(", ") || "none identified";
    const redFlags = fitAnalysis?.redFlags?.join("; ") || "none";
    const complexity = githubAssessment?.overallComplexity || "unknown";

    return `You are a professional, warm AI interviewer conducting a 30-minute mock technical interview.

CANDIDATE: ${name}
ROLE: ${role} (evidence suggests ${evidenceLevel} level)
TOP SKILLS: ${topSkills}
FIT SCORE: ${fitScore}/100
GAPS: ${missingSkills}
RED FLAGS: ${redFlags}
GITHUB COMPLEXITY: ${complexity}
${levelCalibration?.calibrationNotes ? `CALIBRATION: ${levelCalibration.calibrationNotes}` : ""}

RULES:
- Greet ${name} warmly, then begin the interview naturally.
- Ask ONE question at a time. Wait for their full answer.
- Generate your own questions dynamically based on the context above. Do NOT use a fixed script.
- Probe their gaps and red flags naturally — don't reveal internal notes.
- Give brief, genuine feedback after each answer.
- If they're vague, follow up with a specific probe. If stuck, offer a hint.
- Keep responses SHORT and CONVERSATIONAL — this is spoken, not written.
- Adapt difficulty to ${evidenceLevel} level.
- After ~25 minutes, wrap up: summarize strengths, thank them, say you'll share feedback.
- NEVER reveal scores, fit analysis, or red flags to the candidate.`;
}

/**
 * Fallback prompt when report generation fails
 */
function getFallbackPrompt() {
    return `You are a professional and friendly AI interviewer conducting a technical mock interview.

- Start by warmly greeting the candidate and asking for their name.
- Ask one question at a time. Wait for them to answer before moving on.
- Cover: fundamentals, frameworks, system design basics, and behavioral questions.
- Give brief, encouraging feedback after each answer.
- If stuck, offer a hint. Keep responses concise and conversational.
- After 5-6 questions, wrap up politely and thank the candidate.
- You are speaking out loud. Keep sentences short and natural.`;
}
