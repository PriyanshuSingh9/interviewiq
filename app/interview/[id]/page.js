"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  ChevronRight,
  BrainCircuit,
  Clock,
  MonitorUp,
  Activity,
  X,
  Star,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { GeminiLiveSession } from "@/lib/gemini-live";

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

// Transcript is now populated live from Gemini

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
  const [activePanel, setActivePanel] = useState("transcript"); // open transcript by default
  const [chatMsg, setChatMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState({ "Problem Solving": 4, Communication: 3, "Technical Depth": 4, "Culture Fit": 0 });
  const [questions, setQuestions] = useState(QUESTIONS_BANK);
  const [transcript, setTranscript] = useState([]);  // live transcript from Gemini
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState("idle"); // idle | connecting | connected | live | error | disconnected
  const transcriptRef = useRef(null);
  const geminiRef = useRef(null);     // GeminiLiveSession instance

  // ── Candidate webcam + mic ──────────────────────────
  const videoRef = useRef(null);      // <video> element
  const streamRef = useRef(null);     // MediaStream object
  const audioCtxRef = useRef(null);   // AudioContext for analysis
  const analyserRef = useRef(null);   // AnalyserNode
  const rafIdRef = useRef(null);      // requestAnimationFrame ID

  // Request camera + mic once on mount
  useEffect(() => {
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // ── Set up audio analysis ──────────────────────
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;          // smaller = faster, less detail (good for detection)
        analyser.smoothingTimeConstant = 0.5;  // smooth out spikes
        source.connect(analyser);
        // NOTE: we do NOT connect analyser to audioCtx.destination
        // — that would play your own mic back to you (echo!)
        analyserRef.current = analyser;

        // Start the audio level polling loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function checkAudioLevel() {
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume across all frequency bins
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          // Threshold: if average > 15, the candidate is speaking
          // (typical silence is 0-5, speech is 20-80+)
          setCandidateSpeaking(average > 15);

          rafIdRef.current = requestAnimationFrame(checkAudioLevel);
        }
        checkAudioLevel();

      } catch (err) {
        console.error("Camera/mic access denied:", err);
      }
    }
    startMedia();

    // Cleanup: stop all tracks + close audio context
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle the real mic track on/off
  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      }
      // When muted, immediately stop the speaking indicator
      if (!next) setCandidateSpeaking(false);
      return next;
    });
  }, []);

  // Toggle the real camera track on/off
  const toggleCam = useCallback(() => {
    setCamOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  }, []);

  // ── Connect Gemini Live when stream is ready ────────
  useEffect(() => {
    if (!streamRef.current || geminiRef.current) return;

    const session = new GeminiLiveSession({
      stream: streamRef.current,
      onTranscript: (role, text) => {
        setTranscript((prev) => {
          // If the last entry is the same role, append text to it
          // (transcription arrives in chunks)
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + text },
            ];
          }
          // Otherwise, start a new entry
          return [...prev, { role, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }];
        });
      },
      onAiSpeaking: (speaking) => setAiSpeaking(speaking),
      onStatusChange: (status) => setGeminiStatus(status),
      onError: (err) => console.error("[Gemini]", err),
    });

    geminiRef.current = session;
    session.connect();

    return () => {
      session.disconnect();
      geminiRef.current = null;
    };
    // We intentionally only run this when the stream becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamRef.current]);

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
          {/* Gemini connection status */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${geminiStatus === "live" ? "bg-green-500/10 border-green-500/30" :
              geminiStatus === "connecting" || geminiStatus === "connected" ? "bg-yellow-500/10 border-yellow-500/30" :
                geminiStatus === "error" ? "bg-red-500/10 border-red-500/30" :
                  "bg-white/5 border-white/10"
            }`}>
            {geminiStatus === "live" ? (
              <><Wifi size={12} className="text-green-400" /><span className="text-xs font-semibold text-green-400 uppercase tracking-wider">AI Live</span></>
            ) : geminiStatus === "connecting" || geminiStatus === "connected" ? (
              <><Loader2 size={12} className="text-yellow-400 animate-spin" /><span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Connecting</span></>
            ) : geminiStatus === "error" ? (
              <><WifiOff size={12} className="text-red-400" /><span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Error</span></>
            ) : (
              <><WifiOff size={12} className="text-[#8899A6]" /><span className="text-xs font-semibold text-[#8899A6] uppercase tracking-wider">Offline</span></>
            )}
          </div>

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

            {/* AI Interviewer – main full tile */}
            <div className={`absolute inset-4 bg-mongodb-card rounded-2xl overflow-hidden border-2 transition-all duration-500 ${aiSpeaking ? "border-mongodb-neon/60 shadow-[0_0_25px_rgba(0,237,100,0.15)]" : "border-white/5"}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#001E2B] via-[#061621] to-[#0a1f2e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#113247] to-[#001E2B] flex items-center justify-center border-2 border-mongodb-neon/20">
                    <BrainCircuit size={40} className="text-mongodb-neon" />
                  </div>
                  <span className="text-sm font-semibold text-white/60">AI Interviewer</span>
                </div>
              </div>

              {/* Speaking indicator for AI */}
              {aiSpeaking && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-mongodb-bg/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-mongodb-neon/30">
                  <Activity size={11} className="text-mongodb-neon animate-pulse" />
                  <span className="text-[10px] font-semibold text-mongodb-neon uppercase tracking-wider">Speaking</span>
                </div>
              )}

              {/* Badge */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="text-sm font-semibold text-white">InterviewIQ</span>
                <span className="text-[10px] bg-mongodb-neon/20 text-mongodb-neon border border-mongodb-neon/30 px-2 py-0.5 rounded-full font-semibold">AI Interviewer</span>
              </div>

              {/* Waveform bars when AI is speaking */}
              {aiSpeaking && (
                <div className="absolute bottom-5 right-5 flex items-end gap-0.5 h-5">
                  {[3, 6, 4, 8, 5, 3, 7].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-mongodb-neon rounded-full animate-waveform"
                      style={{
                        height: `${h * 2}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: "0.7s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Candidate (You) – small PiP overlay with LIVE video */}
            <div className={`absolute bottom-8 right-8 w-56 h-40 bg-mongodb-card rounded-xl overflow-hidden border-2 transition-all duration-500 z-10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] ${!candidateSpeaking ? "border-white/10" : "border-mongodb-neon/60 shadow-[0_0_20px_rgba(0,237,100,0.2)]"}`}>
              {/* Live video feed – ALWAYS mounted so the ref persists */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${camOn ? "opacity-100" : "opacity-0"}`}
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Camera-off overlay (shown ON TOP of the hidden video) */}
              {!camOn && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d3d2b] via-[#001E2B] to-[#061621] flex items-center justify-center z-[1]">
                  <div className="flex flex-col items-center gap-2 text-[#8899A6]">
                    <VideoOff size={24} />
                    <span className="text-xs">Camera Off</span>
                  </div>
                </div>
              )}

              {/* Name badge */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent z-[2]" />
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 z-[2]">
                <span className="text-xs font-semibold text-white">You</span>
                <span className="text-[8px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">Candidate</span>
              </div>

              {/* Mic muted indicator */}
              {!micOn && (
                <div className="absolute top-2 right-2 bg-red-500/90 p-1 rounded-full z-[2]">
                  <MicOff size={10} />
                </div>
              )}
            </div>

          </div>

          {/* ── Control Bar ─────────────────────────────────── */}
          <div className="h-20 bg-mongodb-card/80 backdrop-blur-sm border-t border-white/5 flex items-center justify-between px-8 shrink-0 relative">

            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 group ${micOn ? "bg-white/5 hover:bg-white/10 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"}`}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                <span className="text-[10px] font-medium opacity-70">{micOn ? "Mute" : "Unmute"}</span>
              </button>

              <button
                onClick={toggleCam}
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
                  {transcript.length === 0 && geminiStatus !== "live" && (
                    <div className="flex flex-col items-center justify-center h-full text-[#8899A6] gap-2">
                      <Loader2 size={20} className="animate-spin text-mongodb-neon" />
                      <span className="text-xs">Connecting to AI Interviewer...</span>
                    </div>
                  )}

                  {transcript.length === 0 && geminiStatus === "live" && (
                    <div className="flex flex-col items-center justify-center h-full text-[#8899A6] gap-2">
                      <Activity size={20} className="text-mongodb-neon animate-pulse" />
                      <span className="text-xs">AI Interviewer is starting...</span>
                    </div>
                  )}

                  {transcript.map((item, i) => (
                    <div key={i} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        {item.role === "ai" ? (
                          <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">AI</span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#8899A6] uppercase bg-[#113247] px-2 py-0.5 rounded">You</span>
                        )}
                        <span className="text-[10px] text-[#8899A6] font-mono">{item.time}</span>
                      </div>
                      <p className="text-sm text-[#E8EDF0] leading-relaxed">{item.text}</p>
                    </div>
                  ))}

                  {/* Live speaking indicator */}
                  {(candidateSpeaking || aiSpeaking) && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {aiSpeaking ? (
                          <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">AI</span>
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
                  )}
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
