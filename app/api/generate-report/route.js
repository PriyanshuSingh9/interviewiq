import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewSessions, interviewPresets, users } from "@/lib/db/schema";
import { generatePostInterviewReport } from "@/lib/post-interview/reportGenerator";

export async function POST(req) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { sessionId, transcript, force } = await req.json();
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
                preInterviewReport: interviewSessions.preInterviewReport,
                presetUserId: interviewPresets.userId,
                targetRole: interviewPresets.targetRole,
            })
            .from(interviewSessions)
            .leftJoin(interviewPresets, eq(interviewSessions.presetId, interviewPresets.id))
            .where(eq(interviewSessions.id, sessionId))
            .limit(1);

        if (!session || session.presetUserId !== dbUser.id) {
            return Response.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.postInterviewReport && !force) {
            return Response.json({ status: "already_generated", report: session.postInterviewReport });
        }

        if (!Array.isArray(transcript) || transcript.length === 0) {
            return Response.json({ error: "Transcript is required" }, { status: 400 });
        }

        const report = await generatePostInterviewReport({
            transcript,
            preInterviewReport: session.preInterviewReport,
            targetRole: session.targetRole,
        });

        const persistedReport = report?.error
            ? { error: report.error, rawResponse: report.rawResponse || null, transcript }
            : report;

        await db
            .update(interviewSessions)
            .set({ postInterviewReport: persistedReport, transcript })
            .where(eq(interviewSessions.id, sessionId));

        if (report?.error) {
            return Response.json({ status: "error", report: persistedReport }, { status: 502 });
        }

        return Response.json({ status: "completed", report: persistedReport });
    } catch (err) {
        return Response.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
