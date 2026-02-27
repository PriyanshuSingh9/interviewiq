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

        if (presetsRaw.length === 0) {
            return Response.json({ presets: [] });
        }

        // Batch fetch all sessions for these presets in a single query
        const presetIds = presetsRaw.map(p => p.id);
        const allSessions = await db
            .select({
                id: interviewSessions.id,
                presetId: interviewSessions.presetId,
                preInterviewReport: interviewSessions.preInterviewReport,
                postInterviewReport: interviewSessions.postInterviewReport,
                createdAt: interviewSessions.createdAt,
            })
            .from(interviewSessions)
            .where(sql`${interviewSessions.presetId} IN ${presetIds}`)
            .orderBy(desc(interviewSessions.createdAt));

        // Batch fetch all coding rounds for these sessions in a single query
        const sessionIds = allSessions.map(s => s.id);
        let allCodingRounds = [];
        if (sessionIds.length > 0) {
            allCodingRounds = await db
                .select({
                    id: codingRounds.id,
                    sessionId: codingRounds.sessionId,
                    status: codingRounds.status,
                    overallScore: codingRounds.overallScore,
                    overallFeedback: codingRounds.overallFeedback,
                })
                .from(codingRounds)
                .where(sql`${codingRounds.sessionId} IN ${sessionIds}`);
        }

        // Build a lookup map for coding rounds by sessionId
        const codingRoundsBySession = {};
        for (const cr of allCodingRounds) {
            codingRoundsBySession[cr.sessionId] = cr;
        }

        // Build a lookup map for sessions by presetId
        const sessionsByPreset = {};
        for (const session of allSessions) {
            if (!sessionsByPreset[session.presetId]) {
                sessionsByPreset[session.presetId] = [];
            }
            sessionsByPreset[session.presetId].push({
                ...session,
                codingRound: codingRoundsBySession[session.id] || null,
            });
        }

        // Assemble final response
        const presetsWithSessions = presetsRaw.map(preset => ({
            ...preset,
            sessions: sessionsByPreset[preset.id] || [],
        }));

        return Response.json({ presets: presetsWithSessions });
    } catch (err) {
        console.error("Reports API error:", err);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
