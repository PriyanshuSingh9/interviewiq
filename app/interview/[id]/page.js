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
  AlertTriangle,
  Code2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { GeminiLiveSession } from "@/lib/gemini-live";
import { InterruptEngine } from "@/lib/interrupt-engine";
import Editor from "@monaco-editor/react";

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
// Extract questions from the pre-interview report
// ─────────────────────────────────────────
function buildQuestionsFromReport(report) {
  if (!report?.interviewPlan?.rounds) return [];
  let id = 0;
  const questions = [];
  for (const round of report.interviewPlan.rounds) {
    const category = round.name || round.focus || "General";
    for (const q of (round.suggestedQuestions || [])) {
      id++;
      questions.push({ id, category, text: q, done: false });
    }
  }
  return questions.length > 0 ? questions : [];
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function InterviewRoom({ params }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const elapsed = useTimer();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [activePanel, setActivePanel] = useState("transcript"); // open transcript by default
  const [chatMsg, setChatMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState([]);  // live transcript from Gemini
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState("idle"); // idle | connecting | connected | live | error | disconnected
  const [mediaStream, setMediaStream] = useState(null);  // triggers Gemini connection reliably
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState(null);
  const transcriptRef = useRef(null);
  const geminiRef = useRef(null);     // GeminiLiveSession instance
  const transcriptStateRef = useRef([]);
  const endingRef = useRef(false);
  const interruptEngineRef = useRef(null); // InterruptEngine instance

  // ── Coding Round State ───────────────────────────────
  const [codingMode, setCodingMode] = useState(false);
  const [codingQuestion, setCodingQuestion] = useState("Write a function to solve the problem described by the interviewer.");
  const [codeContent, setCodeContent] = useState("// Write your solution here\n");
  const [codingTimeLeft, setCodingTimeLeft] = useState(null); // in seconds
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const timerRef = useRef(null);

  // ── Session data from API ──────────────────────────────
  const [sessionData, setSessionData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  // Derived candidate info from the pre-interview report
  const report = sessionData?.preInterviewReport;
  const candidateName = report?.candidateSummary?.name || "Candidate";
  const candidateRole = sessionData?.targetRole || report?.levelCalibration?.appliedLevel || "Software Engineer";

  // ── Fetch session data on mount ────────────────────────
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) {
          let errorMsg = "Session not found";
          try {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } catch {
            // Response wasn't JSON (e.g., Clerk redirect)
            errorMsg = res.status === 401 ? "Please sign in to access this interview" : "Session not found or invalid";
          }
          throw new Error(errorMsg);
        }
        const { session } = await res.json();
        setSessionData(session);

        // Build questions from the interview plan
        if (session.preInterviewReport) {
          const qs = buildQuestionsFromReport(session.preInterviewReport);
          setQuestions(qs);
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        setSessionError(err.message);
      } finally {
        setSessionLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  // ── Candidate webcam + mic ──────────────────────────
  const videoRef = useRef(null);      // <video> element
  const streamRef = useRef(null);     // MediaStream object
  const audioCtxRef = useRef(null);   // AudioContext for analysis
  const analyserRef = useRef(null);   // AnalyserNode
  const rafIdRef = useRef(null);      // requestAnimationFrame ID

  // Request camera + mic once session data is loaded
  useEffect(() => {
    if (sessionLoading || sessionError) return;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        setMediaStream(stream);  // state change → triggers Gemini useEffect
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // ── Set up audio analysis ──────────────────────
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function checkAudioLevel() {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          let max = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            if (dataArray[i] > max) max = dataArray[i];
          }
          const average = sum / dataArray.length;
          setCandidateSpeaking(average > 25 || max > 70);

          // Feed speaking state to interrupt engine
          if (interruptEngineRef.current) {
            interruptEngineRef.current.updateSpeakingState(average > 25 || max > 70);
          }
          rafIdRef.current = requestAnimationFrame(checkAudioLevel);
        }
        checkAudioLevel();

      } catch (err) {
        console.error("Camera/mic access denied:", err);
      }
    }
    startMedia();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setMediaStream(null);
    };
  }, [sessionLoading, sessionError]);

  // Toggle the real mic track on/off
  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      }
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

  const triggerEndInterview = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    setEndError(null);

    const transcriptSnapshot = transcriptStateRef.current;

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `interviewiq:transcript:${sessionId}`,
          JSON.stringify(transcriptSnapshot)
        );
      }
      router.push(`/report/${sessionId}`);
    } catch (err) {
      setEndError(err.message);
      endingRef.current = false;
      setEnding(false);
    } finally {
      if (geminiRef.current) {
        geminiRef.current.disconnect();
      }
    }
  }, [router, sessionId]);

  // ── Connect Gemini Live when stream is ready ────────
  useEffect(() => {
    if (!mediaStream || !sessionData) return;

    // ── Set up Interrupt Engine ──────────────────────
    const engine = new InterruptEngine({
      threshold: 8,
      minElapsedSeconds: 15,
      cooldownBase: 45,
      cooldownVariance: 15,
      checkIntervalMs: 3500,
      onInterrupt: (interruptType, prompt) => {
        console.log("[InterruptEngine] 🔴 Firing interrupt:", interruptType.type, interruptType.reason);
        if (geminiRef.current) {
          geminiRef.current.triggerInterrupt(prompt);
        }
      },
      onScoreUpdate: (data) => {
        // Debug logging — can be connected to a dev panel later
        if (data.score >= 5) {
          console.log(`[InterruptEngine] Score: ${data.score}/${data.threshold}`, data.signals);
        }
      },
    });
    interruptEngineRef.current = engine;

    const session = new GeminiLiveSession({
      stream: mediaStream,
      systemInstruction: sessionData.systemPrompt || undefined,
      onTranscript: (role, text) => {
        setTranscript((prev) => {
          let updatedText = text;
          let newTranscript;

          const last = prev[prev.length - 1];
          if (role === "ai") {
            if (last && last.role === "ai") {
              newTranscript = [
                ...prev.slice(0, -1),
                { ...last, text: last.text + updatedText },
              ];
            } else {
              newTranscript = [...prev, { role, text: updatedText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }];
            }
          } else {
            newTranscript = [...prev, { role, text: updatedText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }];
          }

          // If AI, look for <PROBLEM> tags and timers in the FULL accumulated string so far
          if (role === "ai") {
            const currentTurnText = newTranscript[newTranscript.length - 1].text;

            // Extract Written Problem (allows missing closing tag so it renders while streaming)
            if (currentTurnText.includes("<PROBLEM>")) {
              const match = currentTurnText.match(/<PROBLEM>([\s\S]*?)(?:<\/PROBLEM>|$)/);
              if (match && match[1]) {
                setCodingQuestion(match[1].trim());
              }
            }

            // Extract Time Limit automatically if mentioned
            setCodingTimeLeft((currentTimer) => {
              if (currentTimer !== null) return currentTimer; // don't override if already set

              // look for "5 minutes", "10 mins", etc.
              const timeMatch = currentTurnText.match(/(\d+)\s*(?:minutes|mins|min)/i);
              if (timeMatch && timeMatch[1]) {
                const mins = parseInt(timeMatch[1]);
                if (mins > 0 && mins < 60) {
                  return mins * 60;
                }
              }
              return null;
            });
          }

          return newTranscript;
        });
        if (role === "ai" && !endingRef.current) {
          const lower = text.toLowerCase();
          if (lower.includes("thanks for your time") || lower.includes("we'll be in touch") || lower.includes("that's everything from me")) {
            triggerEndInterview();
          }
        }
      },
      onCandidateChunk: (text) => {
        // Feed real-time transcript to the interrupt engine (unless coding)
        if (interruptEngineRef.current && !codingMode) {
          interruptEngineRef.current.feedTranscript(text);
        }
      },
      onAiSpeaking: (speaking) => {
        setAiSpeaking(speaking);
        // Tell the interrupt engine when AI is speaking (don't evaluate during AI speech)
        if (interruptEngineRef.current) {
          interruptEngineRef.current.updateAiSpeakingState(speaking);
        }
      },
      onStatusChange: (status) => setGeminiStatus(status),
      onError: (err) => console.error("[Gemini]", err),
    });

    geminiRef.current = session;
    session.connect();

    // Start the interrupt engine — default question type until we know better
    engine.start("general", "");

    return () => {
      session.disconnect();
      geminiRef.current = null;
      engine.destroy();
      interruptEngineRef.current = null;
    };
  }, [mediaStream, sessionData, triggerEndInterview]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    transcriptStateRef.current = transcript;
    // H6: Persist transcript incrementally to sessionStorage on every update
    if (typeof window !== "undefined" && transcript.length > 0) {
      try {
        window.sessionStorage.setItem(
          `interviewiq:transcript:${sessionId}`,
          JSON.stringify(transcript)
        );
      } catch (_) { /* sessionStorage full or unavailable */ }
    }
  }, [transcript, sessionId]);

  // H6: Safety net — save transcript on tab close / navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = transcriptStateRef.current;
      if (typeof window !== "undefined" && current.length > 0) {
        try {
          window.sessionStorage.setItem(
            `interviewiq:transcript:${sessionId}`,
            JSON.stringify(current)
          );
        } catch (_) { }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId]);

  // Timer countdown logic
  useEffect(() => {
    if (codingTimeLeft === null) return;

    timerRef.current = setInterval(() => {
      setCodingTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);

          // Send timing prompt to Gemini
          if (geminiRef.current) {
            console.log("[InterviewIQ] Sending coding timing prompt");
            geminiRef.current.sendContextMessage(
              `[SYSTEM MSG] The candidate's allocated time for the coding challenge has ended. 
               Check in with them — ask if they are close to finishing, if they need a hint, or if they are ready to submit.`
            );
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [codingTimeLeft]);

  // Handle Code Submission
  const handleSubmitCode = async () => {
    if (!geminiRef.current || isSubmittingCode) return;
    setIsSubmittingCode(true);

    try {
      // Create a dummy submission object in DB just to use the evaluation endpoint
      // Alternatively, we can just call piston directly or use a simplified backend route.
      // For now, we'll evaluate directly on the client to avoid needing a DB questionId,
      // and just send the raw code to Gemini for feedback.

      geminiRef.current.sendContextMessage(
        `[SYSTEM MSG] The candidate has submitted their code. 
         
         ═══ CANDIDATE CODE ═══
         ${codeContent}
         
         Please evaluate this code. Does it correctly solve the problem you gave them? 
         Discuss its time/space complexity, any bugs, or potential improvements directly with the candidate.
         Ask them to walk through their approach.`
      );

      setCodingMode(false);
      setCodingTimeLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
      setCodeContent("// Write your solution here\n");

    } catch (err) {
      console.error("Code submission error:", err);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const formatTimeLeft = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleQuestion = (id) => {
    setQuestions((qs) => qs.map((q) => q.id === id ? { ...q, done: !q.done } : q));
  };

  const doneCount = questions.filter((q) => q.done).length;

  // ── Loading / Error states ────────────────────────
  if (sessionLoading) {
    return (
      <div className="h-screen bg-mongodb-bg text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-mongodb-neon animate-spin" />
          <span className="text-sm text-[#8899A6]">Loading interview session...</span>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="h-screen bg-mongodb-bg text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertTriangle size={32} className="text-red-400" />
          <h2 className="text-lg font-semibold">Session Not Found</h2>
          <p className="text-sm text-[#8899A6]">{sessionError}</p>
          <Link href="/dashboard" className="px-4 py-2 bg-mongodb-neon text-[#001D29] rounded-lg font-semibold text-sm hover:bg-[#68d167] transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          <span className="text-sm text-[#8899A6] font-medium">{candidateRole}</span>
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

            {/* ── Integrated Coding Panel ── */}
            {codingMode && (
              <div className="absolute inset-4 bg-[#061621] rounded-2xl overflow-hidden border-2 border-mongodb-neon/40 shadow-2xl z-20 flex flex-col">

                {/* Editor Header */}
                <div className="h-14 bg-gradient-to-r from-[#001E2B] to-[#01141e] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-mongodb-neon/20 p-1.5 rounded-lg border border-mongodb-neon/30">
                      <MonitorUp size={16} className="text-mongodb-neon" />
                    </div>
                    <span className="font-semibold text-sm text-white">Interactive Coding Round</span>
                    <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono">JavaScript</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Timer */}
                    {codingTimeLeft !== null && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${codingTimeLeft < 60 ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold' : 'bg-white/5 border-white/10 text-[#8899A6]'}`}>
                        <Clock size={14} className={codingTimeLeft < 60 ? "animate-pulse" : ""} />
                        <span className="text-sm font-mono tracking-wider">{formatTimeLeft(codingTimeLeft)}</span>
                      </div>
                    )}

                    <button
                      onClick={() => setCodingMode(false)}
                      className="text-[#8899A6] hover:text-white p-1 rounded transition-colors"
                      title="Minimize Editor"
                    >
                      <X size={18} />
                    </button>

                    <button
                      onClick={handleSubmitCode}
                      disabled={isSubmittingCode}
                      className="flex items-center gap-2 bg-mongodb-neon hover:bg-[#00d050] text-[#001E2B] px-5 py-1.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingCode ? (
                        <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                      ) : (
                        "Submit Code"
                      )}
                    </button>
                  </div>
                </div>

                {/* Question Info Banner */}
                <div className="bg-[#011621] border-b border-white/5 p-6 shrink-0 flex flex-col gap-4 overflow-y-auto max-h-[40%] custom-scrollbar">
                  <div className="flex items-start gap-4">
                    <div className="text-mongodb-neon mt-1">
                      <BrainCircuit size={16} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white mb-2">Problem Statement</h3>
                      <p className="text-sm text-[#E8EDF0] leading-relaxed whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-lg border border-white/5">
                        {codingQuestion || "Listen to the AI Interviewer for the prompt. Write your solution in the editor below and click Submit when ready."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={codeContent}
                    onChange={(val) => setCodeContent(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "var(--font-mono), monospace",
                      lineHeight: 24,
                      padding: { top: 24, bottom: 24 },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      fontLigatures: true,
                      formatOnPaste: true,
                      renderLineHighlight: "all",
                    }}
                    loading={
                      <div className="flex h-full items-center justify-center text-mongodb-neon/50">
                        <Loader2 className="animate-spin" size={24} />
                      </div>
                    }
                  />
                </div>
              </div>
            )}
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
              <button
                onClick={triggerEndInterview}
                disabled={ending}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] ${ending ? "bg-red-800 text-white/70 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white"}`}
              >
                <PhoneOff size={16} />
                {ending ? "Ending..." : "End Interview"}
              </button>
            </div>

            {/* Right panel toggles */}
            <div className="flex items-center gap-2">
              {/* Coding Mode Toggle */}
              <button
                onClick={() => setCodingMode((prev) => !prev)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${codingMode ? "bg-mongodb-neon/15 text-mongodb-neon" : "bg-white/5 hover:bg-white/10 text-[#8899A6] hover:text-white"}`}
              >
                <Code2 size={18} />
                <span className="text-[10px] font-medium opacity-70">Coding</span>
              </button>

              {/* Transcript Toggle */}
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
            {endError && (
              <div className="p-3 border-b border-white/5 text-xs text-red-300 bg-red-500/10">
                {endError}
              </div>
            )}

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

                  {transcript.map((item, i) => {
                    // Clean <PROBLEM> tags out of the transcript view so it's readable
                    const displayText = item.role === "ai"
                      ? item.text.replace(/<PROBLEM>[\s\S]*?(?:<\/PROBLEM>|$)/g, "\n\n[Displaying Coding Problem on Screen...]\n\n")
                      : item.text;

                    return (
                      <div key={i} className="group">
                        <div className="flex items-center gap-2 mb-1">
                          {item.role === "ai" ? (
                            <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">AI</span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#8899A6] uppercase bg-[#113247] px-2 py-0.5 rounded">You</span>
                          )}
                          <span className="text-[10px] text-[#8899A6] font-mono">{item.time}</span>
                        </div>
                        <p className="text-sm text-[#E8EDF0] leading-relaxed">{displayText}</p>
                      </div>
                    );
                  })}

                  {/* Live speaking indicator (AI only) */}
                  {aiSpeaking && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded border border-mongodb-neon/20">AI</span>
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
