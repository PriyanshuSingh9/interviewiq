import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewSessions, interviewPresets } from "@/lib/db/schema";

export async function GET(req, { params }) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch session with its preset
        const [session] = await db
            .select({
                id: interviewSessions.id,
                presetId: interviewSessions.presetId,
                preInterviewReport: interviewSessions.preInterviewReport,
                systemPrompt: interviewSessions.systemPrompt,
                createdAt: interviewSessions.createdAt,
                targetRole: interviewPresets.targetRole,
            })
            .from(interviewSessions)
            .leftJoin(interviewPresets, eq(interviewSessions.presetId, interviewPresets.id))
            .where(eq(interviewSessions.id, id))
            .limit(1);

        if (!session) {
            return Response.json({ error: "Session not found" }, { status: 404 });
        }

        return Response.json({ session });
    } catch (err) {
        console.error("Session fetch error:", err);
        return Response.json(
            { error: `Failed to fetch session: ${err.message}` },
            { status: 500 }
        );
    }
}
