'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { useForm } from 'react-hook-form';
import { useUser } from '@clerk/nextjs';
import { saveUser } from '@/app/actions/saveUser';
import { useRouter } from 'next/navigation';
import { Paperclip, Link as LinkIcon, Clipboard, Check, PlayCircle, Zap, Clock, Lock, List, Loader2, AlertCircle, ChevronDown, ChevronUp, RotateCcw, Plus, Code2 } from 'lucide-react';

export default function Dashboard() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const { register, handleSubmit, watch, reset: resetForm, setValue, formState: { errors } } = useForm({
        defaultValues: {
            role: 'Senior Backend Engineer',
            githubUrl: '',
            jobDescription: ''
        }
    });
    const [preparing, setPreparing] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [report, setReport] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [presets, setPresets] = useState([]);
    const [selectedPresetId, setSelectedPresetId] = useState(null);
    const [presetsOpen, setPresetsOpen] = useState(false);
    const [loadingPresets, setLoadingPresets] = useState(true);
    const [pickedFileName, setPickedFileName] = useState(null); // tracks newly picked file name
    const [codingRound, setCodingRound] = useState(null);
    const hiddenFileInputRef = useRef(null);

    const isReady = !!sessionId;

    // Sync Clerk user to Neon DB on first load
    useEffect(() => {
        if (isLoaded && user) {
            saveUser({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.primaryEmailAddress?.emailAddress,
            });
        }
    }, [isLoaded, user]);

    // Fetch saved presets on mount
    useEffect(() => {
        async function fetchPresets() {
            try {
                const res = await fetch('/api/presets');
                if (res.ok) {
                    const data = await res.json();
                    setPresets(data.presets || []);
                }
            } catch (err) {
                console.error('Failed to fetch presets:', err);
            } finally {
                setLoadingPresets(false);
            }
        }
        if (isLoaded && user) fetchPresets();
    }, [isLoaded, user]);

    useEffect(() => {
        if (!sessionId) {
            setCodingRound(null);
            return;
        }
        let cancelled = false;
        const loadSession = async () => {
            try {
                const res = await fetch(`/api/session/${sessionId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load session');
                if (!cancelled) {
                    setCodingRound(data.session?.codingRound || null);
                }
            } catch {
                if (!cancelled) {
                    setCodingRound(null);
                }
            }
        };
        loadSession();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const resume = watch('resume');
    const githubUrl = watch('githubUrl');

    const onSubmit = async (data) => {
        setPreparing(true);
        setApiError(null);
        setSessionId(null);
        setReport(null);
        setCodingRound(null);

        try {
            const formData = new FormData();

            if (selectedPresetId) {
                // Reusing an existing preset
                formData.append('presetId', selectedPresetId);
                // Still send resume and github if provided (for fresh analysis)
                if (data.resume?.[0]) formData.append('resume', data.resume[0]);
                formData.append('githubUrl', data.githubUrl || '');
            } else {
                // New preset — all fields required
                if (data.resume?.[0]) formData.append('resume', data.resume[0]);
                formData.append('githubUrl', data.githubUrl || '');
                formData.append('jobDescription', data.jobDescription);
                formData.append('targetRole', data.role);
            }

            const res = await fetch('/api/prepare', {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to prepare interview');
            }

            setSessionId(result.sessionId);
            setReport(result.report);

            // Refresh presets list after successful preparation
            const presetsRes = await fetch('/api/presets');
            if (presetsRes.ok) {
                const presetsData = await presetsRes.json();
                setPresets(presetsData.presets || []);
            }
        } catch (err) {
            console.error('Prepare failed:', err);
            setApiError(err.message);
        } finally {
            setPreparing(false);
        }
    };

    const selectedPreset = presets.find(p => p.id === selectedPresetId);

    return (
        <div className="min-h-screen bg-mongodb-bg text-white font-sans selection:bg-mongodb-neon selection:text-mongodb-bg flex flex-col relative pb-36">
            {/* ── Navbar (Bento Layout Style) ── */}
            <Navbar />

            {/* ── Main Content — Bento Grid ── */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8 bg-grid-pattern relative">

                {/* Page Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-serif tracking-tight text-gray-100">
                        Command Center <span className="text-mongodb-neon font-light">v3.0</span>
                    </h1>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-12 gap-6">

                    {/* ── Card 1: Your Materials (Large Left) ── */}
                    <form onSubmit={handleSubmit(onSubmit)} className="col-span-12 lg:col-span-7 bg-mongodb-card border border-gray-800 rounded-3xl p-8 flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden hover:border-gray-700 transition-colors duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-line-to-r from-transparent via-mongodb-neon/30 to-transparent" />

                        <div className="space-y-6 flex-1 flex flex-col">
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 text-mongodb-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <h3 className="text-2xl font-serif text-gray-100">Your Materials</h3>
                                </div>
                                {isReady ? (
                                    <button type="button" onClick={() => {
                                        resetForm();
                                        setSessionId(null);
                                        setReport(null);
                                        setApiError(null);
                                    }} className="text-[10px] font-mono text-mongodb-neon/50 border border-mongodb-neon/20 px-2 py-1 rounded bg-mongodb-neon/5 uppercase tracking-widest transition-colors hover:bg-mongodb-neon/10 flex items-center gap-1">
                                        <RotateCcw size={10} /> Reset
                                    </button>
                                ) : (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setPresetsOpen(!presetsOpen)}
                                            className="text-[10px] font-mono text-mongodb-neon/60 border border-mongodb-neon/20 px-2.5 py-1.5 rounded-lg bg-mongodb-neon/5 uppercase tracking-widest transition-all hover:bg-mongodb-neon/10 hover:border-mongodb-neon/40 flex items-center gap-1.5"
                                        >
                                            {selectedPresetId ? (
                                                <><RotateCcw size={10} /> Saved Preset</>
                                            ) : (
                                                <><Plus size={10} /> New Preset</>
                                            )}
                                            <ChevronDown size={10} className={`transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {presetsOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-72 bg-mongodb-card border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                {/* New preset option */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPresetId(null);
                                                        resetForm();
                                                        setPresetsOpen(false);
                                                        setReport(null);
                                                        setSessionId(null);
                                                        setPickedFileName(null);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors ${!selectedPresetId ? 'bg-mongodb-neon/10 text-mongodb-neon' : 'text-gray-300 hover:bg-gray-800'}`}
                                                >
                                                    <Plus size={14} />
                                                    <span className="font-medium">New Preset</span>
                                                </button>

                                                {presets.length > 0 && (
                                                    <div className="border-t border-gray-800">
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest px-4 py-2 block font-bold">Saved Presets</span>
                                                        {presets.map(p => (
                                                            <button
                                                                type="button"
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSelectedPresetId(p.id);
                                                                    setPresetsOpen(false);
                                                                    setPickedFileName(null);
                                                                    // Clear any previously picked resume file from the form
                                                                    setValue('resume', null);
                                                                    if (hiddenFileInputRef.current) hiddenFileInputRef.current.value = '';
                                                                    // Pre-fill GitHub URL from preset
                                                                    setValue('githubUrl', p.githubUrl || '');
                                                                    // Load the preset's latest report and session into the Interview Plan panel
                                                                    if (p.latestReport) {
                                                                        setReport(p.latestReport);
                                                                    }
                                                                    if (p.latestSessionId) {
                                                                        setSessionId(p.latestSessionId);
                                                                    }
                                                                }}
                                                                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${selectedPresetId === p.id ? 'bg-mongodb-neon/10' : 'hover:bg-gray-800'}`}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className={`text-sm font-medium ${selectedPresetId === p.id ? 'text-mongodb-neon' : 'text-gray-200'}`}>{p.targetRole}</span>
                                                                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                                        {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                                                                    {p.sessionCount} session{p.sessionCount !== 1 ? 's' : ''}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {loadingPresets && (
                                                    <div className="px-4 py-3 flex items-center gap-2 text-gray-500 text-xs">
                                                        <Loader2 size={12} className="animate-spin" /> Loading...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Material Mini-Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {/* Resume */}
                                <div className={`p-5 rounded-2xl border transition-all group ${selectedPresetId ? 'border-mongodb-neon/20 bg-mongodb-neon/5' : 'border-gray-800 bg-gray-900/40 hover:bg-gray-800/60'}`}>
                                    {/* Header row: icon + label + check */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg shrink-0 transition-colors ${selectedPresetId ? 'bg-mongodb-neon/10' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
                                            <Paperclip size={18} className={selectedPresetId ? 'text-mongodb-neon' : 'text-gray-400'} />
                                        </div>
                                        <span className={`font-medium text-sm flex-1 ${selectedPresetId ? 'text-mongodb-neon' : 'text-gray-300 group-hover:text-white transition-colors'}`}>
                                            {selectedPresetId ? 'Resume' : 'Upload Resume PDF'}
                                        </span>
                                        {((selectedPreset?.resumeName) || (resume && resume.length > 0)) && (
                                            <Check size={18} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)] shrink-0" />
                                        )}
                                    </div>
                                    {selectedPresetId ? (
                                        <>
                                            {/* Hidden real file input wired to react-hook-form */}
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                {...register('resume')}
                                                ref={(e) => {
                                                    register('resume').ref(e);
                                                    hiddenFileInputRef.current = e;
                                                }}
                                                onChange={(e) => {
                                                    register('resume').onChange(e);
                                                    const newName = e.target.files?.[0]?.name || null;
                                                    setPickedFileName(newName);
                                                    // New file picked — switch to new interview
                                                    if (newName && selectedPresetId) {
                                                        setSelectedPresetId(null);
                                                        setSessionId(null);
                                                        setReport(null);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            {/* Custom clickable row */}
                                            <button
                                                type="button"
                                                onClick={() => hiddenFileInputRef.current?.click()}
                                                className="w-full flex items-center gap-2 border-b border-gray-700/50 py-1 text-left hover:border-mongodb-neon/50 transition-colors group/file"
                                            >
                                                <span className="text-[10px] font-mono text-gray-400 truncate group-hover/file:text-gray-200 transition-colors">
                                                    📄 {pickedFileName || selectedPreset?.resumeName || 'Click to choose a file'}
                                                </span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <input type="file" accept=".pdf" {...register('resume', { required: 'Resume is required' })} className="w-full bg-transparent border-b border-gray-700 text-xs text-mongodb-neon/90 font-mono py-1 focus:outline-none focus:border-mongodb-neon placeholder-gray-600 transition-colors file:hidden" />
                                            {errors.resume && <span className="text-red-500 text-xs mt-1 block px-1">{errors.resume.message}</span>}
                                        </>
                                    )}
                                </div>

                                {/* GitHub */}
                                <div className={`p-5 rounded-2xl border transition-all group flex flex-col justify-between ${selectedPresetId ? 'border-mongodb-neon/20 bg-mongodb-neon/5' : 'border-gray-800 bg-gray-900/40 hover:bg-gray-800/60'}`}>
                                    {/* Header row: icon + label + check */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg shrink-0 transition-colors ${selectedPresetId ? 'bg-mongodb-neon/10' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
                                            <LinkIcon size={18} className={selectedPresetId ? 'text-mongodb-neon' : 'text-gray-400'} />
                                        </div>
                                        <span className={`font-medium text-sm flex-1 ${selectedPresetId ? 'text-mongodb-neon' : 'text-gray-300 group-hover:text-white transition-colors'}`}>
                                            {selectedPresetId ? 'GitHub' : 'GitHub Profile URL'}
                                        </span>
                                        {(selectedPreset?.githubUrl || githubUrl) && (
                                            <Check size={18} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)] shrink-0" />
                                        )}
                                    </div>
                                    {selectedPresetId ? (
                                        <input
                                            type="url"
                                            {...register('githubUrl')}
                                            placeholder="https://github.com/..."
                                            onChange={(e) => {
                                                register('githubUrl').onChange(e);
                                                if (selectedPresetId && e.target.value !== (selectedPreset?.githubUrl || '')) {
                                                    setSelectedPresetId(null);
                                                    setSessionId(null);
                                                    setReport(null);
                                                    setValue('resume', null);
                                                    if (hiddenFileInputRef.current) hiddenFileInputRef.current.value = '';
                                                    setPickedFileName(null);
                                                }
                                            }}
                                            className="w-full bg-transparent border-b border-gray-700/50 text-xs text-mongodb-neon/70 font-mono py-1 focus:outline-none focus:border-mongodb-neon placeholder-gray-700 transition-colors"
                                        />
                                    ) : (
                                        <>
                                            <input
                                                type="url"
                                                {...register('githubUrl', { required: 'GitHub URL is required' })}
                                                placeholder="https://github.com/..."
                                                className="w-full bg-transparent border-b border-gray-700 text-xs text-mongodb-neon/90 font-mono py-1 focus:outline-none focus:border-mongodb-neon placeholder-gray-600 transition-colors"
                                            />
                                            {errors.githubUrl && <span className="text-red-500 text-xs mt-1 block px-1">{errors.githubUrl.message}</span>}
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedPreset ? (
                                /* ── Selected Preset Info ── */
                                <div className="rounded-2xl border border-mongodb-neon/20 bg-mongodb-neon/5 p-5 space-y-3 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-mongodb-neon uppercase tracking-widest">Using Saved Preset</span>
                                        <span className="text-[10px] font-mono text-gray-500">
                                            {selectedPreset.sessionCount} previous session{selectedPreset.sessionCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-serif text-gray-100">{selectedPreset.targetRole}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            Created {new Date(selectedPreset.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        {selectedPreset.jobDescription}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Job Description (full width) */}
                                    <div className="rounded-2xl border border-dashed border-gray-800/60 bg-gray-900/20 hover:bg-gray-800/40 transition-all group overflow-hidden focus-within:border-mongodb-neon focus-within:bg-gray-800/40 focus-within:border-solid">
                                        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                            <div className="p-2 bg-gray-800/50 rounded-lg">
                                                <Clipboard size={18} className="text-gray-500 group-focus-within:text-mongodb-neon transition-colors" />
                                            </div>
                                            <span className="font-medium text-[15px] text-gray-400 group-focus-within:text-gray-300 transition-colors block">Paste Job Description</span>
                                        </div>
                                        <textarea
                                            {...register('jobDescription', { required: 'Job description is required' })}
                                            placeholder="Enter requirements, preferred qualifications..."
                                            className="w-full bg-transparent text-gray-300 px-5 pb-5 pt-1 min-h-[120px] focus:outline-none resize-y text-sm placeholder-gray-600 font-sans"
                                        />
                                        {errors.jobDescription && <span className="text-red-500 text-xs px-5 pb-3 block">{errors.jobDescription.message}</span>}
                                    </div>

                                    {/* Target Role */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-300">Target Role</label>
                                        <select
                                            {...register('role', { required: 'Role is required' })}
                                            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl text-gray-100 py-3.5 px-4 focus:outline-none focus:ring-1 focus:ring-mongodb-neon focus:border-mongodb-neon transition-all cursor-pointer hover:border-gray-700 hover:bg-gray-800/50"
                                        >
                                            <option className="bg-gray-900 text-gray-100">Senior Backend Engineer</option>
                                            <option className="bg-gray-900 text-gray-100">Frontend Developer</option>
                                            <option className="bg-gray-900 text-gray-100">Full-Stack Engineer</option>
                                            <option className="bg-gray-900 text-gray-100">DevOps Engineer</option>
                                        </select>
                                        {errors.role && <span className="text-red-500 text-xs mt-1 block px-1">{errors.role.message}</span>}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Error Message */}
                        {apiError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {apiError}
                            </div>
                        )}

                        {/* Prepare Button */}
                        <div className="pt-8 flex justify-end">
                            <button
                                type="submit"
                                disabled={preparing}
                                className={`flex items-center gap-2 font-semibold py-3 px-6 rounded-2xl transition-colors ${preparing
                                    ? 'bg-mongodb-neon/50 text-[#001D29]/70 cursor-wait'
                                    : 'bg-mongodb-neon text-[#001D29] hover:bg-[#68d167]'
                                    }`}
                            >
                                {preparing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Analyzing...
                                    </>
                                ) : isReady ? (
                                    <>
                                        <Check size={18} />
                                        Re-prepare
                                    </>
                                ) : (
                                    <>
                                        Prepare Interview Plan
                                        <Zap size={18} className="fill-transparent stroke-[#001D29] stroke-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* ── Card 2: Interview Plan (Right) ── */}
                    <div className="col-span-12 lg:col-span-5 bg-mongodb-card border border-gray-800 rounded-3xl p-8 flex flex-col min-h-[500px] shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <List className="w-6 h-6 text-mongodb-neon" />
                            <h3 className="text-2xl font-serif text-gray-100">Interview Plan</h3>
                        </div>

                        {/* Loading state */}
                        {preparing && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                <Loader2 size={32} className="text-mongodb-neon animate-spin" />
                                <div className="text-center">
                                    <p className="text-gray-300 font-medium">Analyzing your profile...</p>
                                    <p className="text-gray-500 text-xs mt-1">Parsing resume, analyzing GitHub, generating report</p>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!preparing && !report && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
                                <Zap size={28} className="text-gray-700" />
                                <p className="text-sm text-center">Submit your materials to generate a personalized interview plan</p>
                            </div>
                        )}

                        {/* Report data */}
                        {!preparing && report && report.interviewPlan && (
                            <>
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    {/* Fit score */}
                                    {report.fitAnalysis && (() => {
                                        const score = report.fitAnalysis.fitScore;
                                        const scoreColor = score >= 75 ? 'text-mongodb-neon' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
                                        const borderColor = score >= 75 ? 'border-mongodb-neon/20' : score >= 50 ? 'border-yellow-400/20' : 'border-red-400/20';
                                        const bgColor = score >= 75 ? 'bg-mongodb-neon/5' : score >= 50 ? 'bg-yellow-400/5' : 'bg-red-400/5';
                                        const glowColor = score >= 75 ? 'shadow-[0_0_15px_rgba(0,237,100,0.1)]' : score >= 50 ? 'shadow-[0_0_15px_rgba(250,204,21,0.1)]' : 'shadow-[0_0_15px_rgba(248,113,113,0.1)]';
                                        return (
                                            <div className={`p-4 rounded-xl bg-gray-900/30 border ${borderColor} ${bgColor} ${glowColor} transition-all`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-gray-100">Fit Score</span>
                                                    <span className={`${scoreColor} font-mono font-bold text-lg`}>{score}/100</span>
                                                </div>
                                                <p className="text-gray-400 text-xs">{report.fitAnalysis.fitReasoning}</p>
                                            </div>
                                        );
                                    })()}

                                    {/* Interview rounds */}
                                    {report.interviewPlan.rounds?.map((round, i) => (
                                        <div key={i} className={`flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border ${i === 0 ? 'border-mongodb-neon/20' : 'border-gray-800'}`}>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${i === 0 ? 'border-mongodb-neon' : 'border-gray-800'}`}>
                                                <span className={`text-[10px] font-bold ${i === 0 ? 'text-mongodb-neon' : 'text-gray-500'}`}>{i + 1}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-gray-100 font-bold text-sm">{round.name}</h4>
                                                <p className="text-gray-500 text-xs mt-1">Focus: {round.focus}</p>
                                            </div>
                                            <span className={`text-[10px] font-mono ${i === 0 ? 'text-mongodb-neon' : 'text-gray-500'}`}>{round.durationMinutes} MIN</span>
                                        </div>
                                    ))}

                                    {/* Weakest area */}
                                    {report.interviewPlan.weakestAreaToProbe && (
                                        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                                            <span className="text-[10px] font-bold text-yellow-400 uppercase">Weakest Area to Probe</span>
                                            <p className="text-gray-300 text-xs mt-1">{report.interviewPlan.weakestAreaToProbe}</p>
                                        </div>
                                    )}

                                </div>

                                {/* Level calibration footer */}
                                {report.levelCalibration && (
                                    <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-500 uppercase">Applied</span>
                                            <span className="text-xs font-semibold text-gray-300">{report.levelCalibration.appliedLevel}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-500 uppercase">Evidence</span>
                                            <span className="text-xs font-semibold text-mongodb-neon">{report.levelCalibration.evidenceLevel}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Full Analysis Section (Below Bento Grid) ── */}
                {!preparing && report && (
                    <div id="full-analysis" className="bg-mongodb-card border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-mongodb-neon/20 to-transparent" />

                        <div className="mb-6">
                            <h3 className="text-2xl font-serif text-gray-100">Full Analysis</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Candidate Summary */}
                                {report.candidateSummary && (
                                    <div className="p-5 rounded-xl bg-gray-900/30 border border-gray-800 space-y-3">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Candidate Summary</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-serif text-gray-100">{report.candidateSummary.name}</span>
                                            {report.candidateSummary.currentRole && (
                                                <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{report.candidateSummary.currentRole}</span>
                                            )}
                                        </div>
                                        {report.candidateSummary.yearsExperience && (
                                            <p className="text-xs text-gray-400">{report.candidateSummary.yearsExperience} experience</p>
                                        )}
                                        {report.candidateSummary.educationHighlight && (
                                            <p className="text-xs text-gray-500">{report.candidateSummary.educationHighlight}</p>
                                        )}
                                        {report.candidateSummary.topSkills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {report.candidateSummary.topSkills.map((skill, i) => (
                                                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon border border-mongodb-neon/20">{skill}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Skill Breakdown */}
                                {report.fitAnalysis && (
                                    <div className="p-5 rounded-xl bg-gray-900/30 border border-gray-800 space-y-4">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Skill Breakdown</span>
                                        {report.fitAnalysis.matchedSkills?.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-mongodb-neon uppercase block mb-2">Matched</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {report.fitAnalysis.matchedSkills.map((s, i) => (
                                                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {report.fitAnalysis.missingSkills?.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-yellow-400 uppercase block mb-2">Gaps</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {report.fitAnalysis.missingSkills.map((s, i) => (
                                                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {report.fitAnalysis.redFlags?.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-red-400 uppercase block mb-2">Red Flags</span>
                                                <ul className="space-y-1.5">
                                                    {report.fitAnalysis.redFlags.map((f, i) => (
                                                        <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                                                            <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
                                                            {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Level Calibration */}
                                {report.levelCalibration?.calibrationNotes && (
                                    <div className="p-5 rounded-xl bg-gray-900/30 border border-gray-800 space-y-3">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Level Calibration</span>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-500 uppercase">Applied</span>
                                                <span className="text-xs font-semibold text-gray-300">{report.levelCalibration.appliedLevel}</span>
                                            </div>
                                            <div className="w-px h-4 bg-gray-700" />
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-500 uppercase">Evidence</span>
                                                <span className="text-xs font-semibold text-mongodb-neon">{report.levelCalibration.evidenceLevel}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">{report.levelCalibration.calibrationNotes}</p>
                                    </div>
                                )}
                                {/* GitHub Assessment */}
                                {report.githubAssessment && (
                                    <div className="p-5 rounded-xl bg-gray-900/30 border border-gray-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">GitHub Assessment</span>
                                            {report.githubAssessment.overallComplexity && (
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${report.githubAssessment.overallComplexity === 'production-grade' ? 'bg-mongodb-neon/10 text-mongodb-neon' :
                                                    report.githubAssessment.overallComplexity === 'real-tool' ? 'bg-yellow-400/10 text-yellow-400' :
                                                        'bg-gray-700 text-gray-400'
                                                    }`}>{report.githubAssessment.overallComplexity}</span>
                                            )}
                                        </div>

                                        {report.githubAssessment.repos?.map((repo, i) => (
                                            <div key={i} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800/60 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-200">{repo.name}</span>
                                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${repo.complexityRating === 'production-grade' ? 'bg-mongodb-neon/10 text-mongodb-neon' :
                                                        repo.complexityRating === 'real-tool' ? 'bg-yellow-400/10 text-yellow-400' :
                                                            'bg-gray-800 text-gray-500'
                                                        }`}>{repo.complexityRating}</span>
                                                </div>
                                                {repo.architecturalObservations && (
                                                    <p className="text-xs text-gray-400 leading-relaxed">{repo.architecturalObservations}</p>
                                                )}

                                            </div>
                                        ))}

                                        {/* Infrastructure signals */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {report.githubAssessment.hasTests && (
                                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">✓ Tests</span>
                                            )}
                                            {report.githubAssessment.hasInfraTooling && (
                                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-mongodb-neon/10 text-mongodb-neon">✓ Infra</span>
                                            )}
                                            {report.githubAssessment.infrastructureSignals?.map((sig, i) => (
                                                <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{sig}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}


                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* ── Floating Action Bar (Asymmetric Layout Footer Style) ── */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-mongodb-bg/95 backdrop-blur-lg border-t border-gray-800 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">



                    <button
                        disabled={!isReady || preparing}
                        onClick={() => {
                            if (isReady) {
                                router.push(`/interview/${sessionId}`);
                            }
                        }}
                        className={`w-full md:w-[55%] lg:w-[40%] font-semibold py-2.5 px-5 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 
                            ${isReady
                                ? 'bg-mongodb-neon text-[#001D29] cursor-pointer hover:bg-[#68d167] hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-mongodb-card border border-gray-800 text-gray-500 cursor-not-allowed hover:border-gray-700'
                            }`}
                    >
                        <div className="flex-1 text-left pl-1">
                            <span className="text-base block leading-tight">Start Interview</span>
                            <span className={`block text-[10px] font-normal uppercase tracking-widest font-mono transition-colors mt-0.5 ${isReady ? 'text-[#001D29]/70' : 'text-gray-600'}`}>
                                {preparing ? 'Preparing...' : isReady ? 'Systems Initialized' : 'Requires Prepared Plan'}
                            </span>
                        </div>
                        <div className={`p-2 rounded-lg flex items-center justify-center transition-colors ${isReady ? 'bg-[#001D29]/10 text-[#001D29]' : 'bg-gray-900 border border-gray-800 text-gray-600'
                            }`}>
                            {preparing ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <PlayCircle size={20} className={isReady ? 'fill-transparent stroke-[#001D29] stroke-2' : ''} />
                            )}
                        </div>
                    </button>
                </div>
            </div>

        </div>
    );
}
