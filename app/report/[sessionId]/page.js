"use client";

import React, { use, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Loader2, AlertCircle, ChevronRight } from "lucide-react";

function formatLabel(value) {
    return value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default function ReportPage({ params }) {
    const { sessionId } = use(params);
    const [report, setReport] = useState(null);
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const attemptsRef = useRef(0);

    useEffect(() => {
        try {
            if (typeof window !== "undefined") {
                const raw = window.sessionStorage.getItem(`interviewiq:transcript:${sessionId}`);
                if (raw) setTranscript(JSON.parse(raw));
            }
        } catch (err) {
            setError(err.message);
        }
    }, [sessionId]);

    const fetchReport = useCallback(async () => {
        const res = await fetch(`/api/report/${sessionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        return data;
    }, [sessionId]);

    useEffect(() => {
        let active = true;
        let timer;

        const poll = async () => {
            try {
                const data = await fetchReport();
                if (!active) return;

                // Fall back to server-provided transcript if it exists
                if (data?.transcript?.length > 0) {
                    setTranscript(data.transcript);
                }

                if (data?.report) {
                    setReport(data.report);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                if (active) setError(err.message);
            }

            attemptsRef.current += 1;
            setAttempts(attemptsRef.current);
            if (attemptsRef.current < 10 && active) {
                timer = setTimeout(poll, 2000);
            } else if (active) {
                setLoading(false);
            }
        };

        poll();
        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [fetchReport]);

    const generationStartedRef = useRef(false);

    useEffect(() => {
        if (report || !transcript || generationStartedRef.current) return;
        generationStartedRef.current = true;
        let active = true;

        const run = async () => {
            setGenerating(true);
            setError(null);
            try {
                const res = await fetch("/api/generate-report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, transcript, force: true }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to generate report");
                if (active) setReport(data.report);
            } catch (err) {
                if (active) {
                    setError(err.message);
                    generationStartedRef.current = false; // allow retry on error
                }
            } finally {
                setGenerating(false); // ALWAYS reset generating state to avoid UI getting stuck
            }
        };

        run();
        return () => {
            active = false;
        };
    }, [report, transcript, sessionId]);

    const dimensions = useMemo(() => {
        if (!report?.dimensions) return [];
        return Object.entries(report.dimensions);
    }, [report]);

    const regenerate = useCallback(async () => {
        if (!transcript || generating) return;
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch("/api/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, transcript, force: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to regenerate report");
            setReport(data.report);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    }, [sessionId, transcript, generating]);

    const showLoading = loading || generating;

    return (
        <div className="min-h-screen bg-mongodb-bg text-white">
            <Navbar />
            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                    <Link href="/reports" className="hover:text-gray-300">Reports</Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-400">Session Report</span>
                </div>

                {showLoading && (
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Loader2 size={18} className="animate-spin text-mongodb-neon" />
                        {generating ? "Generating post-interview report..." : "Loading report..."}
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {!transcript && !report && !showLoading && (
                    <div className="mt-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800 text-sm text-gray-400">
                        Transcript not found in this session. Please restart the interview or return to reports.
                    </div>
                )}

                {report && !report.error && (
                    <div className="mt-6 grid gap-4">
                        <div className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Overall Score</span>
                                    <div className="text-3xl font-mono font-bold text-mongodb-neon mt-2">{report.overallScore}/100</div>
                                    <div className="text-xs text-gray-400 mt-1">Grade {report.overallGrade}</div>
                                </div>
                                <button
                                    onClick={regenerate}
                                    disabled={!transcript || generating}
                                    className={`text-xs px-3 py-1.5 rounded-lg border ${!transcript || generating ? "border-gray-700 text-gray-500 cursor-not-allowed" : "border-gray-600 text-gray-300 hover:text-white hover:border-gray-400"}`}
                                >
                                    {generating ? "Regenerating..." : "Regenerate"}
                                </button>
                            </div>
                            {report.executiveSummary && (
                                <p className="text-sm text-gray-300 mt-4 leading-relaxed">{report.executiveSummary}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {dimensions.map(([key, value]) => (
                                <div key={key} className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{formatLabel(key)}</span>
                                    <div className="text-xl font-mono text-gray-100 mt-2">{value?.score}/10</div>
                                    {value?.assessment && (
                                        <p className="text-xs text-gray-400 mt-1">{value.assessment}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Strengths</span>
                                {report.strengths?.length ? (
                                    <ul className="mt-2 space-y-1">
                                        {report.strengths.map((item, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-mongodb-neon/80" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-xs text-gray-500 mt-2">No strengths captured</div>
                                )}
                            </div>
                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Areas For Improvement</span>
                                {report.areasForImprovement?.length ? (
                                    <ul className="mt-2 space-y-1">
                                        {report.areasForImprovement.map((item, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-xs text-gray-500 mt-2">No improvements captured</div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 text-sm text-gray-300">
                            Hiring Recommendation: <span className="text-gray-100 font-semibold">{report.hiringRecommendation}</span>
                        </div>
                    </div>
                )}

                {report?.error && (
                    <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200">
                        {report.error}
                    </div>
                )}

                {!report && !showLoading && attempts >= 10 && (
                    <div className="mt-6 p-4 rounded-xl bg-gray-900/30 border border-gray-800 text-sm text-gray-400">
                        Report generation is taking longer than expected. You can keep this page open or regenerate once the transcript is available.
                    </div>
                )}
            </main>
        </div>
    );
}
