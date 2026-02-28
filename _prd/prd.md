## 1. Product Overview

**Goal:** Build an agentic AI mock interview platform targeting Software Engineering roles. The AI autonomously conducts end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and GitHub repositories.

**Key Differentiators:**
- Feels like a real interviewer — not a chatbot
- Uses Gemini Multimodal Live API for natural, low-latency voice interaction
- Leverages deep GitHub profile analysis to ask personalized architectural questions
- Pre-interview report provides candidate context so the AI interviewer adapts dynamically
- Includes a timed coding round with auto-evaluation (Piston + Gemini)
- Reusable Interview Presets with session history tracking
- Reports Hub for analytics across presets and sessions

**Out of Scope (for this version):**
- Multiple simultaneous users (single-session focus for hackathon)
- Mobile browser support (desktop Chrome/Edge only)
- Post-interview debrief report generation (planned)

---

## 2. Architecture Overview

### Single-Model Architecture — Gemini Throughout

| Concern | Model | Reason |
|---------|-------|--------|
| Resume/GitHub/JD analysis | Gemini 2.5 Flash (`@google/genai`) | Structured JSON output, fast |
| Live voice interview | Gemini Multimodal Live API | Low-latency audio, natural voice, direct browser WebSocket |
| Coding round evaluation | Gemini 2.5 Flash (`@google/genai`) | Code quality feedback and scoring |
| Post-interview report | Gemini 2.5 Flash (planned) | Structured JSON output |

### Architecture

```
Browser (localhost:3000)
  │
  ├─── REST ──────────────► Next.js App Router (:3000)
  │                          - / (landing page)
  │                          - /dashboard (ingestion + prepare + preset selection)
  │                          - /reports (Reports Hub — analytics dashboard)
  │                          - /coding/[sessionId] (coding round room)
  │                          - /interview/[id] (live interview room)
  │                          - /api/prepare (ingestion pipeline)
  │                          - /api/presets (preset CRUD)
  │                          - /api/reports (reports data API)
  │                          - /api/gemini-token (ephemeral token)
  │                          - /api/process-transcript (post-interview)
  │                          - /api/coding/start (init coding round)
  │                          - /api/coding/evaluate (run + score code)
  │                          - /api/coding/complete (finalize round)
  │
  └─── WebSocket ──────────► Gemini Multimodal Live API (direct)
                              - Browser connects directly via ephemeral token
                              - No intermediate bridge server needed
```

### Data Flow Summary

