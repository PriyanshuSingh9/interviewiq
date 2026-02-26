import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, interviewPresets, interviewSessions } from "@/lib/db/schema";
import { parseResume } from "@/lib/pre-interview/resumeParser";
import { analyzeGithubProfile } from "@/lib/pre-interview/githubAnalyzer";
import { generatePreInterviewReport } from "@/lib/pre-interview/reportGenerator";
import { buildSystemPrompt } from "@/lib/pre-interview/systemPromptBuilder";

export async function POST(req) {
    try {
        // Auth check
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Look up internal DB user by Clerk ID
        const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
        if (!dbUser) {
            return Response.json({ error: "User not found. Please sign in again." }, { status: 404 });
        }

        // Parse form data
        const formData = await req.formData();
        const resumeFile = formData.get("resume");
        const githubUrl = formData.get("githubUrl");
        const jobDescription = formData.get("jobDescription");
        const targetRole = formData.get("targetRole");
        const existingPresetId = formData.get("presetId"); // optional — reuse existing preset

        // Validate: either presetId OR full form data must be provided
        if (!existingPresetId && (!resumeFile || !jobDescription || !targetRole)) {
            return Response.json(
                { error: "Missing required fields: resume, jobDescription, targetRole" },
                { status: 400 }
            );
        }

        // If reusing a preset, load its data
        let presetId = existingPresetId;
        let jd = jobDescription;
        let role = targetRole;

        if (existingPresetId) {
            const [existingPreset] = await db
                .select()
                .from(interviewPresets)
                .where(eq(interviewPresets.id, existingPresetId))
                .limit(1);

            if (!existingPreset || existingPreset.userId !== dbUser.id) {
                return Response.json(
                    { error: "Preset not found or does not belong to you." },
                    { status: 404 }
                );
            }

            jd = existingPreset.jobDescription;
            role = existingPreset.targetRole;
        }

        // ── Step 1: Parse resume ─────────────────────────────────
        let resumeData = { text: "", githubUrl: null };
        if (resumeFile && typeof resumeFile.arrayBuffer === "function") {
            const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
            try {
                resumeData = await parseResume(resumeBuffer);
            } catch (err) {
                console.error("Resume parsing failed:", err);
                return Response.json(
                    { error: "Failed to parse resume PDF. Please upload a text-based PDF." },
                    { status: 422 }
                );
            }

            if (!resumeData.text || resumeData.text.trim().length < 50) {
                return Response.json(
                    { error: "Resume appears to be empty or scanned. Please upload a text-based PDF." },
                    { status: 422 }
                );
            }
        }

        // ── Step 2: Analyze GitHub ───────────────────────────────
        const profileUrl = githubUrl || resumeData.githubUrl;
        let githubAnalysis = null;

        if (profileUrl) {
            try {
                githubAnalysis = await analyzeGithubProfile(profileUrl);
            } catch (err) {
                console.error("GitHub analysis failed:", err);
                githubAnalysis = { user: null, repos: [], error: err.message };
            }
        }

        // ── Step 3: Generate pre-interview report ────────────────
        let report;
        try {
            report = await generatePreInterviewReport({
                resumeText: resumeData.text,
                githubAnalysis,
                jobDescription: jd,
                targetRole: role,
            });
        } catch (err) {
            console.error("Report generation failed:", err);
            return Response.json(
                { error: "Failed to generate interview report. Please try again." },
                { status: 500 }
            );
        }

        // ── Step 4: Build system prompt ──────────────────────────
        const systemPrompt = buildSystemPrompt(report);

        // ── Step 5: Persist to database ──────────────────────────
        if (!presetId) {
            // Create a new preset
            const [preset] = await db
                .insert(interviewPresets)
                .values({
                    userId: dbUser.id,
                    jobDescription: jd,
                    resumeLocation: "inline",
                    targetRole: role,
                })
                .returning();
            presetId = preset.id;
        }

        // Create a new session linked to the preset
        const [session] = await db
            .insert(interviewSessions)
            .values({
                presetId,
                preInterviewReport: report,
                systemPrompt,
            })
            .returning();

        return Response.json({
            sessionId: session.id,
            report,
        });

    } catch (err) {
        console.error("Prepare API error:", err);
        return Response.json(
            { error: `Internal server error: ${err.message}` },
            { status: 500 }
        );
    }
}
