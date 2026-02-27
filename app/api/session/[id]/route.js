import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewSessions, interviewPresets, users, codingRounds } from "@/lib/db/schema";

export async function GET(req, { params }) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkId))
            .limit(1);

        if (!dbUser) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch session with its preset
        const [session] = await db
            .select({
                id: interviewSessions.id,
                presetId: interviewSessions.presetId,
                preInterviewReport: interviewSessions.preInterviewReport,
                systemPrompt: interviewSessions.systemPrompt,
                createdAt: interviewSessions.createdAt,
                targetRole: interviewPresets.targetRole,
                codingRoundId: codingRounds.id,
                codingRoundStatus: codingRounds.status,
                codingRoundScore: codingRounds.overallScore,
                codingRoundFeedback: codingRounds.overallFeedback,
            })
            .from(interviewSessions)
            .leftJoin(interviewPresets, eq(interviewSessions.presetId, interviewPresets.id))
            .leftJoin(codingRounds, eq(codingRounds.sessionId, interviewSessions.id))
            .where(eq(interviewSessions.id, id))
            .limit(1);

        if (!session || session.presetId == null) {
            return Response.json({ error: "Session not found" }, { status: 404 });
        }

        if (session && session.presetId) {
            const [preset] = await db
                .select({
                    userId: interviewPresets.userId,
                })
                .from(interviewPresets)
                .where(eq(interviewPresets.id, session.presetId))
                .limit(1);

            if (!preset || preset.userId !== dbUser.id) {
                return Response.json({ error: "Session not found" }, { status: 404 });
            }
        }

        const codingRound = session.codingRoundId
            ? {
                id: session.codingRoundId,
                status: session.codingRoundStatus,
                overallScore: session.codingRoundScore,
                overallFeedback: session.codingRoundFeedback,
            }
            : null;

        return Response.json({
            session: {
                id: session.id,
                presetId: session.presetId,
                preInterviewReport: session.preInterviewReport,
                systemPrompt: session.systemPrompt,
                createdAt: session.createdAt,
                targetRole: session.targetRole,
                codingRound,
            },
        });
    } catch (err) {
        console.error("Session fetch error:", err);
        return Response.json(
            { error: "Failed to fetch session" },
            { status: 500 }
        );
    }
}
