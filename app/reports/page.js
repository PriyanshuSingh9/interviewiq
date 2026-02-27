'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import {
    Loader2, Briefcase, Calendar, GitBranch, FileText, Code2,
    ChevronDown, ChevronRight, AlertCircle, ExternalLink,
    BarChart3, Users, Target, Terminal, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedPreset, setExpandedPreset] = useState(null);
    const [expandedSession, setExpandedSession] = useState(null);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [regenerateError, setRegenerateError] = useState(null);

    const fetchReports = useCallback(async () => {
        try {
            const res = await fetch('/api/reports');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPresets(data.presets || []);
            if (data.presets?.length > 0) setExpandedPreset(data.presets[0].id);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const applyReportUpdate = useCallback((sessionId, report) => {
        setPresets((prev) => prev.map((preset) => ({
            ...preset,
            sessions: preset.sessions.map((session) => (
                session.id === sessionId ? { ...session, postInterviewReport: report } : session
            )),
        })));
    }, []);

    const regenerateReport = useCallback(async (sessionId, transcript) => {
        setRegeneratingId(sessionId);
        setRegenerateError(null);
        try {
            const res = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, transcript, force: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to regenerate report');
            applyReportUpdate(sessionId, data.report);
        } catch (err) {
            setRegenerateError(err.message);
        } finally {
            setRegeneratingId(null);
        }
    }, [applyReportUpdate]);

    // Compute summary stats
    const stats = useMemo(() => {
        const totalPresets = presets.length;
        const allSessions = presets.flatMap(p => p.sessions);
        const totalSessions = allSessions.length;

        const fitScores = allSessions
            .map(s => s.preInterviewReport?.fitAnalysis?.fitScore)
            .filter(s => s != null);
        const avgFitScore = fitScores.length > 0
            ? Math.round(fitScores.reduce((a, b) => a + b, 0) / fitScores.length)
            : null;

        const codingCompleted = allSessions.filter(s => s.codingRound?.status === 'completed').length;

        return { totalPresets, totalSessions, avgFitScore, codingCompleted };
    }, [presets]);

    const togglePreset = (id) => {
        setExpandedPreset(prev => prev === id ? null : id);
        setExpandedSession(null);
    };
    const toggleSession = (id) => setExpandedSession(prev => prev === id ? null : id);

    const scoreColor = (score) => {
        if (score >= 75) return { text: 'text-mongodb-neon', bg: 'bg-mongodb-neon/10', border: 'border-mongodb-neon/20', glow: 'shadow-[0_0_20px_rgba(0,237,100,0.08)]' };
        if (score >= 50) return { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.08)]' };
        return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.08)]' };
    };

    return (
        <div className="min-h-screen bg-mongodb-bg text-white font-sans selection:bg-mongodb-neon selection:text-mongodb-bg">
            <Navbar />

            <main className="max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
                {/* ── Page Header ── */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-serif tracking-tight text-gray-100">
                            Reports <span className="text-mongodb-neon font-light">Hub</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">AI-driven candidate analytics and session breakdowns</p>
                    </div>
                </div>

                {/* ── Summary Stats Bar ── */}
                {!loading && presets.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={<Briefcase size={16} />} label="Total Presets" value={stats.totalPresets} accent="mongodb-neon" />
                        <StatCard icon={<Users size={16} />} label="Total Sessions" value={stats.totalSessions} accent="mongodb-neon" />
                        <StatCard
                            icon={<Target size={16} />}
                            label="Avg Fit Score"
                            value={stats.avgFitScore != null ? `${stats.avgFitScore}%` : '—'}
                            accent={stats.avgFitScore >= 75 ? 'mongodb-neon' : stats.avgFitScore >= 50 ? 'yellow-400' : 'red-400'}
                        />
                        <StatCard icon={<Terminal size={16} />} label="Coding Rounds" value={stats.codingCompleted} accent="purple-400" />
                    </div>
                )}

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 size={28} className="text-mongodb-neon animate-spin" />
                        <p className="text-sm text-gray-500">Loading your reports...</p>
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* ── Empty State ── */}
                {!loading && !error && presets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-mongodb-card border border-gray-800 flex items-center justify-center">
                            <BarChart3 size={24} className="text-gray-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-300 font-medium">No reports yet</p>
                            <p className="text-sm text-gray-500 mt-1">Prepare an interview on the <Link href="/dashboard" className="text-mongodb-neon hover:underline">Dashboard</Link> to see reports here.</p>
                        </div>
                    </div>
                )}

                {/* ── Active Presets ── */}
                {!loading && presets.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] pl-1">Active Presets</h2>

                        {presets.map((preset) => {
                            const isExpanded = expandedPreset === preset.id;
                            return (
                                <div key={preset.id} className="bg-mongodb-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl transition-all duration-200 hover:border-gray-700">
                                    {/* ── Preset Header ── */}
                                    <button
                                        onClick={() => togglePreset(preset.id)}
                                        className="w-full flex items-center gap-4 p-5 text-left group transition-colors hover:bg-white/[0.015]"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-mongodb-neon/10 border border-mongodb-neon/20 flex items-center justify-center shrink-0 group-hover:bg-mongodb-neon/15 transition-colors">
                                            <Briefcase size={18} className="text-mongodb-neon" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-100 truncate">{preset.targetRole}</h3>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(preset.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                                {preset.githubUrl && (
                                                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><GitBranch size={10} /> GitHub</span>
                                                )}
                                                {preset.resumeName && (
                                                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><FileText size={10} /> Resume</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 px-2.5 py-1 rounded-full shrink-0">
                                            {preset.sessions.length} session{preset.sessions.length !== 1 ? 's' : ''}
                                        </span>
                                        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* ── Sessions ── */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-800/70">
                                            {preset.sessions.length === 0 && (
                                                <div className="px-5 py-10 text-center text-gray-500 text-sm">
                                                    No sessions yet. <Link href="/dashboard" className="text-mongodb-neon hover:underline">Create one</Link>.
                                                </div>
                                            )}
                                            {preset.sessions.map((session, idx) => {
                                                const report = session.preInterviewReport;
                                                const postReport = session.postInterviewReport;
                                                const codingRound = session.codingRound;
                                                const isSessionExpanded = expandedSession === session.id;
                                                const fitScore = report?.fitAnalysis?.fitScore;
                                                const fitColors = fitScore != null ? scoreColor(fitScore) : null;
                                                const canRegenerate = postReport?.error && Array.isArray(postReport.transcript) && postReport.transcript.length > 0;

                                                return (
                                                    <div key={session.id} className={idx > 0 ? 'border-t border-gray-800/50' : ''}>
                                                        {/* Session Row */}
                                                        <button
                                                            onClick={() => toggleSession(session.id)}
                                                            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.015] transition-colors group"
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-gray-800/80 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0 group-hover:bg-gray-700 transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm text-gray-200">
                                                                    Session — {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {fitScore != null && (
                                                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${fitColors.bg} ${fitColors.text} ${fitColors.border}`}>
                                                                        Fit {fitScore}%
                                                                    </span>
                                                                )}
                                                                {codingRound?.status === 'completed' && (
                                                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20`}>
                                                                        Code {codingRound.overallScore}/100
                                                                    </span>
                                                                )}
                                                                {codingRound && codingRound.status !== 'completed' && (
                                                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                                                        In Progress
                                                                    </span>
                                                                )}
                                                                <ChevronRight size={14} className={`text-gray-600 transition-transform duration-200 ${isSessionExpanded ? 'rotate-90' : ''}`} />
                                                            </div>
                                                        </button>

                                                        {/* ── Expanded Session Detail ── */}
                                                        {isSessionExpanded && (
                                                            <div className="px-5 pb-5 pt-1">
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                                                    {/* ── Left Column ── */}
                                                                    <div className="space-y-3">
                                                                        {postReport?.error && (
                                                                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                                                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Post-Interview Report</span>
                                                                                <p className="text-xs text-red-200/80">{postReport.error}</p>
                                                                                {regenerateError && (
                                                                                    <p className="text-[11px] text-red-300/80">{regenerateError}</p>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => regenerateReport(session.id, postReport.transcript)}
                                                                                    disabled={!canRegenerate || regeneratingId === session.id}
                                                                                    className={`text-xs px-3 py-1.5 rounded-lg border ${!canRegenerate || regeneratingId === session.id ? 'border-red-500/20 text-red-300/60 cursor-not-allowed' : 'border-red-500/40 text-red-300 hover:text-red-200 hover:border-red-500/60'}`}
                                                                                >
                                                                                    {regeneratingId === session.id ? 'Regenerating...' : 'Regenerate Report'}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {postReport && !postReport.error && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-3">
                                                                                <div className="flex items-start justify-between">
                                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Post-Interview Report</span>
                                                                                    <div className="text-right">
                                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Overall</span>
                                                                                        <div className="text-xl font-mono font-bold text-mongodb-neon">{postReport.overallScore}/100</div>
                                                                                        <div className="text-[10px] text-gray-400">{postReport.overallGrade}</div>
                                                                                    </div>
                                                                                </div>
                                                                                {postReport.executiveSummary && (
                                                                                    <p className="text-[11px] text-gray-400 leading-relaxed">{postReport.executiveSummary}</p>
                                                                                )}
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {Object.entries(postReport.dimensions || {}).map(([key, value]) => (
                                                                                        <div key={key} className="p-2 rounded-lg bg-gray-900/40 border border-gray-800/60">
                                                                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</div>
                                                                                            <div className="text-xs text-gray-200 font-semibold">{value?.score}/10</div>
                                                                                            {value?.assessment && (
                                                                                                <div className="text-[10px] text-gray-500 mt-0.5">{value.assessment}</div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {postReport.strengths?.length > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Strengths</span>
                                                                                        <ul className="mt-1 space-y-1">
                                                                                            {postReport.strengths.map((item, i) => (
                                                                                                <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                                                                                                    <span className="mt-1 w-1 h-1 rounded-full bg-mongodb-neon/70" />
                                                                                                    {item}
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}
                                                                                {postReport.areasForImprovement?.length > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Areas For Improvement</span>
                                                                                        <ul className="mt-1 space-y-1">
                                                                                            {postReport.areasForImprovement.map((item, i) => (
                                                                                                <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                                                                                                    <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400/70" />
                                                                                                    {item}
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}
                                                                                {postReport.hiringRecommendation && (
                                                                                    <div className="text-[11px] text-gray-400">
                                                                                        Recommendation: <span className="text-gray-200 font-semibold">{postReport.hiringRecommendation}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {!postReport && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 text-xs text-gray-500">
                                                                                Post-interview report not generated yet
                                                                            </div>
                                                                        )}
                                                                        {/* Fit Score Hero */}
                                                                        {report?.fitAnalysis && (() => {
                                                                            const sc = scoreColor(fitScore);
                                                                            return (
                                                                                <div className={`p-5 rounded-xl border ${sc.border} ${sc.bg} ${sc.glow} transition-all`}>
                                                                                    <div className="flex items-start justify-between mb-3">
                                                                                        <div>
                                                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Fit Score</span>
                                                                                            <span className={`text-3xl font-mono font-bold ${sc.text} mt-1 block`}>
                                                                                                {fitScore}%
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className={`w-12 h-12 rounded-full border-2 ${sc.border} flex items-center justify-center`}>
                                                                                            <TrendingUp size={18} className={sc.text} />
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* Fit score bar */}
                                                                                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                                                                                        <div className={`h-full rounded-full transition-all duration-500 ${fitScore >= 75 ? 'bg-mongodb-neon' : fitScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                                                                            style={{ width: `${fitScore}%` }} />
                                                                                    </div>
                                                                                    <p className="text-xs text-gray-400 leading-relaxed">{report.fitAnalysis.fitReasoning}</p>
                                                                                </div>
                                                                            );
                                                                        })()}

                                                                        {/* Candidate Summary */}
                                                                        {report?.candidateSummary && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-2.5">
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Candidate Summary</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-semibold text-gray-100">{report.candidateSummary.name}</span>
                                                                                    {report.candidateSummary.currentRole && (
                                                                                        <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{report.candidateSummary.currentRole}</span>
                                                                                    )}
                                                                                </div>
                                                                                {report.candidateSummary.yearsExperience && (
                                                                                    <p className="text-[11px] text-gray-500">{report.candidateSummary.yearsExperience} experience</p>
                                                                                )}
                                                                                {report.candidateSummary.topSkills?.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                                        {report.candidateSummary.topSkills.map((skill, i) => (
                                                                                            <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon border border-mongodb-neon/20">{skill}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Skills Breakdown */}
                                                                        {report?.fitAnalysis && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-3">
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Skills Breakdown</span>
                                                                                {report.fitAnalysis.matchedSkills?.length > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[9px] font-bold text-mongodb-neon uppercase block mb-1.5">Matched</span>
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {report.fitAnalysis.matchedSkills.map((s, i) => (
                                                                                                <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">{s}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                {report.fitAnalysis.missingSkills?.length > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[9px] font-bold text-yellow-400 uppercase block mb-1.5">Gaps</span>
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {report.fitAnalysis.missingSkills.map((s, i) => (
                                                                                                <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">{s}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}


                                                                        {/* Red Flags */}
                                                                        {report?.fitAnalysis?.redFlags?.length > 0 && (
                                                                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                                                                                <span className="text-[9px] font-bold text-red-400 uppercase block mb-1.5">Red Flags</span>
                                                                                <ul className="space-y-1">
                                                                                    {report.fitAnalysis.redFlags.map((f, i) => (
                                                                                        <li key={i} className="text-[11px] text-red-300/80 flex items-start gap-1.5">
                                                                                            <AlertCircle size={10} className="mt-0.5 shrink-0 text-red-400" />
                                                                                            {f}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ── Right Column ── */}
                                                                    <div className="space-y-3">
                                                                        {/* Level Calibration */}
                                                                        {report?.levelCalibration && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-2">
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Level Calibration</span>
                                                                                <div className="flex items-center gap-4 text-xs">
                                                                                    <span className="text-gray-500">Applied: <span className="text-gray-200 font-semibold">{report.levelCalibration.appliedLevel}</span></span>
                                                                                    <div className="w-px h-3 bg-gray-700" />
                                                                                    <span className="text-gray-500">Evidence: <span className="text-mongodb-neon font-semibold">{report.levelCalibration.evidenceLevel}</span></span>
                                                                                </div>
                                                                                {report.levelCalibration.calibrationNotes && (
                                                                                    <p className="text-[11px] text-gray-400 leading-relaxed">{report.levelCalibration.calibrationNotes}</p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Coding Round Card */}
                                                                        {codingRound ? (
                                                                            <div className={`p-5 rounded-xl border ${codingRound.status === 'completed'
                                                                                ? 'border-purple-500/20 bg-purple-500/5 shadow-[0_0_20px_rgba(139,92,246,0.06)]'
                                                                                : 'border-yellow-400/20 bg-yellow-400/5'
                                                                                }`}>
                                                                                <div className="flex items-start justify-between mb-3">
                                                                                    <div>
                                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                                            <Code2 size={12} className="text-purple-400" /> Coding Round
                                                                                        </span>
                                                                                        {codingRound.status === 'completed' && (
                                                                                            <span className={`text-3xl font-mono font-bold mt-1 block ${codingRound.overallScore >= 70 ? 'text-purple-400' : codingRound.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                                                {codingRound.overallScore}/100
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {codingRound.status === 'completed' && (
                                                                                        <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 flex items-center justify-center">
                                                                                            <Code2 size={18} className="text-purple-400" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {codingRound.status === 'completed' && (
                                                                                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                                                                                        <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${codingRound.overallScore}%` }} />
                                                                                    </div>
                                                                                )}
                                                                                {codingRound.overallFeedback && (
                                                                                    <p className="text-xs text-gray-400 leading-relaxed">{codingRound.overallFeedback}</p>
                                                                                )}
                                                                                {codingRound.status !== 'completed' && (
                                                                                    <div className="mt-2">
                                                                                        <span className="text-xs text-yellow-400 font-mono">In Progress</span>
                                                                                        <Link href={`/coding/${session.id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-mongodb-neon hover:underline">
                                                                                            Continue <ExternalLink size={10} />
                                                                                        </Link>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/20">
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                                                                    <Code2 size={12} /> Coding Round
                                                                                </span>
                                                                                <p className="text-xs text-gray-500 mb-2">Not started yet</p>
                                                                                <Link href={`/coding/${session.id}`} className="inline-flex items-center gap-1 text-xs text-mongodb-neon hover:underline">
                                                                                    Start Coding Round <ExternalLink size={10} />
                                                                                </Link>
                                                                            </div>
                                                                        )}

                                                                        {/* GitHub Assessment */}
                                                                        {report?.githubAssessment && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-2.5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">GitHub Assessment</span>
                                                                                    {report.githubAssessment.overallComplexity && (
                                                                                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${report.githubAssessment.overallComplexity === 'production-grade' ? 'bg-mongodb-neon/10 text-mongodb-neon' : 'bg-yellow-400/10 text-yellow-400'}`}>
                                                                                            {report.githubAssessment.overallComplexity}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {report.githubAssessment.repos?.map((repo, ri) => (
                                                                                    <div key={ri} className="flex items-center justify-between py-1.5 border-b border-gray-800/40 last:border-0">
                                                                                        <span className="text-xs text-gray-300 font-medium">{repo.name}</span>
                                                                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${repo.complexityRating === 'production-grade' ? 'bg-mongodb-neon/10 text-mongodb-neon' : repo.complexityRating === 'real-tool' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-800 text-gray-500'}`}>
                                                                                            {repo.complexityRating}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                                {/* Infra signals */}
                                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                                    {report.githubAssessment.hasTests && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">✓ Tests</span>}
                                                                                    {report.githubAssessment.hasInfraTooling && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">✓ Infra</span>}
                                                                                    {report.githubAssessment.infrastructureSignals?.map((sig, i) => (
                                                                                        <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">{sig}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Interview Plan */}
                                                                        {report?.interviewPlan?.rounds && (
                                                                            <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 space-y-2.5">
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interview Plan</span>
                                                                                {report.interviewPlan.rounds.map((round, ri) => (
                                                                                    <div key={ri} className="flex items-center gap-2.5">
                                                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${ri === 0 ? 'bg-mongodb-neon/15 text-mongodb-neon border border-mongodb-neon/20' : 'bg-gray-800 text-gray-500'}`}>{ri + 1}</span>
                                                                                        <span className="text-[11px] text-gray-300 flex-1">{round.name}</span>
                                                                                        <span className="text-[9px] font-mono text-gray-600">{round.durationMinutes}m</span>
                                                                                    </div>
                                                                                ))}
                                                                                {report.interviewPlan.weakestAreaToProbe && (
                                                                                    <div className="mt-1 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                                                                                        <span className="text-[8px] font-bold text-yellow-400 uppercase">Weakest Area</span>
                                                                                        <p className="text-[10px] text-gray-400 mt-0.5">{report.interviewPlan.weakestAreaToProbe}</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Action Buttons */}
                                                                        <div className="flex gap-2 pt-1">
                                                                            <Link
                                                                                href={`/interview/${session.id}`}
                                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-mongodb-neon text-mongodb-bg text-xs font-semibold hover:bg-[#68d167] transition-all hover:scale-[1.01] active:scale-[0.99]"
                                                                            >
                                                                                Start Interview <ExternalLink size={10} />
                                                                            </Link>
                                                                            <Link
                                                                                href={`/coding/${session.id}`}
                                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-400 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                                                            >
                                                                                Coding Round <Code2 size={10} />
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

/* ── Stat Card Component ── */
function StatCard({ icon, label, value, accent }) {
    const accentMap = {
        'mongodb-neon': { bg: 'bg-mongodb-neon/10', border: 'border-mongodb-neon/20', text: 'text-mongodb-neon', hoverBg: 'group-hover:bg-mongodb-neon/15' },
        'yellow-400': { bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', text: 'text-yellow-400', hoverBg: 'group-hover:bg-yellow-400/15' },
        'red-400': { bg: 'bg-red-400/10', border: 'border-red-400/20', text: 'text-red-400', hoverBg: 'group-hover:bg-red-400/15' },
        'purple-400': { bg: 'bg-purple-400/10', border: 'border-purple-400/20', text: 'text-purple-400', hoverBg: 'group-hover:bg-purple-400/15' },
    };
    const c = accentMap[accent] || accentMap['mongodb-neon'];

    return (
        <div className="bg-mongodb-card border border-gray-800 rounded-xl p-4 flex items-center gap-3.5 hover:border-gray-700 transition-colors group">
            <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center shrink-0 ${c.text} ${c.hoverBg} transition-colors`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                <p className={`text-xl font-mono font-bold ${c.text} mt-0.5`}>{value}</p>
            </div>
        </div>
    );
}
