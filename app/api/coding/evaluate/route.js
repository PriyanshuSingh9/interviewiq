import { NextResponse } from 'next/server';
import { codingSubmissions, questionBank } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getGenAI } from '@/lib/gemini';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

/**
 * POST /api/coding/evaluate
 * Evaluates a code submission via Piston (execution) + Gemini (quality feedback).
 * Body: { submissionId, code }
 */
export async function POST(req) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { submissionId, code, questionTitle, questionDescription } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        // ── Ad-hoc Mode (Integrated Interview Round) ─────────────────
        if (!submissionId) {
            if (!questionTitle || !questionDescription) {
                return NextResponse.json({ error: 'questionTitle and questionDescription are required for ad-hoc evaluation' }, { status: 400 });
            }

            // In ad-hoc mode, there are no pre-defined test cases to run in Piston.
            // We go straight to Gemini for qualitative evaluation.
            const dummyQuestion = {
                title: questionTitle,
                type: 'dsa',
                difficulty: 'Variable',
                description: questionDescription,
                idealSolution: 'N/A',
            };

            const aiFeedback = await getGeminiFeedback(dummyQuestion, code, [], 0, 0);

            return NextResponse.json({
                testResults: [],
                testsPassed: 0,
                testsTotal: 0,
                aiScore: aiFeedback.score,
                aiFeedback,
            });
        }
        // ─────────────────────────────────────────────────────────────

        // ── Standard DB Mode (Separate Coding Round Page) ────────────

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

        // Reject excessively large code submissions
        if (code.length > 50000) {
            return NextResponse.json({ error: 'Code too large (max 50KB)' }, { status: 400 });
        }

        for (const tc of testCases) {
            // Build the execution code with isolation:
            // 1. Capture console.log BEFORE user code so it can't be overridden
            // 2. Parse test input from JSON string (no raw interpolation)
            // 3. Wrap in IIFE to prevent variable leakage
            const fnName = extractFunctionName(question.starterCode);
            const safeInput = JSON.stringify(tc.input); // serialize once, parse at runtime
            const execCode = `
(function() {
    const __log = console.log.bind(console);
    const __stringify = JSON.stringify;

    // --- User code (sandboxed by Piston) ---
    ${code}
    // --- End user code ---

    const __input = JSON.parse(${JSON.stringify(safeInput)});
    const __fn = typeof ${fnName} === 'function' ? ${fnName} : null;
    if (!__fn) { __log('__ERR_FN_NOT_FOUND__'); return; }
    const __result = __fn(...__input);
    __log(__stringify(__result));
})();
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
                        memory_limit: 128000000, // 128MB memory limit
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
                    stderr: 'Execution failed',
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
        const ai = getGenAI();

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
${testsTotal > 0 ? `${testsPassed}/${testsTotal} tests passed\n` + testResults.map((t, i) => `Test ${i + 1}: ${t.passed ? '✅ PASS' : '❌ FAIL'} | Input: ${t.input} | Expected: ${t.expected} | Got: ${t.actual || 'ERROR'}${t.stderr ? ' | Error: ' + t.stderr : ''}`).join('\n') : "No automated tests run. Evaluate the code purely based on correct logic, time/space complexity, and clean structure."}

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
