import { GoogleGenAI } from "@google/genai";

/**
 * Generates a structured pre-interview report by analyzing candidate materials
 * against the job requirements using Gemini.
 *
 * @param {object} params
 * @param {string} params.resumeText       - Full extracted resume text
 * @param {object} params.githubAnalysis   - Output from analyzeGithubProfile()
 * @param {string} params.jobDescription   - Raw JD text
 * @param {string} params.targetRole       - Selected role (e.g. "Senior Backend Engineer")
 * @returns {Promise<object>} - Structured pre-interview report JSON
 */
export async function generatePreInterviewReport({
    resumeText,
    githubAnalysis,
    jobDescription,
    targetRole,
}) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = buildAnalysisPrompt({ resumeText, githubAnalysis, jobDescription, targetRole });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.3,
        },
    });

    try {
        // The SDK returns the text, parse it as JSON
        const report = JSON.parse(response.text);
        return report;
    } catch (err) {
        console.error("Failed to parse Gemini report response:", err);
        // Return raw text wrapped in a fallback structure
        return {
            error: "Failed to parse structured report",
            rawResponse: response.text,
        };
    }
}

function buildAnalysisPrompt({ resumeText, githubAnalysis, jobDescription, targetRole }) {
    // Format GitHub analysis into readable text
    const githubSection = formatGithubForPrompt(githubAnalysis);

    return `You are an expert technical interview preparation analyst. 

Analyze the following candidate materials against the target role and job description. Produce a structured pre-interview report as JSON.

═══ CANDIDATE RESUME ═══
${resumeText}

═══ GITHUB ANALYSIS ═══
${githubSection}

═══ JOB DESCRIPTION ═══
${jobDescription}

═══ TARGET ROLE ═══
${targetRole}

═══ OUTPUT FORMAT ═══
Return a JSON object with this exact structure:

{
  "candidateSummary": {
    "name": "extracted from resume",
    "currentRole": "their current/most recent title",
    "yearsExperience": "estimated from resume",
    "topSkills": ["skill1", "skill2", "skill3"],
    "educationHighlight": "degree, field, institution"
  },

  "fitAnalysis": {
    "fitScore": 0-100,
    "fitReasoning": "2-3 sentence explanation of the score",
    "matchedSkills": ["skills they have that the JD asks for"],
    "missingSkills": ["skills the JD requires but candidate lacks evidence of"],
    "redFlags": ["skills claimed on resume but no GitHub evidence", "other concerns"]
  },

  "githubAssessment": {
    "overallComplexity": "tutorial-level | real-tool | production-grade",
    "repos": [
      {
        "name": "repo name",
        "architecturalObservations": "what the structure and deps reveal",
        "complexityRating": "tutorial-level | real-tool | production-grade",
        "specificQuestions": [
          "2-3 very specific questions about architectural decisions in this repo"
        ]
      }
    ],
    "hasTests": true/false,
    "hasInfraTooling": true/false,
    "infrastructureSignals": ["docker", "ci/cd", etc]
  },

  "interviewPlan": {
    "totalDurationMinutes": 30,
    "rounds": [
      {
        "name": "round name",
        "focus": "what to assess",
        "durationMinutes": 10,
        "suggestedQuestions": ["specific, personalized questions"]
      }
    ],
    "weakestAreaToProbe": "the single weakest area based on evidence",
    "suggestedOpeningQuestion": "a personalized, warm opening question",
    "redFlagsToWatch": ["things to pay attention to during the interview"]
  },

  "levelCalibration": {
    "appliedLevel": "${targetRole}",
    "evidenceLevel": "junior | mid | senior | staff",
    "calibrationNotes": "explanation of any gap between applied and evidence level"
  }
}

IMPORTANT RULES:
- Ask SPECIFIC questions, not generic ones. Reference actual repos, tech choices, and resume claims.
  BAD: "Tell me about your projects"  
  GOOD: "Why did you use BullMQ over a database-backed queue in your notification service?"
- The fit score should be honest — don't inflate it.
- Red flags are not criticisms — they're areas to probe harder during interview.
- Interview rounds should be tailored to THIS candidate for THIS role, not generic.
- If GitHub data is limited, note that explicitly and shift focus to resume-based questions.`;
}

function formatGithubForPrompt(githubAnalysis) {
    if (!githubAnalysis || (!githubAnalysis.user && !githubAnalysis.repos)) {
        return "(No GitHub data available)";
    }

    let text = "";

    if (githubAnalysis.user) {
        const u = githubAnalysis.user;
        text += `Profile: ${u.login}${u.name ? ` (${u.name})` : ""}`;
        if (u.bio) text += ` — ${u.bio}`;
        text += `\nPublic repos: ${u.publicRepos || "unknown"}, Followers: ${u.followers || 0}\n\n`;
    }

    if (githubAnalysis.repos && githubAnalysis.repos.length > 0) {
        for (const repo of githubAnalysis.repos) {
            text += `── ${repo.name} ──\n`;
            text += `Description: ${repo.description || "N/A"}\n`;
            text += `Primary language: ${repo.primaryLanguage || "N/A"}\n`;
            text += `Stars: ${repo.stars} | Last pushed: ${repo.lastPushed}\n`;
            text += `Topics: ${repo.topics?.length ? repo.topics.join(", ") : "none"}\n`;

            if (repo.languageBreakdown) {
                text += `Language breakdown: ${Object.entries(repo.languageBreakdown).map(([l, p]) => `${l} ${p}`).join(", ")}\n`;
            }

            if (repo.rootTree) {
                text += `Root file tree:\n${repo.rootTree.join("\n")}\n`;
            }

            if (repo.readmeExcerpt) {
                text += `README (first 1500 chars):\n${repo.readmeExcerpt}\n`;
            }

            if (repo.dependencies) {
                text += `Dependencies (${repo.dependencies.file}):\n${repo.dependencies.content}\n`;
            }

            text += "\n";
        }
    }

    return text || "(No GitHub data available)";
}
