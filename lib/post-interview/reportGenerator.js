import { getGenAI } from "@/lib/gemini";

export async function generatePostInterviewReport({ transcript, preInterviewReport, targetRole }) {
    const ai = getGenAI();
    const prompt = buildPrompt({ transcript, preInterviewReport, targetRole });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.3,
        },
    });

    try {
        return JSON.parse(response.text);
    } catch (err) {
        return {
            error: "Failed to parse structured report",
            rawResponse: response.text,
        };
    }
}

function buildPrompt({ transcript, preInterviewReport, targetRole }) {
    const candidateName = preInterviewReport?.candidateSummary?.name || "Candidate";
    const fitScore = preInterviewReport?.fitAnalysis?.fitScore ?? "N/A";
    const redFlags = preInterviewReport?.fitAnalysis?.redFlags?.join(", ") || "none";
    const role = targetRole || preInterviewReport?.levelCalibration?.appliedLevel || "Software Engineer";

    const formattedTranscript = (transcript || [])
        .map((entry, index) => {
            const roleLabel = entry.role === "ai" ? "INTERVIEWER" : "CANDIDATE";
            const text = entry.text || "";
            return `Turn ${index + 1} | ${roleLabel}: ${text}`;
        })
        .join("\n");

    return `You are generating a structured post-interview performance report.
Return ONLY JSON that exactly matches this schema:

{
  "overallScore": 0-100,
  "overallGrade": "A|B|C|D|F",
  "executiveSummary": "string",
  "dimensions": {
    "technicalDepth": { "score": 1-10, "assessment": "string" },
    "communicationClarity": { "score": 1-10, "assessment": "string" },
    "problemSolvingApproach": { "score": 1-10, "assessment": "string" },
    "projectOwnership": { "score": 1-10, "assessment": "string" },
    "pressureHandling": { "score": 1-10, "assessment": "string" }
  },
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "hiringRecommendation": "strong_yes|yes|maybe|no"
}

CANDIDATE: ${candidateName}
TARGET ROLE: ${role}
PRE-INTERVIEW FIT SCORE: ${fitScore}
PRE-INTERVIEW RED FLAGS: ${redFlags}

FULL TRANSCRIPT:
${formattedTranscript}`;
}
