# Frontend — Key Pages & Components

## 1. `/` — Landing Page
- Hero section with animated text and CTA
- Features showcase
- MongoDB-neon dark theme
- Auth via Clerk (Sign In / Sign Up)

## 2. `/dashboard` — Interview Preparation Hub

**Layout:** Single-page form + report display

**Form Inputs (react-hook-form):**
- Target Role (text input)
- Resume PDF (file upload, max 5MB)
- Job Description (textarea)
- GitHub Profile URL (text input)
- Preset Selector dropdown (reuse existing presets)

**On Submit:** POST to `/api/prepare` → generates pre-interview report → displays inline

**Report Display (Bento Grid):**
- Left column: Candidate Summary, Skills (top skills as tag pills), Fit Score hero card
- Right column: Level Calibration, GitHub Assessment (repos with complexity badges), Interview Plan (numbered rounds)

**Floating Action Bar:**
- "Start Interview" button (green, links to `/interview/[sessionId]`)
- "Start Coding Round" button (purple, links to `/coding/[sessionId]`)
- Both disabled until a session is prepared

## 3. `/interview/[id]` — Live Voice Interview Room

**Layout:** Full-screen interview experience
- Voice orb / status indicator
- Live transcript panel (scrolls in real time)
- Mic controls

**Connection Flow:**
1. Fetch ephemeral token from `/api/gemini-token`
2. Open WebSocket directly to Gemini Multimodal Live API
3. System prompt injected with pre-built candidate context
4. Audio flows bidirectionally (browser ↔ Gemini)

**Status States:** connecting → ready → candidate_speaking → interviewer_speaking → ended

## 4. `/coding/[sessionId]` — Coding Round Room

**Layout:** Split-pane view
- Left: Question panel (description, sample I/O, navigation between questions)
- Right: Monaco Editor (JavaScript, dark theme) + Run/Submit controls
- Bottom: Test results panel + AI feedback panel

**Flow:**
1. `POST /api/coding/start` → selects 3 questions based on target role
2. User writes code in Monaco Editor
3. "Run Tests" → `POST /api/coding/evaluate` → Piston executes + Gemini provides feedback
4. Navigate between questions
5. "Complete Round" → `POST /api/coding/complete` → aggregates scores

## 5. `/reports` — Reports Hub (Analytics Dashboard)

**Layout:** Analytics-style dashboard

**Summary Stats Bar (4 cards):**
- Total Presets | Total Sessions | Avg Fit Score | Coding Rounds Completed

**Main Content: Preset Accordion Cards**
- Each preset shows: role title, creation date, session count, GitHub/Resume indicators
- Expandable → shows session rows with fit score + coding score badges

**Expanded Session Detail (2-column):**
- Left: Fit Score hero (progress bar + glow), Candidate Summary, Skills Breakdown (matched/gaps), Red Flags
- Right: Level Calibration, Coding Round result (purple theme, score/100), GitHub Assessment, Interview Plan, Action Buttons

## 6. Shared Components

### `Navbar.js`
- BrainCircuit icon + "InterviewIQ" (linked to /dashboard)
- Navigation: Dashboard, Reports
- Clerk UserButton (auth)

### Design System (TailwindCSS custom theme)
| Token | Value |
|-------|-------|
| `mongodb-bg` | `#001E2B` |
| `mongodb-card` | `#061621` |
| `mongodb-neon` | `#00ED64` |
| Purple accent | `#8B5CF6` |
| Font | Inter |
| Corners | `rounded-2xl` / `rounded-3xl` |
