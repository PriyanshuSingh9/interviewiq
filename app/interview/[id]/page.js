"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Settings,
  ChevronRight,
  BrainCircuit,
  Clock,
  MonitorUp,
  Activity,
  X,
  Send,
  Star,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────
const CANDIDATE = {
  name: "Priya Sharma",
  role: "Senior Frontend Engineer",
  avatar: "PS",
  experience: "5 years",
  applyFor: "Principal Engineer – Growth Pod",
};

const TRANSCRIPT = [
  { speaker: "interviewer", text: "Thanks for joining, Priya. Can you walk me through the most challenging technical problem you've solved in the last year?", time: "00:02" },
  { speaker: "candidate", text: "Sure! At my last company we were hitting serious performance bottlenecks in our React render cycle. I profiled it with Chrome DevTools and discovered we were re-rendering an entire tree on every websocket event...", time: "00:40" },
  { speaker: "interviewer", text: "Interesting. How did you ultimately fix the rendering issue?", time: "02:10" },
  { speaker: "candidate", text: "I restructured the state to isolate volatile slices with Zustand, and wrapped the heavy components with React.memo. We also debounced the websocket updates.", time: "02:45" },
];

const EVALUATION_CRITERIA = [
  { label: "Problem Solving", score: 4, max: 5 },
  { label: "Communication", score: 3, max: 5 },
  { label: "Technical Depth", score: 4, max: 5 },
  { label: "Culture Fit", score: null, max: 5 },
];

const QUESTIONS_BANK = [
  { id: 1, category: "Behavioral", text: "Tell me about a time you led a difficult technical decision.", done: true },
  { id: 2, category: "Technical", text: "Describe your experience with state management at scale.", done: true },
  { id: 3, category: "System Design", text: "Design a real-time collaborative document editor.", done: false },
  { id: 4, category: "Technical", text: "How do you approach performance optimization in SPAs?", done: false },
  { id: 5, category: "Behavioral", text: "How do you handle disagreements with your manager?", done: false },
];

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function useTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={14}
            className={n <= value ? "text-mongodb-neon fill-mongodb-neon" : "text-[#113247]"}
          />
        </button>
      ))}
    </div>
  );
}

