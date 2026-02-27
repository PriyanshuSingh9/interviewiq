import { auth } from "@clerk/nextjs/server";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, interviewPresets, interviewSessions } from "@/lib/db/schema";

export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Look up internal DB user
        const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkId))
            .limit(1);

        if (!dbUser) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch presets with session count and latest report
        const presetsRaw = await db
            .select({
                id: interviewPresets.id,
                targetRole: interviewPresets.targetRole,
                jobDescription: interviewPresets.jobDescription,
                resumeName: interviewPresets.resumeName,
                githubUrl: interviewPresets.githubUrl,
                createdAt: interviewPresets.createdAt,
                sessionCount: sql`(
                    SELECT COUNT(*)::int
                    FROM "InterviewSessions"
                    WHERE "presetId" = "InterviewPreset"."id"
                )`,
                latestReport: sql`(
                    SELECT "preInterviewReport"
                    FROM "InterviewSessions"
                    WHERE "presetId" = "InterviewPreset"."id"
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                )`,
                latestSessionId: sql`(
                    SELECT "id"
                    FROM "InterviewSessions"
                    WHERE "presetId" = "InterviewPreset"."id"
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                )`,
            })
            .from(interviewPresets)
            .where(eq(interviewPresets.userId, dbUser.id))
            .orderBy(desc(interviewPresets.createdAt));

        return Response.json({ presets: presetsRaw });
    } catch (err) {
        console.error("Presets API error:", err);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