```
/dashboard (form + preset selector)
  → POST /api/prepare
    → unpdf (resume text extraction)
    → @octokit/rest (GitHub profile + top 3 repo analysis)
    → Gemini 2.5 Flash (pre-interview report generation)
    → systemPromptBuilder (report → concise context prompt)
    → DB insert/reuse: InterviewPreset + InterviewSession
  → Dashboard shows report + "Start Interview" / "Start Coding Round" buttons
  → Redirect to /interview/[sessionId] or /coding/[sessionId]

/interview/[id]
  → Browser requests ephemeral token from /api/gemini-token
  → Browser opens WebSocket to Gemini Multimodal Live API directly
  → System prompt injected with candidate context
  → Browser starts mic capture → audio flows both ways
  → Live transcript displayed in side panel
  → On interview end → redirect to /reports

/coding/[sessionId]
  → POST /api/coding/start (selects questions by role, creates CodingRound)
  → User solves problems in Monaco Editor
  → POST /api/coding/evaluate (Piston execution + Gemini feedback per question)
  → POST /api/coding/complete (aggregates scores, finalizes round)

/reports
  → GET /api/reports (all presets with sessions + coding round data)
  → Displays summary stats, accordion preset cards, expandable session details
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 App Router + TailwindCSS | File-based routing + API routes |
| Auth | Clerk (`@clerk/nextjs`) | User management, OAuth, middleware |
| Database | PostgreSQL (Neon) + Drizzle ORM | Serverless Postgres, 6 tables |
| Voice UI | Web Audio API + MediaRecorder | Mic capture, PCM16 encoding, audio playback |
| Cloud LLM (analysis) | Gemini 2.5 Flash (`@google/genai`) | Pre-interview report + coding evaluation |
| Cloud LLM (voice) | Gemini Multimodal Live API | Live interview, direct browser WebSocket |
| Code Execution | Piston API | Sandboxed JavaScript execution for coding round |
| Code Editor | `@monaco-editor/react` | VS Code-quality editor for coding round |
| PDF Parsing | `unpdf` | Resume text extraction |
| GitHub | `@octokit/rest` | Profile + repo analysis |
| Forms | `react-hook-form` | Dashboard form management |

**Port Map:**
- `:3000` — Next.js (dev + API)

---

## 4. Database Schema (Drizzle ORM + Neon)

See [`SCHEMAS.md`](./SCHEMAS.md) for full details.

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
├── resumeName
├── githubUrl
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

QuestionBank
├── id (uuid, PK)
├── type ('dsa' | 'bugfix')
├── difficulty ('easy' | 'medium' | 'hard')
├── tags (jsonb — e.g. ["arrays", "hashmap"])
├── roleTags (jsonb — e.g. ["sde", "backend", "fullstack"])
├── title
├── description
├── starterCode (JS only)
├── testCases (jsonb — [{input, expectedOutput}])
├── sampleIO (jsonb)
├── idealSolution
└── createdAt

CodingRound
├── id (uuid, PK)
├── sessionId → InterviewSessions.id (FK)
├── status ('pending' | 'in_progress' | 'completed')
├── overallScore (int)
├── overallFeedback (text)
└── createdAt

CodingSubmission
├── id (uuid, PK)
├── roundId → CodingRound.id (FK)
├── questionId → QuestionBank.id (FK)
├── questionNumber (int)
├── userCode (text)
├── testResults (jsonb — [{input, expected, actual, passed}])
├── testsPassed (int)
├── testsTotal (int)
├── aiScore (int)
├── aiFeedback (jsonb)
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
| Dashboard UI / form | `app/dashboard/page.js` (react-hook-form) | ✅ Done |
| Preset selector | `GET /api/presets` + Dashboard dropdown | ✅ Done |

---

## 6. Live Interview (Phase 2 — ✅ COMPLETE)

| Step | Module | Status |
|------|--------|--------|
| Interview room UI | `app/interview/[id]/page.js` | ✅ Done |
| Gemini Live client | `lib/gemini-live.js` | ✅ Done |
| Ephemeral token API | `app/api/gemini-token/route.js` | ✅ Done |
| Session system prompt injection | Via pre-built systemPrompt field | ✅ Done |
| Live transcript display | Interview room side panel | ✅ Done |
| Mic controls | Interview room control bar | ✅ Done |

---

## 7. Coding Round (Phase 2.5 — ✅ COMPLETE)

| Step | Module | Status |
|------|--------|--------|
| Question Bank | `QuestionBank` table + seed script (`scripts/seed-questions.mjs`) | ✅ Done (25 JS questions) |
| Start API | `app/api/coding/start/route.js` (selects questions by role) | ✅ Done |
| Evaluate API | `app/api/coding/evaluate/route.js` (Piston + Gemini) | ✅ Done |
| Complete API | `app/api/coding/complete/route.js` (aggregate scores) | ✅ Done |
| Coding Room UI | `app/coding/[sessionId]/page.js` (Monaco Editor, split-pane) | ✅ Done |
| Dashboard button | "Start Coding Round" in floating action bar | ✅ Done |

---

## 8. Reports Hub (Phase 4 — ✅ COMPLETE)

| Step | Module | Status |
|------|--------|--------|
| Reports data API | `app/api/reports/route.js` | ✅ Done |
| Reports Hub page | `app/reports/page.js` | ✅ Done |
| Summary stats bar | Total presets, sessions, avg fit score, coding rounds | ✅ Done |
| Preset accordion cards | Expandable sessions with fit/coding badges | ✅ Done |
| Session detail view | 2-column: fit score, skills, calibration, GitHub, interview plan, coding | ✅ Done |

---

## 9. Post-Interview Report (Phase 3 — ✅ COMPLETE)

| Step | Module | Status |
|------|--------|--------|
| Transcript persistence | PostgreSQL `transcript` column in `InterviewSessions` | ✅ Done |
| Report generation (Gemini) | `lib/post-interview/reportGenerator.js` | ✅ Done |
| Post-interview report display | Integrated into `/report/[sessionId]` and Reports Hub | ✅ Done |

---

## 10. UI/UX Design System

| Element | Value |
|---------|-------|
| Background | `#001E2B` (mongodb-bg) |
| Card background | `#061621` (mongodb-card) |
| Primary accent | `#00ED64` (mongodb-neon) |
| Secondary accent | `#8B5CF6` (purple, coding) |
| Font | Inter (Google Fonts) |
| Corners | 2xl/3xl rounded |
| Theme | Dark with neon glow effects |
| Logo | `BrainCircuit` icon from lucide-react |

---

## 11. Critical Edge Cases & Failure Modes

| Scenario | Handling |
|----------|---------|
| PDF has no extractable text (scanned) | Detect empty string after parse → surface error |
| GitHub profile has 0 public repos | Proceed with resume + JD only |
| GitHub profile is private | Same as above — non-fatal |
| Gemini API key invalid/expired | Catch error → surface to user |
| Microphone permission denied | `getUserMedia` throws → show error message |
| Piston API unavailable | Coding round fail-safe with error message |
| No questions match target role | Fallback to `general` role tag questions |

---

## 12. Detailed Phase Documents

- [`PHASE_1_INGESTION.md`](./PHASE_1_INGESTION.md) — Resume/GitHub/JD pipeline
- [`PHASE_2_BRIDGE.md`](./PHASE_2_BRIDGE.md) — Live interview architecture (legacy — now direct WebSocket)
- [`PHASE_2_INTERRUPTION.md`](./PHASE_2_INTERRUPTION.md) — Interruption engine design (planned)
- [`PHASE_3_REPORT.md`](./PHASE_3_REPORT.md) — Post-interview report generation (planned)
- [`SCHEMAS.md`](./SCHEMAS.md) — Data schemas
- [`FRONTEND.md`](./FRONTEND.md) — Frontend pages and components