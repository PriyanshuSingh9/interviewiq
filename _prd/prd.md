## 1. Product Overview

**Goal:** Build an agentic AI mock interview platform targeting Software Engineering roles. The AI autonomously conducts end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and GitHub repositories.

**Key Differentiators:**
- Feels like a real interviewer — not a chatbot
- Uses Gemini Multimodal Live API for natural, low-latency voice interaction
- Leverages deep GitHub profile analysis to ask personalized architectural questions
- Pre-interview report provides candidate context so the AI interviewer adapts dynamically
- Provides a structured post-interview debrief
- Intelligently interrupts rambling using a multi-signal heuristic engine (not a dumb timer)
- Provides a timestamped, annotated technical debrief with specific moment references

**Out of Scope (for this version):**
- Multiple simultaneous users (single-session focus for hackathon)
- Mobile browser support (desktop Chrome/Edge only)

---

## 2. Architecture Overview

### Single-Model Architecture — Gemini Throughout

| Concern | Model | Reason |
|---------|-------|--------|
| Resume/GitHub/JD analysis | Gemini 2.5 Flash | Structured JSON output, fast |
| Live voice interview | Gemini Multimodal Live API | Low-latency audio, natural voice |
| Post-interview report | Gemini 2.5 Flash (planned) | Structured JSON output |

### Architecture

```
Browser (localhost:3000)
  │
  ├─── REST ──────────────► Next.js App Router (:3000)
  │                          - / (landing page)
  │                          - /dashboard (ingestion + prepare)
  │                          - /api/prepare (ingestion pipeline)
  │                          - /api/gemini-token (ephemeral token)
  │                          - /api/process-transcript (post-interview)
  │                          - /interview/[id] (live interview room)
  │                          - /reports (post-interview reports)
  │
  └─── WebSocket ──────────► Gemini Multimodal Live API (direct)
                              - Browser connects directly via ephemeral token
                              - No intermediate bridge server needed
```

### Data Flow Summary

```
/dashboard (form)
  → POST /api/prepare
    → unpdf (resume text extraction)
    → @octokit/rest (GitHub profile + top 3 repo analysis)
    → Gemini 2.5 Flash (pre-interview report generation)
    → systemPromptBuilder (report → concise context prompt)
    → DB insert: InterviewPreset + InterviewSession
  → Dashboard shows report + "Start Interview" button
  → Redirect to /interview/[sessionId]

/interview/[id]
  → Browser requests ephemeral token from /api/gemini-token
  → Browser opens WebSocket to Gemini Multimodal Live API directly
  → System prompt injected with candidate context
  → Browser starts mic + camera capture → audio flows both ways
  → Live transcript displayed in side panel
  → On interview end → redirect to /reports

/reports (planned)
  → POST /api/process-transcript with full transcript
  → Gemini generates structured post-interview report
  → Display detailed debrief with scores and recommendations
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 App Router + TailwindCSS | File-based routing + API routes |
| Auth | Clerk | User management, OAuth |
| Database | PostgreSQL (Neon) + Drizzle ORM | Serverless Postgres, interview history |
| Voice UI | Web Audio API + MediaRecorder | Mic capture, PCM16 encoding, audio playback |
| Cloud LLM (analysis) | Gemini 2.5 Flash (`@google/genai`) | Pre-interview report generation |
| Cloud LLM (voice) | Gemini Multimodal Live API | Live interview, direct browser WebSocket |
| PDF Parsing | `unpdf` | Resume text extraction |
| GitHub | `@octokit/rest` | Profile + repo analysis |

**Port Map:**
- `:3000` — Next.js (dev + API)

---

## 4. Database Schema (Drizzle ORM + Neon)

```
User
├── id (uuid, PK)
├── clerkId (unique)
├── name
├── email (unique)
├── githubProfile
└── createdAt

InterviewPreset
├── id (uuid, PK)
├── userId → User.id (FK)
├── jobDescription
├── resumeLocation
├── targetRole
└── createdAt

InterviewSessions
├── id (uuid, PK)
├── presetId → InterviewPreset.id (FK)
├── audioLocation (nullable)
├── preInterviewReport (jsonb, nullable)
├── postInterviewReport (jsonb, nullable)
├── systemPrompt (nullable)
└── createdAt
```

---

## 5. Pre-Interview Pipeline (Phase 1 — ✅ COMPLETE)

| Step | Module | Status |
|------|--------|--------|
| Resume parsing | `lib/pre-interview/resumeParser.js` (unpdf) | ✅ Done |
| GitHub profile analysis | `lib/pre-interview/githubAnalyzer.js` (@octokit/rest) | ✅ Done |
| Report generation | `lib/pre-interview/reportGenerator.js` (Gemini 2.5 Flash) | ✅ Done |
| System prompt building | `lib/pre-interview/systemPromptBuilder.js` | ✅ Done |
| API route | `app/api/prepare/route.js` | ✅ Done |
| Dashboard UI / form | `app/dashboard/page.js` | ✅ Done |

---

## 6. Live Interview (Phase 2 — 🔶 IN PROGRESS)

| Step | Module | Status |
|------|--------|--------|
| Interview room UI | `app/interview/[id]/page.js` | ✅ Done |
| Gemini Live client | `lib/gemini-live.js` | ✅ Done |
| Ephemeral token API | `app/api/gemini-token/route.js` | ✅ Done |
| Wire session system prompt to Gemini Live | — | ❌ Not started |
| Live transcript display | Interview room side panel | ✅ Done |
| Mic/camera controls | Interview room control bar | ✅ Done |

---

## 7. Post-Interview Report (Phase 3 — ❌ NOT STARTED)

| Step | Module | Status |
|------|--------|--------|
| Transcript processing API | `app/api/process-transcript/route.js` | ❌ Placeholder |
| Report generation (Gemini) | — | ❌ Not started |
| Reports page UI | `app/reports/page.js` | ❌ Placeholder |
| History page | — | ❌ Not started |

---

## 8. Critical Edge Cases & Failure Modes

| Scenario | Handling |
|----------|---------|
| PDF has no extractable text (scanned) | Detect empty string after parse → surface error: "Your PDF appears to be a scanned image. Please upload a text-based PDF." |
| GitHub profile has 0 public repos | Proceed with resume + JD only. Note in profile. |
| GitHub profile is private | Same as above — non-fatal, continues without GitHub data |
| Gemini API key invalid/expired | Catch error → surface to user |
| Microphone permission denied | `getUserMedia` throws → show error message |
| Candidate doesn't speak for >60s | Planned: VAD silence detection |
| Interview exceeds 60 minutes | Planned: force end with closing prompt |