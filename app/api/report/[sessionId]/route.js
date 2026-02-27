import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewSessions, interviewPresets, users } from "@/lib/db/schema";

export async function GET(req, { params }) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { sessionId } = await params;
        if (!sessionId) {
            return Response.json({ error: "sessionId is required" }, { status: 400 });
        }

        const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkId))
            .limit(1);

        if (!dbUser) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        const [session] = await db
            .select({
                id: interviewSessions.id,
                postInterviewReport: interviewSessions.postInterviewReport,
                presetUserId: interviewPresets.userId,
                createdAt: interviewSessions.createdAt,
            })
            .from(interviewSessions)
            .leftJoin(interviewPresets, eq(interviewSessions.presetId, interviewPresets.id))
            .where(eq(interviewSessions.id, sessionId))
            .limit(1);

        if (!session || session.presetUserId !== dbUser.id) {
            return Response.json({ error: "Session not found" }, { status: 404 });
        }

        return Response.json({ report: session.postInterviewReport || null, createdAt: session.createdAt });
    } catch (err) {
        return Response.json(
            { error: "Failed to fetch report" },
            { status: 500 }
        );
    }
}
