# Product Requirements Document (PRD) — Root Map
## Agentic AI-Powered Mock Interview Platform
### Version 2.0 — Hybrid Architecture

---

## 1. Product Overview

**Goal:** Build an agentic AI mock interview platform targeting Software Engineering roles. The AI autonomously conducts end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and GitHub repositories.

**Key Differentiators:**
- Feels like a real interviewer — not a chatbot
- Intelligently interrupts rambling using a multi-signal heuristic engine (not a dumb timer)
- Leverages Architectural Skeleton analysis of GitHub repos to ask deep, personalized architectural trade-off questions
- Provides a timestamped, annotated technical debrief with specific moment references

**Out of Scope (for this version):**
- Multiple simultaneous users (single-session focus for hackathon)
- User authentication / persistent accounts
- Mobile browser support (desktop Chrome/Edge only)

---

## 2. Architecture Overview

### The Hybrid Model — Why Two LLMs

| Concern | Model | Reason |
|---------|-------|--------|
| Resume/GitHub/JD analysis | Ollama `qwen2.5-coder` (local) | Structured JSON output, no latency pressure, free |
| Live voice interview | OpenAI `gpt-4o-mini-realtime` (cloud) | Sub-100ms audio response, natural voice |
| Post-interview report | Ollama `qwen2.5-coder` (local) | Structured JSON output, free, not time-sensitive |
| Interruption eval (fast) | OpenAI `gpt-4o-mini` chat (cloud) | 300-500ms eval on rolling transcript, cheaper than realtime |

### The Three-Server Architecture

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
  │
  └─── (no direct connection)    Ollama (:11434)
                                  - Called by Next.js API routes only
                                  - Never exposed to browser

Shared state layer: Redis (:6379)
  context:{sessionId}       → Candidate Profile JSON
  systemprompt:{sessionId}  → Pre-built Realtime system prompt
  transcript:{sessionId}    → Rolling transcript array
  state:{sessionId}         → Live session state (round, turn count, etc.)
  report:{sessionId}        → Final report JSON
```

### Data Flow Summary

```
Upload form
  → Next.js /api/prepare
    → pdf-parse (resume text)
    → GitHub API (architectural skeletons)
    → Ollama qwen2.5-coder (candidate profile JSON)
    → systemPromptBuilder (profile → prompt strings per round)
    → Redis: save context + system prompts
  → redirect to /interview/[sessionId]

/interview/[sessionId]
  → Browser opens WebSocket to Bridge (:3001/session/[sessionId])
  → Bridge loads context from Redis
  → Bridge opens WebSocket to OpenAI Realtime API
  → Bridge injects Round 1 system prompt → session configured
  → Browser starts mic capture → audio flows both ways
  → Bridge logs transcript events to Redis every turn
  → Interruption Engine runs in parallel on rolling transcript
  → Director watches for round transition triggers
  → On interview end → Bridge closes OpenAI WS → signals browser
  → Browser redirects to /report/[sessionId]

