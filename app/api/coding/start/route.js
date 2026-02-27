import { NextResponse } from 'next/server';
import { sql, inArray } from 'drizzle-orm';
import { interviewSessions, interviewPresets, questionBank, codingRounds, codingSubmissions } from '@/lib/db/schema';
import { getTagsForRole } from '@/lib/coding/roleTagMapping';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/coding/start
 * Starts a new coding round for a session.
 * Body: { sessionId }
 * 
 * 1. Looks up the session's preset to get targetRole
 * 2. Maps role to question bank tags
 * 3. Randomly selects 3-5 questions matching those tags
 * 4. Creates CodingRound + CodingSubmission rows
 * 5. Returns the round and questions
 */
export async function POST(req) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        // 1. Get session and preset to determine target role
        const sessions = await db
            .select({
                sessionId: interviewSessions.id,
                presetId: interviewSessions.presetId,
                targetRole: interviewPresets.targetRole,
            })
            .from(interviewSessions)
            .innerJoin(interviewPresets, eq(interviewSessions.presetId, interviewPresets.id))
            .where(eq(interviewSessions.id, sessionId))
            .limit(1);

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const { targetRole } = sessions[0];

        // 2. Check if a coding round already exists for this session
        const existingRounds = await db
            .select()
            .from(codingRounds)
            .where(eq(codingRounds.sessionId, sessionId))
            .limit(1);

        if (existingRounds.length > 0) {
            // Return existing round with questions
            const existingSubmissions = await db
                .select({
                    submission: codingSubmissions,
                    question: questionBank,
                })
                .from(codingSubmissions)
                .innerJoin(questionBank, eq(codingSubmissions.questionId, questionBank.id))
                .where(eq(codingSubmissions.roundId, existingRounds[0].id))
                .orderBy(codingSubmissions.questionNumber);

            return NextResponse.json({
                roundId: existingRounds[0].id,
                status: existingRounds[0].status,
                questions: existingSubmissions.map(s => ({
                    submissionId: s.submission.id,
                    questionNumber: s.submission.questionNumber,
                    questionId: s.question.id,
                    type: s.question.type,
                    difficulty: s.question.difficulty,
                    title: s.question.title,
                    description: s.question.description,
                    starterCode: s.question.starterCode,
                    sampleIO: s.question.sampleIO,
                    userCode: s.submission.userCode,
                    testResults: s.submission.testResults,
                    testsPassed: s.submission.testsPassed,
                    testsTotal: s.submission.testsTotal,
                    aiScore: s.submission.aiScore,
                    aiFeedback: s.submission.aiFeedback,
                })),
            });
        }

        // 3. Get role tags and fetch random matching questions directly in SQL
        const roleTags = getTagsForRole(targetRole);

        // Filter in SQL using PostgreSQL's ?| operator for jsonb array overlap
        const selectedQuestions = await db
            .select()
            .from(questionBank)
            .where(sql`${questionBank.roleTags} ?| array[${sql.join(roleTags.map(t => sql`${t}`), sql`, `)}]`)
            .orderBy(sql`RANDOM()`)
            .limit(5);

        if (selectedQuestions.length === 0) {
            return NextResponse.json({ error: 'No matching questions found for role' }, { status: 404 });
        }

        // 4. Create the coding round
        const [round] = await db.insert(codingRounds).values({
            sessionId,
            status: 'in_progress',
        }).returning();

        // 5. Create submissions for each question
        const submissionValues = selectedQuestions.map((q, idx) => ({
            roundId: round.id,
            questionId: q.id,
            questionNumber: idx + 1,
        }));

        const insertedSubmissions = await db.insert(codingSubmissions).values(submissionValues).returning();

        // 6. Return round with questions
        return NextResponse.json({
            roundId: round.id,
            status: round.status,
            questions: selectedQuestions.map((q, idx) => ({
                submissionId: insertedSubmissions[idx].id,
                questionNumber: idx + 1,
                questionId: q.id,
                type: q.type,
                difficulty: q.difficulty,
                title: q.title,
                description: q.description,
                starterCode: q.starterCode,
                sampleIO: q.sampleIO,
                userCode: null,
                testResults: null,
                testsPassed: null,
                testsTotal: null,
                aiScore: null,
                aiFeedback: null,
            })),
        });

    } catch (error) {
        console.error('Error starting coding round:', error);
        return NextResponse.json({ error: 'Failed to start coding round' }, { status: 500 });
    }
}
