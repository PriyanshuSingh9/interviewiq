## 1. Product Overview

**Goal:** Build an agentic AI mock interview platform targeting Software Engineering roles. The AI autonomously conducts end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and GitHub repositories etc.

**Key Differentiators:**
- Feels like a real interviewer — not a chatbot
- has multi persona engine to ask different questions simulating different rounds of interview or a proper interview panel
- Intelligently interrupts rambling using a multi-signal heuristic engine (not a dumb timer)
- Leverages Architectural Skeleton analysis of GitHub repos to ask deep, personalized architectural trade-off questions
- Provides a timestamped, annotated technical debrief with specific moment references

**Out of Scope (for this version):**
- Multiple simultaneous users (single-session focus for hackathon) 
- Mobile browser support (desktop Chrome/Edge only)

---

## 2. Architecture Overview

### The Hybrid Model — Why Two LLMs

| Concern | Model | Reason |
|---------|-------|--------|
| Resume/GitHub/JD analysis |OpenAI `gpt-4o-mini` (cloud) | Structured JSON output

| Live voice interview | OpenAI `gpt-4o-mini-realtime` (cloud) | Sub-100ms audio response, natural voice |
| Post-interview report | OpenAI `gpt-4o-mini` (cloud)  | Structured JSON output

| Interruption eval (fast) | OpenAI `gpt-4o-mini` chat (cloud) | 300-500ms eval on rolling transcript, cheaper than realtime |

### The Two-Server Architecture

```
Browser (:5173 dev / :3000 prod)
  │
  ├─── REST ──────────────────► Next.js (:3000)
  │                              - /upload page
  │                              - /api/prepare (ingestion)
  │                              - /api/report/[id] (poll)
  │                              - /interview/[id] page
  │                              - /report/[id] page
  │
  ├─── WebSocket ─────────────► Bridge Server (:3001)
  │                              - Relays audio to/from OpenAI
  │                              - Runs Director (round management)
  │                              - Runs Interruption Engine
  │                              - Logs transcript to Redis
```
### Data Flow Summary

```
Upload form
  → Next.js /api/prepare
    → pdf-parse (resume text)
    → GitHub API (architectural skeletons)
    → systemPromptBuilder (profile → prompt strings per round)
  → redirect to /interview/[id]

/interview/[id]
  → Browser opens WebSocket to Bridge (:3001/session/[id])
  → Bridge opens WebSocket to OpenAI Realtime API
  → Bridge injects Round 1 system prompt → session configured
  → Browser starts mic capture → audio flows both ways + candidate camera althrough it will be of no use for processing, it will be only used to give a real interview feel
  → Interruption Engine runs in parallel on rolling transcript
  → Director watches for round transition triggers
  → On interview end → Bridge closes OpenAI WS → signals browser
  → Browser redirects to /report/[id]

/report/[id]
  → still need to work on this
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 App Router + TailwindCSS | App Router for file-based routing + API routes |
| Voice UI | Web Audio API + MediaRecorder | Mic capture, PCM16 encoding, audio playback |
| Bridge Server | Node.js + Express + `ws` | Raw WebSocket (no Socket.io — we're relaying binary audio) |
| Persistent Storage | PostgreSQL + Drizzle ORM | Interview history, final reports
| Cloud LLM (eval) | OpenAI gpt-4o-mini- | pre interview prep |
| Cloud LLM (voice) | OpenAI gpt-4o-mini-realtime | Live interview |
| Cloud LLM (eval) | OpenAI gpt-4o-mini chat | Interruption quality eval (~300ms) |
| PDF Parsing | pdf-parse | Resume extraction |
| GitHub | @octokit/rest | Architectural skeleton fetching |
| Report PDF | Puppeteer | Render report page → PDF download |

**Port Map:**
- `:3000` — Next.js
- `:3001` — Bridge Server

---

<!-- ## 4. Documentation Shards (Cross-References)

To prevent context rot, the detailed implementation logic has been sharded into the following files:

- **[SCHEMAS.md](./SCHEMAS.md)**: Single source of truth for all Redis keys, Zod schemas, Candidate Profile JSON, and Report JSON structures.
- **[PHASE_1_INGESTION.md](./PHASE_1_INGESTION.md)**: Resume parsing, GitHub skeleton fetcher, Ollama context builder, system prompt builder, API routes, and edge cases.
- **[PHASE_2_BRIDGE.md](./PHASE_2_BRIDGE.md)**: Bridge server, Director, round transitions, session state, and audio relay.
- **[PHASE_2_INTERRUPTION.md](./PHASE_2_INTERRUPTION.md)**: The heuristic Interruption Engine state machine.
- **[PHASE_3_REPORT.md](./PHASE_3_REPORT.md)**: Report generator, Ollama prompt, background worker, timeout logic.
- **[FRONTEND.md](./FRONTEND.md)**: Frontend pages, hooks, components, Web Audio pipeline, UI status states.

--- -->

## 4. Critical Edge Cases & Failure Modes

| Scenario | Handling |
|----------|---------|
| PDF has no extractable text (scanned) | Detect empty string after parse → surface error: "Your PDF appears to be a scanned image. Please upload a text-based PDF." |
| GitHub profile has 0 public repos | Proceed with resume + JD only. Note in profile: "No public repos found — project questions will be based on resume only." |
| GitHub profile is private | Same as above |
| OpenAI API key invalid/expired | Bridge server catches 401 on WS open → sends error to browser → show "Interview engine unavailable. Check API key." |
| OpenAI rate limit | 429 on WS connect → retry once after 5s → if fails, surface to user |
| Microphone permission denied | `getUserMedia` throws → show persistent banner: "Microphone access is required. Please allow it in your browser settings." |
| Candidate doesn't speak for >60s | VAD silence → bridge detects no speech events → send `{ type: 'idle_warning' }` → UI shows "Are you still there?" |
| Interview exceeds 60 minutes | Force end: bridge sends closing prompt injection + `interview_complete` event |