/report/[sessionId]
  → Next.js background: fetch transcript from Redis → Ollama → report JSON
  → Save report to Redis
  → Browser polls /api/report/[id] every 2s until ready
  → Render annotated report
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 App Router + TailwindCSS | App Router for file-based routing + API routes |
| Voice UI | Web Audio API + MediaRecorder | Mic capture, PCM16 encoding, audio playback |
| Bridge Server | Node.js + Express + `ws` | Raw WebSocket (no Socket.io — we're relaying binary audio) |
| Live Session Store | Redis + ioredis | Shared between Next.js and Bridge |
| Persistent Storage | PostgreSQL + Prisma | Interview history, final reports (post-hackathon; Redis-only for hackathon MVP) |
| Local LLM | Ollama + qwen2.5-coder | Pre/post interview only |
| Cloud LLM (voice) | OpenAI gpt-4o-mini-realtime | Live interview |
| Cloud LLM (eval) | OpenAI gpt-4o-mini chat | Interruption quality eval (~300ms) |
| PDF Parsing | pdf-parse | Resume extraction |
| GitHub | @octokit/rest | Architectural skeleton fetching |
| Schema Validation | zod | All Redis payloads validated on read |
| Report PDF | Puppeteer | Render report page → PDF download |

**Port Map:**
- `:3000` — Next.js
- `:3001` — Bridge Server
- `:6379` — Redis
- `:11434` — Ollama
- (no local port) — OpenAI (cloud)

---

## 4. Documentation Shards (Cross-References)

To prevent context rot, the detailed implementation logic has been sharded into the following files:

- **[SCHEMAS.md](./SCHEMAS.md)**: Single source of truth for all Redis keys, Zod schemas, Candidate Profile JSON, and Report JSON structures.
- **[PHASE_1_INGESTION.md](./PHASE_1_INGESTION.md)**: Resume parsing, GitHub skeleton fetcher, Ollama context builder, system prompt builder, API routes, and edge cases.
- **[PHASE_2_BRIDGE.md](./PHASE_2_BRIDGE.md)**: Bridge server, Director, round transitions, session state, and audio relay.
- **[PHASE_2_INTERRUPTION.md](./PHASE_2_INTERRUPTION.md)**: The heuristic Interruption Engine state machine.
- **[PHASE_3_REPORT.md](./PHASE_3_REPORT.md)**: Report generator, Ollama prompt, background worker, timeout logic.
- **[FRONTEND.md](./FRONTEND.md)**: Frontend pages, hooks, components, Web Audio pipeline, UI status states.

---

## 5. Critical Edge Cases & Failure Modes

| Scenario | Handling |
|----------|---------|
| PDF has no extractable text (scanned) | Detect empty string after parse → surface error: "Your PDF appears to be a scanned image. Please upload a text-based PDF." |
| GitHub profile has 0 public repos | Proceed with resume + JD only. Note in profile: "No public repos found — project questions will be based on resume only." |
| GitHub profile is private | Same as above |
| Ollama not running | 503 response → "Local AI engine is not running. Start Ollama with `ollama serve` and try again." |
| OpenAI API key invalid/expired | Bridge server catches 401 on WS open → sends error to browser → show "Interview engine unavailable. Check API key." |
| OpenAI rate limit | 429 on WS connect → retry once after 5s → if fails, surface to user |
| Microphone permission denied | `getUserMedia` throws → show persistent banner: "Microphone access is required. Please allow it in your browser settings." |
| Candidate doesn't speak for >60s | VAD silence → bridge detects no speech events → send `{ type: 'idle_warning' }` → UI shows "Are you still there?" |
| Interview exceeds 30 minutes | Force end: bridge sends closing prompt injection + `interview_complete` event |
| Zod validation fails on Ollama output | Retry once with stricter prompt. On second failure: log raw output to Redis for debugging, surface generic error to user |
| Redis down at session start | Abort with clear error — cannot start interview without context. Show: "Session data unavailable. Please re-upload your materials." |

---

## 6. Environment Variables

**`nextapp/.env.local`**
```env
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
GITHUB_TOKEN=ghp_...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder
NEXT_PUBLIC_BRIDGE_URL=ws://localhost:3001
DATABASE_URL=postgresql://...   # post-hackathon
```

**`bridgeserver/.env`**
```env
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
BRIDGE_PORT=3001
NEXTJS_URL=http://localhost:3000
```

---

## 7. Development & Run Order

```bash
# 1. Start Redis
docker run -d -p 6379:6379 redis:alpine

# 2. Start Ollama + pull model
ollama serve
ollama pull qwen2.5-coder

# 3. Start Bridge Server
cd bridgeserver
npm install
node index.js

# 4. Start Next.js
cd nextapp
npm install
npm run dev

# Browser: http://localhost:3000/upload
# Requires: Chrome or Edge, microphone permission, localhost (no HTTPS needed locally)
```

---

## 8. What to Build First (Hackathon Priority Order)

1. **GitHub skeleton fetcher + Ollama context builder** — this is the core differentiator. Get it producing good JSON first.
2. **System prompt builder** — turn the JSON into per-round prompts. Test in OpenAI Playground before wiring to bridge.
3. **Bridge server + OpenAI relay** — wire up the basic audio relay, confirm voice works end-to-end before adding Director logic.
4. **Round transition Director** — add round switching on turn count. Test with a fake interview.
5. **Basic report generation** — Ollama on transcript → JSON. Get the structure right.
6. **Interruption Engine** — add last, after everything else works. It's enhancement, not foundation.
7. **Frontend polish** — voice orb, transcript panel, report page. Do this last — ugly but functional is fine for a hackathon demo.

**Minimum viable demo (if time runs short):** Items 1-4 + basic report. Skip interruption engine and frontend polish entirely. A working voice interview with round transitions and a basic text report is already impressive.