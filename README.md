<div align="center">
  <h1>InterviewIQ</h1>
  <p><strong>One interviewer. Unlimited potential.</strong></p>
</div>

<p align="center">
  <img src="./public/screenshots/landing.png" width="100%" alt="InterviewIQ Landing Page">
</p>

---

## Overview

**InterviewIQ** is an agentic AI-powered mock interview platform designed to bridge the gap between candidate preparation and real-world interviewer expectations. Unlike static Q&A tools, InterviewIQ features an autonomous AI agent that thinks, adapts, and probes deeper — based on your unique profile and real-time responses.

Build confidence by mastering **Behavioral**, **Technical**, **System Design**, and **Coding** rounds with an AI that interviews just like a real Engineering Manager.

---

## The Problem

Job seekers — especially fresh graduates and career switchers — lack access to realistic, personalized interview practice. Existing solutions are either static (pre-recorded questions) or expensive (human coaches), leaving candidates underprepared for the dynamic, unpredictable nature of real interviews.

**InterviewIQ** solves this by autonomously conducting end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and actual GitHub code. The AI goes beyond scripts: it detects weak answers, probes into technical trade-offs, runs real-time coding assessments, and delivers a structured post-interview analytics report.

---

## Agentic Workflow

InterviewIQ demonstrates sophisticated agentic behavior across the entire interview lifecycle:

**Pre-Interview (Ingestion):** Autonomously parses resumes and GitHub repositories to extract architectural patterns and skill sets, generating a fully personalized interview plan.

**During Interview (Adaptive Voice):** Uses the Gemini Multimodal Live API to enable low-latency, natural voice interactions. The agent listens and adapts — asking follow-up questions and drilling into technical trade-offs in real time.

**Coding Assessment:** A seamless split-pane code editor executes real code via the Piston API, with the agent grading quality, edge case handling, and correctness.

**Post-Interview (Intelligent Synthesis):** A centralized Reports Hub delivers deep analytics, fit scores, and actionable feedback calibrated to the target engineering level.

---

## Features

### 1. Command Center (Dashboard)

Upload your resume and GitHub profile, then watch the agent generate a custom interview plan. It extracts your projects, evaluates your baseline fit, and creates reusable interview presets.

![Dashboard Preview](./public/screenshots/dashboard.png)

### 2. Live Agentic Voice Interview

Experience a seamless WebRTC connection to the Gemini Multimodal Live API. The agent reviews your specific architectural choices, probes for trade-offs, and updates a real-time transcript as you speak.

![Live Interview](./public/screenshots/interview.png)

### 3. Integrated Coding Round

Solve role-specific algorithmic and debugging challenges in a VS Code-quality Monaco Editor. Code is executed in a secure sandbox and the AI agent evaluates your solution in real time, providing actionable feedback and a final score.

![Coding Round](./public/screenshots/coding.png)

### 4. Reports Hub

Track your progression across multiple sessions and presets. Expand any session for a deep dive into Level Calibration, Fit Score analysis, Identified Red Flags, and Coding Round performance.

![Reports Hub](./public/screenshots/reports.png)

---

## Tech Stack

### Models & AI

| Component                    | Model / API                            |
| ---------------------------- | -------------------------------------- |
| Resume, GitHub & JD Analysis | Gemini 2.5 Flash (`@google/genai`)     |
| Live Voice Interview         | Gemini Multimodal Live API (WebSocket) |
| Code Evaluation              | Gemini 2.5 Flash                       |

### Stack

| Layer          | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Framework      | [Next.js 15](https://nextjs.org/) (App Router)       |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com/)           |
| Authentication | [Clerk](https://clerk.com/) (GitHub & Google OAuth)  |
| Database       | [Neon](https://neon.tech/) (Serverless PostgreSQL)   |
| ORM            | [Drizzle ORM](https://orm.drizzle.team/)             |
| Code Execution | [Piston API](https://github.com/engineer-man/piston) |
| Code Editor    | `@monaco-editor/react` (Monaco)                      |
| Voice          | Web Audio API + PCM16 Encoding                       |

For a detailed look at schemas, API architecture, and pipeline components, see the [`_prd/`](./_prd/) directory.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech/) PostgreSQL database
- [Clerk](https://clerk.com/) API keys
- [Gemini](https://ai.google.dev/) API keys
- A GitHub personal access token

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/PriyanshuSingh9/interviewiq.git
   cd interviewiq
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb"

   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...

   GEMINI_API_KEY=...
   NEXT_PUBLIC_GEMINI_API_KEY=...

   GITHUB_TOKEN=ghp_...
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to begin your first mock interview.

---

## Project Structure

```
interviewiq/
├── app/            # Next.js App Router — Dashboard, Interview, Coding, Reports pages
├── components/     # Reusable UI components (Navbar, Monaco Editor wrapper, etc.)
├── lib/            # Utility functions, LLM analyzers, Drizzle DB schema
├── public/         # Static assets and screenshots
├── scripts/        # Seed scripts (e.g. Question Bank population)
└── _prd/           # Detailed architecture and schema documentation
```

---

## Team: Code Red

| Name                 | Role      |
| -------------------- | --------- |
| **Rudra Agrawal**    | Team Lead |
| **Priyanshu Singh**  | Developer |
| **Arpit Gupta**      | Developer |
| **Deepanshu Khatri** | Developer |