function CategoryBadge({ cat }) {
  const map = {
    Behavioral: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Technical: "bg-mongodb-neon/10 text-mongodb-neon border-mongodb-neon/20",
    "System Design": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[cat] ?? "bg-white/10 text-white border-white/20"}`}>
      {cat}
    </span>
  );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function InterviewRoom({ params }) {
  const elapsed = useTimer();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [activePanel, setActivePanel] = useState(null); // null | "transcript"
  const [chatMsg, setChatMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState({ "Problem Solving": 4, Communication: 3, "Technical Depth": 4, "Culture Fit": 0 });
  const [questions, setQuestions] = useState(QUESTIONS_BANK);
  const [transcript] = useState(TRANSCRIPT);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const transcriptRef = useRef(null);

  // Simulate candidate speaking toggling
  useEffect(() => {
    const id = setInterval(() => setCandidateSpeaking((v) => !v), 4000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const toggleQuestion = (id) => {
    setQuestions((qs) => qs.map((q) => q.id === id ? { ...q, done: !q.done } : q));
  };

  const doneCount = questions.filter((q) => q.done).length;

  return (
    <div className="h-screen bg-mongodb-bg text-white font-sans flex flex-col overflow-hidden select-none">

      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="h-14 bg-mongodb-card border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white">
            <BrainCircuit size={20} className="text-mongodb-neon" />
            <span className="font-bold text-sm tracking-tight">InterviewIQ</span>
          </Link>
          <ChevronRight size={14} className="text-[#8899A6]" />
          <span className="text-sm text-[#8899A6] font-medium">{CANDIDATE.applyFor}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-[#8899A6] text-sm font-mono bg-mongodb-bg px-3 py-1 rounded-md border border-white/5">
            <Clock size={13} />
            {elapsed}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Video Grid ──────────────────────────────────── */}
        <main className="flex flex-col flex-1 overflow-hidden bg-[#010d14]">

          {/* Video area – PiP layout */}
          <div className="flex-1 relative p-4">

            {/* Interviewer (You) – main full tile */}
            <div className="absolute inset-4 bg-mongodb-card rounded-2xl overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-[#001E2B] via-[#061621] to-[#0a1f2e] flex items-center justify-center">
                {camOn ? (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#113247] to-[#001E2B] flex items-center justify-center text-3xl font-bold font-serif text-white border-2 border-white/10">
                    IQ
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#8899A6]">
                    <VideoOff size={36} />
                    <span className="text-sm">Camera Off</span>
                  </div>
                )}
              </div>

              {/* You badge */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="text-sm font-semibold text-white">You</span>
                <span className="text-[10px] bg-mongodb-neon/20 text-mongodb-neon border border-mongodb-neon/30 px-2 py-0.5 rounded-full font-semibold">Interviewer</span>
              </div>

              {/* Mic muted indicator */}
              {!micOn && (
                <div className="absolute top-4 right-4 bg-red-500/90 p-1.5 rounded-full">
                  <MicOff size={12} />
                </div>
              )}
            </div>

            {/* Candidate – small PiP overlay at bottom-right */}
            <div className={`absolute bottom-8 right-8 w-56 h-36 bg-mongodb-card rounded-xl overflow-hidden border-2 transition-all duration-300 z-10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] ${candidateSpeaking ? "border-mongodb-neon shadow-[0_0_20px_rgba(0,237,100,0.25)]" : "border-white/10"}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d3d2b] via-[#001E2B] to-[#061621] flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-mongodb-neon/40 to-[#00b04a]/20 flex items-center justify-center text-lg font-bold font-serif text-white border-2 border-mongodb-neon/30">
                  {CANDIDATE.avatar}
                </div>
              </div>

              {/* Speaking indicator */}
              {candidateSpeaking && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-mongodb-bg/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-mongodb-neon/30">
                  <Activity size={9} className="text-mongodb-neon animate-pulse" />
                  <span className="text-[8px] font-semibold text-mongodb-neon uppercase tracking-wider">Speaking</span>
                </div>
              )}

              {/* Name badge */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{CANDIDATE.name}</span>
              </div>

              {/* Audio waveform bars if speaking */}
              {candidateSpeaking && (
                <div className="absolute bottom-2 right-2 flex items-end gap-0.5 h-4">
                  {[3, 6, 4, 8, 5, 3, 7].map((h, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-mongodb-neon rounded-full animate-waveform"
                      style={{
                        height: `${h * 1.5}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: "0.7s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Control Bar ─────────────────────────────────── */}
          <div className="h-20 bg-mongodb-card/80 backdrop-blur-sm border-t border-white/5 flex items-center justify-between px-8 shrink-0 relative">

            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 group ${micOn ? "bg-white/5 hover:bg-white/10 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"}`}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                <span className="text-[10px] font-medium opacity-70">{micOn ? "Mute" : "Unmute"}</span>
              </button>

              <button
                onClick={() => setCamOn((v) => !v)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${camOn ? "bg-white/5 hover:bg-white/10 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"}`}
              >
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                <span className="text-[10px] font-medium opacity-70">{camOn ? "Stop Video" : "Start Video"}</span>
              </button>

              <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8899A6] hover:text-white transition-all duration-200">
                <MonitorUp size={18} />
                <span className="text-[10px] font-medium opacity-70">Share Screen</span>
              </button>
            </div>

            {/* Center – End Interview (Perfectly Centered) */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href="/">
                <button className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <PhoneOff size={16} />
                  End Interview
                </button>
              </Link>
            </div>

            {/* Right panel toggle – Transcript only */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePanel((p) => (p === "transcript" ? null : "transcript"))}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${activePanel === "transcript" ? "bg-mongodb-neon/15 text-mongodb-neon" : "bg-white/5 hover:bg-white/10 text-[#8899A6] hover:text-white"}`}
              >
                <MessageSquare size={18} />
                <span className="text-[10px] font-medium opacity-70">Transcript</span>
              </button>
            </div>
          </div>
        </main>

        {/* ── Side Panel ──────────────────────────────────── */}
        {activePanel && (
          <aside className="w-80 bg-mongodb-card border-l border-white/5 flex flex-col shrink-0 overflow-hidden">

            {/* Panel header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
              <span className="text-sm font-semibold text-white capitalize">
                {activePanel === "transcript" && "💬 Live Transcript"}
              </span>
              <button onClick={() => setActivePanel(null)} className="text-[#8899A6] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* ── Transcript Panel ────────────────────────── */}
            {activePanel === "transcript" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div
                  ref={transcriptRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar"
                >
                  {transcript.map((item, i) => (
                    <div key={i} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        {item.speaker === "interviewer" ? (
                          <span className="text-[10px] font-bold text-[#8899A6] uppercase bg-[#113247] px-2 py-0.5 rounded">You</span>
                        ) : (
                          <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">{CANDIDATE.name.split(" ")[0]}</span>
                        )}
                        <span className="text-[10px] text-[#8899A6] font-mono">{item.time}</span>
                      </div>
                      <p className="text-sm text-[#E8EDF0] leading-relaxed">{item.text}</p>
                    </div>
                  ))}

                  {/* Live indicator */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {candidateSpeaking ? (
                        <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">{CANDIDATE.name.split(" ")[0]}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#8899A6] uppercase bg-[#113247] px-2 py-0.5 rounded">You</span>
                      )}
                      <span className="text-[10px] text-mongodb-neon animate-pulse">● Speaking</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="w-1.5 h-1.5 bg-mongodb-neon rounded-full animate-bounce" style={{ animationDelay: `${n * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </aside>
        )}
      </div>

      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .animate-waveform {
          animation: waveform 0.7s ease-in-out infinite;
        }

        /* Custom scrollbar – hidden by default, visible on hover */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 237, 100, 0.15);
          border-radius: 999px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 237, 100, 0.4);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 237, 100, 0.15) transparent;
        }
        .custom-scrollbar:hover {
          scrollbar-color: rgba(0, 237, 100, 0.4) transparent;
        }
      `}</style>
    </div>
  );
}
