import { auth } from "@clerk/nextjs/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, interviewPresets, interviewSessions, codingRounds } from "@/lib/db/schema";

/**
 * GET /api/reports
 * Fetches all presets with their sessions (including pre-interview reports and coding round scores).
 */
export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkId))
            .limit(1);

        if (!dbUser) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch all presets for this user
        const presetsRaw = await db
            .select({
                id: interviewPresets.id,
                targetRole: interviewPresets.targetRole,
                jobDescription: interviewPresets.jobDescription,
                resumeName: interviewPresets.resumeName,
                githubUrl: interviewPresets.githubUrl,
                createdAt: interviewPresets.createdAt,
            })
            .from(interviewPresets)
            .where(eq(interviewPresets.userId, dbUser.id))
            .orderBy(desc(interviewPresets.createdAt));

        // For each preset, fetch all sessions with their coding round data
        const presetsWithSessions = await Promise.all(
            presetsRaw.map(async (preset) => {
                const sessions = await db
                    .select({
                        id: interviewSessions.id,
                        preInterviewReport: interviewSessions.preInterviewReport,
                        postInterviewReport: interviewSessions.postInterviewReport,
                        createdAt: interviewSessions.createdAt,
                    })
                    .from(interviewSessions)
                    .where(eq(interviewSessions.presetId, preset.id))
                    .orderBy(desc(interviewSessions.createdAt));

                // For each session, get coding round info
                const sessionsWithCoding = await Promise.all(
                    sessions.map(async (session) => {
                        const [codingRound] = await db
                            .select({
                                id: codingRounds.id,
                                status: codingRounds.status,
                                overallScore: codingRounds.overallScore,
                                overallFeedback: codingRounds.overallFeedback,
                            })
                            .from(codingRounds)
                            .where(eq(codingRounds.sessionId, session.id))
                            .limit(1);

                        return {
                            ...session,
                            codingRound: codingRound || null,
                        };
                    })
                );

                return {
                    ...preset,
                    sessions: sessionsWithCoding,
                };
            })
        );

        return Response.json({ presets: presetsWithSessions });
    } catch (err) {
        console.error("Reports API error:", err);
        return Response.json(
            { error: `Internal server error: ${err.message}` },
            { status: 500 }
        );
    }
}
