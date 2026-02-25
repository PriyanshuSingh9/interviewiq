'use client'

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useForm } from 'react-hook-form';
import { useUser } from '@clerk/nextjs';
import { saveUser } from '@/app/actions/saveUser';
import { useRouter } from 'next/navigation';
import { Paperclip, Link as LinkIcon, Clipboard, Check, PlayCircle, Zap, Clock, Lock, List, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Dashboard() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const { register, handleSubmit, watch, reset: resetForm, formState: { errors } } = useForm({
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

    const resume = watch('resume');
    const githubUrl = watch('githubUrl');

    const onSubmit = async (data) => {
        setPreparing(true);
        setApiError(null);
        setSessionId(null);
        setReport(null);

        try {
            const formData = new FormData();
            if (data.resume?.[0]) formData.append('resume', data.resume[0]);
            formData.append('githubUrl', data.githubUrl || '');
            formData.append('jobDescription', data.jobDescription);
            formData.append('targetRole', data.role);

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
        } catch (err) {
            console.error('Prepare failed:', err);
            setApiError(err.message);
        } finally {
            setPreparing(false);
        }
    };

    return (
        <div className="min-h-screen bg-mongodb-bg text-white font-sans selection:bg-mongodb-neon selection:text-mongodb-bg flex flex-col relative pb-36">
            {/* ── Navbar (Bento Layout Style) ── */}
            <Navbar />

            {/* ── Main Content — Bento Grid ── */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8 bg-grid-pattern relative">

                {/* Page Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
                        Command Center <span className="text-mongodb-neon font-light">v3.0</span>
                    </h1>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-12 gap-6">

                    {/* ── Card 1: Your Materials (Large Left) ── */}
                    <form onSubmit={handleSubmit(onSubmit)} className="col-span-12 lg:col-span-7 bg-mongodb-card border border-gray-800 rounded-3xl p-8 flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden hover:border-gray-700 transition-colors duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-line-to-r from-transparent via-mongodb-neon/30 to-transparent" />

                        <div className="space-y-6">
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 text-mongodb-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <h3 className="text-2xl font-bold text-gray-100">Your Materials</h3>
                                </div>
                                {isReady ?
                                    <span className="text-[10px] font-mono text-mongodb-neon/50 border border-mongodb-neon/20 px-2 py-1 rounded bg-mongodb-neon/5 uppercase tracking-widest transition-colors hover:bg-mongodb-neon/10">
                                        <button type="button" onClick={() => {
                                            resetForm();
                                            setSessionId(null);
                                            setReport(null);
                                            setApiError(null);
                                        }}>
                                            Reset
                                        </button>
                                    </span>
                                    :
                                    <span className="text-[10px] font-mono text-mongodb-neon/50 border border-mongodb-neon/20 px-2 py-1 rounded bg-mongodb-neon/5 uppercase tracking-widest">
                                        Config-Active
                                    </span>
                                }
                            </div>

                            {/* Material Mini-Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {/* Resume */}
                                <div className="p-5 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                            <Paperclip size={18} className="text-gray-400" />
                                        </div>
                                        {resume && resume.length > 0 ? <Check size={20} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)]" /> : null}
                                    </div>
                                    <span className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors block">Upload Resume PDF</span>
                                    <input type="file" {...register('resume', { required: 'Resume is required' })} className="w-full bg-transparent border-b border-gray-700 text-xs text-mongodb-neon/90 font-mono py-1 focus:outline-none focus:border-mongodb-neon placeholder-gray-600 transition-colors file:hidden" />
                                    {errors.resume && <span className="text-red-500 text-xs mt-1 block px-1">{errors.resume.message}</span>}
                                </div>

                                {/* GitHub */}
                                <div className="p-5 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 transition-all group flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                            <LinkIcon size={18} className="text-gray-400" />
                                        </div>
                                        {githubUrl ? <Check size={20} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)]" /> : null}
                                    </div>
                                    <label className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors block mb-1">GitHub Profile URL</label>
                                    <input
                                        type="url"
                                        {...register('githubUrl', { required: 'GitHub URL is required' })}
                                        placeholder="https://github.com/..."
                                        className="w-full bg-transparent border-b border-gray-700 text-xs text-mongodb-neon/90 font-mono py-1 focus:outline-none focus:border-mongodb-neon placeholder-gray-600 transition-colors"
                                    />
                                    {errors.githubUrl && <span className="text-red-500 text-xs mt-1 block px-1">{errors.githubUrl.message}</span>}
                                </div>
                            </div>

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
                            <h3 className="text-2xl font-bold text-gray-100">Interview Plan</h3>
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
                                    {report.fitAnalysis && (
                                        <div className="p-4 rounded-xl bg-gray-900/30 border border-mongodb-neon/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-gray-100">Fit Score</span>
                                                <span className="text-mongodb-neon font-mono font-bold text-lg">{report.fitAnalysis.fitScore}/100</span>
                                            </div>
                                            <p className="text-gray-400 text-xs">{report.fitAnalysis.fitReasoning}</p>
                                        </div>
                                    )}

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

                                    {/* Collapsible full report */}
                                    <button
                                        type="button"
                                        onClick={() => setShowReport(!showReport)}
                                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors w-full py-2"
                                    >
                                        {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {showReport ? 'Hide' : 'View'} Full Analysis
                                    </button>

                                    {showReport && (
                                        <pre className="text-[10px] text-gray-500 font-mono bg-gray-900/50 p-4 rounded-xl overflow-auto max-h-[300px] border border-gray-800">
                                            {JSON.stringify(report, null, 2)}
                                        </pre>
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
            </main>

            {/* ── Floating Action Bar (Asymmetric Layout Footer Style) ── */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-mongodb-bg/95 backdrop-blur-lg border-t border-gray-800 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

                    {/* Status Readout */}
                    <div className="hidden md:flex flex-col border-l-2 border-gray-800 pl-4">
                        <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Network Status</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isReady ? 'bg-mongodb-neon shadow-[0_0_6px_rgba(0,237,100,0.5)]' : preparing ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]' : 'bg-gray-700'}`} />
                            <span className={`${isReady ? 'text-mongodb-neon' : preparing ? 'text-yellow-500' : 'text-gray-500'} font-mono text-[11px] transition-colors`}>
                                {preparing ? 'Processing...' : isReady ? 'System Ready' : 'Waiting For Inputs'}
                            </span>
                        </div>
                    </div>

                    {/* CTA Button */}
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
