"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
    BrainCircuit,
    ChevronRight,
    Clock,
    Play,
    Send,
    CheckCircle2,
    XCircle,
    Loader2,
    Code2,
    Trophy,
    AlertCircle,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    RotateCcw,
    Sparkles,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Monaco must be loaded client-side only
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─────────────────────────────────────────
// Timer hook
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

// ─────────────────────────────────────────
// Difficulty badge
// ─────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
    const colors = {
        easy: "bg-green-500/15 text-green-400 border-green-500/30",
        medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        hard: "bg-red-500/15 text-red-400 border-red-500/30",
    };
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[difficulty] || colors.easy}`}>
            {difficulty}
        </span>
    );
}

function TypeBadge({ type }) {
    const colors = {
        dsa: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        bugfix: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    };
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[type] || colors.dsa}`}>
            {type === "dsa" ? "DSA" : "Bug Fix"}
        </span>
    );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function CodingRound({ params }) {
    const resolvedParams = use(params);
    const sessionId = resolvedParams.sessionId;
    const elapsed = useTimer();

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roundId, setRoundId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [codes, setCodes] = useState({});
    const [evaluating, setEvaluating] = useState(false);
    const [runningTests, setRunningTests] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [overallResult, setOverallResult] = useState(null);

    // Start the coding round
    useEffect(() => {
        async function startRound() {
            try {
                setLoading(true);
                const res = await fetch("/api/coding/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setRoundId(data.roundId);
                setQuestions(data.questions);
                if (data.status === "completed") setCompleted(true);

                // Initialize code for each question
                const initial = {};
                data.questions.forEach((q) => {
                    initial[q.submissionId] = q.userCode || q.starterCode || "";
                });
                setCodes(initial);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        startRound();
    }, [sessionId]);

    const activeQuestion = questions[activeIdx];

    // Update code for current question
    const handleCodeChange = useCallback(
        (value) => {
            if (!activeQuestion) return;
            setCodes((prev) => ({ ...prev, [activeQuestion.submissionId]: value }));
        },
        [activeQuestion]
    );

    // Run tests (Piston only) — placeholder, uses evaluate for now
    const handleRunTests = useCallback(async () => {
        if (!activeQuestion || runningTests) return;
        setRunningTests(true);
        try {
            const res = await fetch("/api/coding/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: activeQuestion.submissionId,
                    code: codes[activeQuestion.submissionId],
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update question with results
            setQuestions((prev) =>
                prev.map((q) =>
                    q.submissionId === activeQuestion.submissionId
                        ? { ...q, testResults: data.testResults, testsPassed: data.testsPassed, testsTotal: data.testsTotal, aiScore: data.aiScore, aiFeedback: data.aiFeedback, userCode: codes[activeQuestion.submissionId] }
                        : q
                )
            );
        } catch (err) {
            console.error("Run tests failed:", err);
        } finally {
            setRunningTests(false);
        }
    }, [activeQuestion, codes, runningTests]);

    // Submit solution (Piston + Gemini)
    const handleSubmit = useCallback(async () => {
        if (!activeQuestion || evaluating) return;
        setEvaluating(true);
        try {
            const res = await fetch("/api/coding/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: activeQuestion.submissionId,
                    code: codes[activeQuestion.submissionId],
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setQuestions((prev) =>
                prev.map((q) =>
                    q.submissionId === activeQuestion.submissionId
                        ? { ...q, testResults: data.testResults, testsPassed: data.testsPassed, testsTotal: data.testsTotal, aiScore: data.aiScore, aiFeedback: data.aiFeedback, userCode: codes[activeQuestion.submissionId] }
                        : q
                )
            );
        } catch (err) {
            console.error("Submit failed:", err);
        } finally {
            setEvaluating(false);
        }
    }, [activeQuestion, codes, evaluating]);

    // Complete the round
    const handleComplete = useCallback(async () => {
        if (!roundId || completing) return;
        setCompleting(true);
        try {
            const res = await fetch("/api/coding/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roundId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCompleted(true);
            setOverallResult(data);
        } catch (err) {
            console.error("Complete failed:", err);
        } finally {
            setCompleting(false);
        }
    }, [roundId, completing]);

    // Reset code to starter
    const handleReset = useCallback(() => {
        if (!activeQuestion) return;
        setCodes((prev) => ({ ...prev, [activeQuestion.submissionId]: activeQuestion.starterCode }));
    }, [activeQuestion]);

    const submittedCount = questions.filter((q) => q.aiScore !== null).length;
    const allSubmitted = submittedCount === questions.length && questions.length > 0;

    // ── Loading state ──
    if (loading) {
        return (
            <div className="h-screen bg-[#001E2B] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-[#00ED64] animate-spin" />
                    <p className="text-white/60 text-sm">Preparing your coding round...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen bg-[#001E2B] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-red-400 text-sm">{error}</p>
                    <Link href="/dashboard" className="text-[#00ED64] text-sm underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    // ── Completed state ──
    if (completed && overallResult) {
        return (
            <div className="h-screen bg-[#001E2B] text-white font-sans flex flex-col overflow-hidden">
                <header className="h-14 bg-[#061621] border-b border-white/5 flex items-center px-6 shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-2 text-white">
                        <BrainCircuit size={20} className="text-[#00ED64]" />
                        <span className="font-bold text-sm">InterviewIQ</span>
                    </Link>
                    <ChevronRight size={14} className="text-[#8899A6] mx-2" />
                    <span className="text-sm text-[#8899A6]">Coding Round Complete</span>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="text-center space-y-3">
                            <Trophy size={48} className="text-[#00ED64] mx-auto" />
                            <h1 className="text-2xl font-bold">Coding Round Complete!</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ED64]/10 border border-[#00ED64]/30">
                                <span className="text-3xl font-bold text-[#00ED64]">{overallResult.overallScore}</span>
                                <span className="text-[#8899A6] text-sm">/100</span>
                            </div>
                        </div>

                        {overallResult.overallFeedback && (
                            <div className="bg-[#061621] rounded-xl p-5 border border-white/5">
                                <h3 className="text-sm font-semibold text-[#00ED64] mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> AI Assessment
                                </h3>
                                <p className="text-sm text-[#E8EDF0] leading-relaxed">{overallResult.overallFeedback}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Per-Question Results</h3>
                            {overallResult.submissions?.map((s, i) => (
                                <div key={i} className="flex items-center justify-between bg-[#061621] rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-[#8899A6]">Q{s.questionNumber}</span>
                                        <span className="text-sm text-white">{questions[i]?.title || `Question ${s.questionNumber}`}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#8899A6]">{s.testsPassed}/{s.testsTotal} tests</span>
                                        <span className={`text-sm font-bold ${s.aiScore >= 70 ? "text-green-400" : s.aiScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                                            {s.aiScore}/100
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center pt-4">
                            <Link href="/dashboard" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00ED64] text-[#001E2B] font-semibold text-sm hover:bg-[#00ED64]/90 transition-all">
                                <ArrowLeft size={16} />
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#001E2B] text-white font-sans flex flex-col overflow-hidden select-none">

            {/* ── Top Bar ─────────────────────────────────── */}
            <header className="h-14 bg-[#061621] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="flex items-center gap-2 text-white">
                        <BrainCircuit size={20} className="text-[#00ED64]" />
                        <span className="font-bold text-sm tracking-tight">InterviewIQ</span>
                    </Link>
                    <ChevronRight size={14} className="text-[#8899A6]" />
                    <span className="text-sm text-[#8899A6] font-medium">Coding Round</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00ED64]/10 border border-[#00ED64]/30">
                        <Code2 size={12} className="text-[#00ED64]" />
                        <span className="text-xs font-semibold text-[#00ED64]">{submittedCount}/{questions.length} Solved</span>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-1.5 text-[#8899A6] text-sm font-mono bg-[#001E2B] px-3 py-1 rounded-md border border-white/5">
                        <Clock size={13} />
                        {elapsed}
                    </div>
                </div>
            </header>

            {/* ── Body ─────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Left: Problem Statement ────────────────── */}
                <div className="w-[420px] bg-[#061621] border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
                    {/* Question header */}
                    <div className="px-5 py-4 border-b border-white/5 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#8899A6]">Q{activeIdx + 1}/{questions.length}</span>
                            <DifficultyBadge difficulty={activeQuestion?.difficulty} />
                            <TypeBadge type={activeQuestion?.type} />
                        </div>
                        <h2 className="text-lg font-bold text-white">{activeQuestion?.title}</h2>
                    </div>

                    {/* Description */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-[#E8EDF0] leading-relaxed font-sans">
                                {activeQuestion?.description}
                            </pre>
                        </div>

                        {/* Sample I/O */}
                        {activeQuestion?.sampleIO && activeQuestion.sampleIO.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Examples</h4>
                                {activeQuestion.sampleIO.map((sample, i) => (
                                    <div key={i} className="bg-[#001E2B] rounded-lg p-3 border border-white/5 space-y-1">
                                        <div className="text-xs">
                                            <span className="text-[#8899A6]">Input: </span>
                                            <code className="text-[#00ED64]">{sample.input}</code>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-[#8899A6]">Output: </span>
                                            <code className="text-[#00ED64]">{sample.output}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI Feedback (shown after submission) */}
                        {activeQuestion?.aiFeedback && (
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-semibold text-[#00ED64] uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={12} /> AI Feedback
                                </h4>
                                <div className="bg-[#001E2B] rounded-lg p-4 border border-[#00ED64]/20 space-y-3">
                                    {/* Score */}
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-bold ${activeQuestion.aiScore >= 70 ? "text-green-400" : activeQuestion.aiScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                                            {activeQuestion.aiScore}
                                        </span>
                                        <span className="text-[#8899A6] text-sm">/100</span>
                                    </div>

                                    {/* Complexity */}
                                    {(activeQuestion.aiFeedback.timeComplexity || activeQuestion.aiFeedback.spaceComplexity) && (
                                        <div className="flex gap-3 text-xs">
                                            {activeQuestion.aiFeedback.timeComplexity && (
                                                <span className="text-[#8899A6]">Time: <code className="text-white">{activeQuestion.aiFeedback.timeComplexity}</code></span>
                                            )}
                                            {activeQuestion.aiFeedback.spaceComplexity && (
                                                <span className="text-[#8899A6]">Space: <code className="text-white">{activeQuestion.aiFeedback.spaceComplexity}</code></span>
                                            )}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    {activeQuestion.aiFeedback.summary && (
                                        <p className="text-sm text-[#E8EDF0]">{activeQuestion.aiFeedback.summary}</p>
                                    )}

                                    {/* Strengths */}
                                    {activeQuestion.aiFeedback.strengths?.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-green-400 uppercase font-semibold">Strengths</span>
                                            <ul className="mt-1 space-y-0.5">
                                                {activeQuestion.aiFeedback.strengths.map((s, i) => (
                                                    <li key={i} className="text-xs text-[#E8EDF0] flex items-start gap-1.5">
                                                        <CheckCircle2 size={11} className="text-green-400 mt-0.5 shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Issues */}
                                    {activeQuestion.aiFeedback.issues?.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-red-400 uppercase font-semibold">Issues</span>
                                            <ul className="mt-1 space-y-0.5">
                                                {activeQuestion.aiFeedback.issues.map((s, i) => (
                                                    <li key={i} className="text-xs text-[#E8EDF0] flex items-start gap-1.5">
                                                        <XCircle size={11} className="text-red-400 mt-0.5 shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Improvements */}
                                    {activeQuestion.aiFeedback.improvements?.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-yellow-400 uppercase font-semibold">Improvements</span>
                                            <ul className="mt-1 space-y-0.5">
                                                {activeQuestion.aiFeedback.improvements.map((s, i) => (
                                                    <li key={i} className="text-xs text-[#E8EDF0] flex items-start gap-1.5">
                                                        <Sparkles size={11} className="text-yellow-400 mt-0.5 shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Code Editor ──────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">

                    {/* Editor toolbar */}
                    <div className="h-10 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#8899A6] font-mono">JavaScript</span>
                        </div>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1 text-xs text-[#8899A6] hover:text-white transition-colors"
                        >
                            <RotateCcw size={12} />
                            Reset
                        </button>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language="javascript"
                            theme="vs-dark"
                            value={codes[activeQuestion?.submissionId] || ""}
                            onChange={handleCodeChange}
                            options={{
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                padding: { top: 16 },
                                lineNumbers: "on",
                                renderWhitespace: "selection",
                                tabSize: 2,
                                wordWrap: "on",
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    {/* Test Results (shown after running) */}
                    {activeQuestion?.testResults && (
                        <div className="bg-[#1e1e1e] border-t border-[#3c3c3c] px-4 py-3 max-h-40 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Test Results</span>
                                <span className={`text-xs font-mono ${activeQuestion.testsPassed === activeQuestion.testsTotal ? "text-green-400" : "text-yellow-400"}`}>
                                    {activeQuestion.testsPassed}/{activeQuestion.testsTotal} passed
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {activeQuestion.testResults.map((t, i) => (
                                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md ${t.passed ? "bg-green-500/5 border border-green-500/10" : "bg-red-500/5 border border-red-500/10"}`}>
                                        {t.passed ? <CheckCircle2 size={13} className="text-green-400 mt-0.5 shrink-0" /> : <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[#8899A6]">Test {i + 1}: </span>
                                            {!t.passed && (
                                                <span className="text-[#E8EDF0]">
                                                    Expected <code className="text-green-400">{t.expected}</code> got <code className="text-red-400">{t.actual || "error"}</code>
                                                </span>
                                            )}
                                            {t.passed && <span className="text-green-400">Passed</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="h-14 bg-[#252526] border-t border-[#3c3c3c] flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRunTests}
                                disabled={runningTests || evaluating}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {runningTests ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                                Run Tests
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={evaluating || runningTests}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00ED64] hover:bg-[#00ED64]/90 text-[#001E2B] text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {evaluating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                Submit
                            </button>
                        </div>

                        {allSubmitted && (
                            <button
                                onClick={handleComplete}
                                disabled={completing}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#00ED64] hover:bg-[#00ED64]/90 text-[#001E2B] text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,237,100,0.3)] disabled:opacity-50"
                            >
                                {completing ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
                                Complete Round
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Bottom: Question Navigator ─────────────── */}
            <div className="h-14 bg-[#061621] border-t border-white/5 flex items-center justify-center px-6 shrink-0 gap-2">
                <button
                    onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                    disabled={activeIdx === 0}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#8899A6] disabled:opacity-30 transition-all"
                >
                    <ChevronLeft size={16} />
                </button>

                {questions.map((q, idx) => {
                    const isActive = idx === activeIdx;
                    const isDone = q.aiScore !== null;
                    const allPassed = q.testsPassed === q.testsTotal && q.testsTotal > 0;

                    return (
                        <button
                            key={q.submissionId}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all
                ${isActive
                                    ? "bg-[#00ED64]/20 text-[#00ED64] border border-[#00ED64]/40 shadow-[0_0_10px_rgba(0,237,100,0.15)]"
                                    : isDone
                                        ? allPassed
                                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                        : "bg-white/5 text-[#8899A6] border border-white/5 hover:bg-white/10 hover:text-white"
                                }
              `}
                        >
                            {isDone ? (allPassed ? <CheckCircle2 size={16} /> : q.questionNumber) : q.questionNumber}
                        </button>
                    );
                })}

                <button
                    onClick={() => setActiveIdx((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={activeIdx === questions.length - 1}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#8899A6] disabled:opacity-30 transition-all"
                >
                    <ChevronRightIcon size={16} />
                </button>
            </div>
        </div>
    );
}
