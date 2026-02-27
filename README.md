<div align="center">
  <img src="./public/file.svg" width="60" alt="BrainCircuit Logo" />
  <h1>InterviewIQ</h1>
  <p><strong>One interviewer. Unlimited potential.</strong></p>
</div>

<p align="center">
  <img src="./public/screenshots/landing.png" width="100%" alt="InterviewIQ Landing Page">
</p>

---

## 🚀 Overview

**InterviewIQ** is an agentic AI-powered mock interview platform designed to bridge the gap between candidate preparation and real-world interviewer expectations. Unlike static Q&A tools, InterviewIQ features an autonomous AI agent that thinks, adapts, and probes deeper based on your unique profile and real-time responses.

Build your confidence by mastering **Behavioral**, **Technical**, **System Design**, and **Coding** rounds with an AI that interviews just like a real Engineering Manager.

---

## 🎯 The Challenge: Hackathon Problem Statement

**Background:** Job seekers — especially fresh graduates and career switchers — lack access to realistic, personalized interview practice. Existing solutions are either static (pre-recorded questions) or expensive (human coaches), leaving candidates underprepared for the dynamic, unpredictable nature of real interviews.

**The Solution:** We built an agentic platform that autonomously conducts end-to-end mock interviews tailored to a candidate's target role, experience level, resume, and actual GitHub code. Our AI goes beyond scripts; it detects weak answers, probes deeper into technical trade-offs, runs real-time coding assessments, and provides a structured post-interview analytics hub.

---

## 🧠 The Agentic Workflow

InterviewIQ demonstrates sophisticated agentic behavior across the entire interview lifecycle:

- **Pre-Interview (Ingestion)**: Autonomously parses resumes and GitHub repositories to extract architectural skeletons and skill sets, generating a 100% personalized interview plan.
- **During Interview (Adaptive Voice)**: Uses the Gemini Multimodal Live API to enable low-latency, natural voice interactions. The agent listens and adapts, asking follow-up questions on technical deep-dives.
- **Coding Assessment**: Seamless split-pane code editor executing real code (via Piston API) with the agent grading quality, edge cases, and correctness.
- **Post-Interview (Intelligent Synthesis)**: A centralized Reports Hub delivering deep analytics, fit scores, and actionable feedback calibrated to exact engineering levels.

---

## ✨ Features & Walkthrough

### 1. The Command Center (Dashboard)
Upload your materials and watch the agent generate your custom interview plan. It automatically extracts your GitHub projects, evaluates your baseline fit, and creates interview presets you can reuse.

![Dashboard Preview](./public/screenshots/dashboard.png)

### 2. Live Agentic Voice Interview
Experience a seamless WebRTC connection to the Gemini Multimodal Live API. The agent reviews your specific architectural choices, probes for trade-offs, and updates the real-time transcript as you speak.

![Live Interview](./public/screenshots/interview.png)

### 3. Integrated Coding Round
Solve role-specific algorithmic and bug-fix challenges in a VS Code-quality Monaco Editor. Your code is executed in a secure sandbox, and the AI agent evaluates your solution in real-time, providing actionable feedback and a final score.

![Coding Round](./public/screenshots/coding.png)

### 4. Enterprise-Grade Reports Hub
Track your progression across multiple sessions and presets. Expand any session for a deep dive into Level Calibration, Fit Score analysis, Identified Red Flags, and Coding Round performance.

![Reports Hub](./public/screenshots/reports.png)

---

## 🛠️ Architecture & Tech Stack

Our platform spans a robust, serverless stack leveraging cutting-edge models.

### Models & LLMs
- **Resume/GitHub/JD Analysis:** Gemini 2.5 Flash (`@google/genai`)
- **Live Voice Interview:** Gemini Multimodal Live API (Direct WebSocket)
- **Code Evaluation:** Gemini 2.5 Flash

### The Stack
- **Core Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with a MongoDB-inspired design system (`mongodb-bg`, `mongodb-neon`)
- **Authentication**: [Clerk](https://clerk.com/) (GitHub & Google OAuth)
- **Database**: [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Code Execution**: [Piston API](https://github.com/engineer-man/piston)
- **Code Editor**: `@monaco-editor/react`
- **Voice UI**: Web Audio API + PCM16 Encoding

*For a detailed look at schemas, API architectures, and pipeline components, see the [`_prd/`](./_prd/) directory.*

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Neon PostgreSQL database URL
- Clerk API keys
- Gemini API keys

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

3. **Environment Setup**
   Create a `.env` file in the root:
   ```env
   DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...
   GEMINI_API_KEY=...
   NEXT_PUBLIC_GEMINI_API_KEY=...
   GITHUB_TOKEN=...
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to start your first mock interview.

---

## 📁 Project Structure

```
interviewiq/
├── app/               # Next.js App Router (Dashboard, Interview, Coding, Reports)
├── components/        # Reusable UI components (Navbar, Monaco Editor integration)
├── lib/               # Utility functions, LLM analyzers, and DB schema
├── public/            # Static assets and screenshots
├── scripts/           # Seed scripts (e.g. Question Bank)
└── _prd/              # Detailed architectural and schema documentation
```

---

## 👥 Team: Code Red

- **Rudra Agrawal** — Team Lead
- **Priyanshu Singh**
- **Arpit Gupta**
- **Deepanshu Khatri**
