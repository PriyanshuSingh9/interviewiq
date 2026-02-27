import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { codingRounds, codingSubmissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient);

/**
 * POST /api/coding/complete
 * Finalizes a coding round, calculates overall score, and generates aggregate feedback.
 * Body: { roundId }
 */
export async function POST(req) {
    try {
        const { roundId } = await req.json();

        if (!roundId) {
            return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
        }

        // 1. Get all submissions for this round
        const submissions = await db
            .select()
            .from(codingSubmissions)
            .where(eq(codingSubmissions.roundId, roundId))
            .orderBy(codingSubmissions.questionNumber);

        if (submissions.length === 0) {
            return NextResponse.json({ error: 'No submissions found for this round' }, { status: 404 });
        }

        // 2. Calculate overall score (average of AI scores, weighted by test pass rate)
        const scoredSubmissions = submissions.filter(s => s.aiScore !== null);
        const overallScore = scoredSubmissions.length > 0
            ? Math.round(scoredSubmissions.reduce((sum, s) => sum + s.aiScore, 0) / scoredSubmissions.length)
            : 0;

        // 3. Generate overall feedback via Gemini
        const overallFeedback = await generateOverallFeedback(submissions, overallScore);

        // 4. Update the coding round
        await db.update(codingRounds)
            .set({
                status: 'completed',
                overallScore,
                overallFeedback,
            })
            .where(eq(codingRounds.id, roundId));

        return NextResponse.json({
            roundId,
            status: 'completed',
            overallScore,
            overallFeedback,
            submissions: submissions.map(s => ({
                questionNumber: s.questionNumber,
                testsPassed: s.testsPassed,
                testsTotal: s.testsTotal,
                aiScore: s.aiScore,
            })),
        });

    } catch (error) {
        console.error('Error completing coding round:', error);
        return NextResponse.json({ error: 'Failed to complete coding round' }, { status: 500 });
    }
}

async function generateOverallFeedback(submissions, overallScore) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const summaryLines = submissions.map(s => {
            const feedback = s.aiFeedback || {};
            return `Q${s.questionNumber}: Score ${s.aiScore || 0}/100, Tests ${s.testsPassed || 0}/${s.testsTotal || 0}. ${feedback.summary || 'No feedback'}`;
        }).join('\n');

        const prompt = `You are a senior technical interviewer. Based on the following coding round results, provide a brief overall assessment.

═══ RESULTS ═══
Overall Score: ${overallScore}/100
${summaryLines}

═══ OUTPUT ═══
Write 3-4 sentences summarizing the candidate's coding performance. Mention specific strengths and areas for improvement. Be constructive but honest.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.3 },
        });

        return response.text;
    } catch (err) {
        console.error('Gemini overall feedback failed:', err);
        return `Coding round completed with an overall score of ${overallScore}/100.`;
    }
}
