import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { codingSubmissions, questionBank } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient);

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

/**
 * POST /api/coding/evaluate
 * Evaluates a code submission via Piston (execution) + Gemini (quality feedback).
 * Body: { submissionId, code }
 */
export async function POST(req) {
    try {
        const { submissionId, code } = await req.json();

        if (!submissionId || !code) {
            return NextResponse.json({ error: 'submissionId and code are required' }, { status: 400 });
        }

        // 1. Get the submission and question
        const submissions = await db
            .select({
                submission: codingSubmissions,
                question: questionBank,
            })
            .from(codingSubmissions)
            .innerJoin(questionBank, eq(codingSubmissions.questionId, questionBank.id))
            .where(eq(codingSubmissions.id, submissionId))
            .limit(1);

        if (submissions.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const { question } = submissions[0];
        const testCases = Array.isArray(question.testCases) ? question.testCases : [];

        // 2. Run code against test cases via Piston API
        const testResults = [];
        let testsPassed = 0;

        for (const tc of testCases) {
            // Build the execution code: call the function with test input and log the result
            const fnName = extractFunctionName(question.starterCode);
            const execCode = `
${code}

// Test execution
const __input = ${tc.input};
const __result = ${fnName}(...__input);
console.log(JSON.stringify(__result));
`;
            try {
                const pistonRes = await fetch(PISTON_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: 'javascript',
                        version: '18.15.0',
                        files: [{ content: execCode }],
                        run_timeout: 5000,
                    }),
                });

                const pistonData = await pistonRes.json();
                const stdout = (pistonData.run?.stdout || '').trim();
                const stderr = pistonData.run?.stderr || '';
                const expected = tc.expectedOutput.trim();

                const passed = stdout === expected;
                if (passed) testsPassed++;

                testResults.push({
                    input: tc.input,
                    expected: tc.expectedOutput,
                    actual: stdout,
                    stderr: stderr || null,
                    passed,
                });
            } catch (err) {
                testResults.push({
                    input: tc.input,
                    expected: tc.expectedOutput,
                    actual: null,
                    stderr: err.message,
                    passed: false,
                });
            }
        }

        // 3. Get AI feedback from Gemini
        const aiFeedback = await getGeminiFeedback(question, code, testResults, testsPassed, testCases.length);

        // 4. Save results
        await db.update(codingSubmissions)
            .set({
                userCode: code,
                testResults,
                testsPassed,
                testsTotal: testCases.length,
                aiScore: aiFeedback.score,
                aiFeedback,
            })
            .where(eq(codingSubmissions.id, submissionId));

        return NextResponse.json({
            testResults,
            testsPassed,
            testsTotal: testCases.length,
            aiScore: aiFeedback.score,
            aiFeedback,
        });

    } catch (error) {
        console.error('Error evaluating submission:', error);
        return NextResponse.json({ error: 'Failed to evaluate submission' }, { status: 500 });
    }
}

/**
 * Extracts the function name from starter code.
 * e.g. "function twoSum(nums, target) {" → "twoSum"
 */
function extractFunctionName(starterCode) {
    const match = starterCode.match(/function\s+(\w+)/);
    return match ? match[1] : 'solution';
}

/**
 * Gets qualitative feedback from Gemini 2.5 Flash.
 */
async function getGeminiFeedback(question, userCode, testResults, testsPassed, testsTotal) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `You are a senior coding interview evaluator. Evaluate this code submission.

═══ PROBLEM ═══
Title: ${question.title}
Type: ${question.type} (${question.type === 'dsa' ? 'Data Structures & Algorithms' : 'Bug Fix / Debugging'})
Difficulty: ${question.difficulty}
Description: ${question.description}

═══ IDEAL SOLUTION (for reference) ═══
${question.idealSolution || 'Not provided'}

═══ CANDIDATE'S CODE ═══
${userCode}

═══ TEST RESULTS ═══
${testsPassed}/${testsTotal} tests passed
${testResults.map((t, i) => `Test ${i + 1}: ${t.passed ? '✅ PASS' : '❌ FAIL'} | Input: ${t.input} | Expected: ${t.expected} | Got: ${t.actual || 'ERROR'}${t.stderr ? ' | Error: ' + t.stderr : ''}`).join('\n')}

═══ OUTPUT FORMAT ═══
Return a JSON object:
{
  "score": <0-100 integer>,
  "timeComplexity": "<Big O notation>",
  "spaceComplexity": "<Big O notation>",
  "summary": "<1-2 sentence overall assessment>",
  "strengths": ["<strength1>", "<strength2>"],
  "issues": ["<issue1>", "<issue2>"],
  "improvements": ["<specific improvement suggestion>"]
}

SCORING GUIDE:
- 90-100: All tests pass, optimal solution, clean code
- 70-89: Most tests pass, reasonable approach
- 50-69: Some tests pass, partially correct
- 30-49: Few tests pass, significant issues
- 0-29: No tests pass or fundamentally wrong approach`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
            },
        });

        return JSON.parse(response.text);
    } catch (err) {
        console.error('Gemini evaluation failed:', err);
        // Fallback to basic scoring based on test results
        const score = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
        return {
            score,
            timeComplexity: 'Unknown',
            spaceComplexity: 'Unknown',
            summary: `${testsPassed}/${testsTotal} tests passed. AI feedback unavailable.`,
            strengths: [],
            issues: ['AI evaluation unavailable'],
            improvements: [],
        };
    }
}
