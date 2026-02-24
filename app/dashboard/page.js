'use client'

import React, { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Paperclip, Link as LinkIcon, Clipboard, Check, PlayCircle, Zap, Clock, Lock, List } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [role, setRole] = useState('Senior Backend Engineer');

    return (
        <div className="min-h-screen bg-mongodb-bg text-white font-sans selection:bg-mongodb-neon selection:text-mongodb-bg flex flex-col relative pb-36">

            {/* ── Navbar (Bento Layout Style) ── */}
            <nav className="flex items-center justify-between px-10 py-4 border-b border-gray-800 bg-mongodb-bg/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 text-mongodb-neon">
                        <div className="w-8 h-8 flex items-center justify-center bg-mongodb-neon/10 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M8 9l3 3-3 3m5 0h3M4 18h16a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-gray-100 text-xl font-bold tracking-tight">InterviewIQ</h2>
                    </div>
                    <div className="hidden md:flex items-center gap-6 ml-4">
                        <Link href="/dashboard" className="text-mongodb-neon text-sm font-medium border-b-2 border-mongodb-neon pb-1">Dashboard</Link>
                        <Link href="/reports" className="text-gray-400 hover:text-gray-100 text-sm font-medium transition-colors">Reports</Link>
                        <Link href="/history" className="text-gray-400 hover:text-gray-100 text-sm font-medium transition-colors">History</Link>
                    </div>
                </div>
                <div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </nav>

            {/* ── Main Content — Bento Grid ── */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8 bg-grid-pattern relative">

                {/* Page Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-mongodb-neon">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-widest">System Online</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
                        Command Center <span className="text-mongodb-neon font-light">v3.0</span>
                    </h1>
                    <p className="text-gray-400 max-w-2xl text-lg mt-1">
                        Initialize your preparation engine. Configure target parameters and evaluate technical readiness.
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-12 gap-6">

                    {/* ── Card 1: Your Materials (Large Left) ── */}
                    <div className="col-span-12 lg:col-span-7 bg-mongodb-card border border-gray-800 rounded-3xl p-8 flex flex-col justify-between min-h-[500px] shadow-2xl relative overflow-hidden hover:border-gray-700 transition-colors duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mongodb-neon/30 to-transparent" />

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
                                <span className="text-[10px] font-mono text-mongodb-neon/50 border border-mongodb-neon/20 px-2 py-1 rounded bg-mongodb-neon/5 uppercase tracking-widest">
                                    Config-Active
                                </span>
                            </div>

                            {/* Material Mini-Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {/* Resume */}
                                <div className="p-5 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                            <Paperclip size={18} className="text-gray-400" />
                                        </div>
                                        <Check size={20} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)]" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors block">Upload Resume PDF</span>
                                    <p className="text-xs text-mongodb-neon/70 mt-2 font-mono">resume_v4.pdf</p>
                                </div>

                                {/* GitHub */}
                                <div className="p-5 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                            <LinkIcon size={18} className="text-gray-400" />
                                        </div>
                                        <Check size={20} strokeWidth={3} className="text-mongodb-neon drop-shadow-[0_0_8px_rgba(0,237,100,0.5)]" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors block">GitHub Profile URL</span>
                                    <p className="text-xs text-mongodb-neon/70 mt-2 font-mono truncate">github.com/developer</p>
                                </div>
                            </div>

                            {/* Job Description (full width) */}
                            <div className="p-5 rounded-2xl border border-dashed border-gray-800/60 bg-gray-900/20 hover:bg-gray-800/40 transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-gray-800/50 rounded-lg">
                                        <Clipboard size={18} className="text-gray-500" />
                                    </div>
                                    <div className="w-5 h-5 border-2 border-gray-700 rounded-full opacity-50" />
                                </div>
                                <span className="font-medium text-[15px] text-gray-400 group-hover:text-gray-300 transition-colors block">Paste Job Description</span>
                                <p className="text-xs text-gray-600 mt-2 font-mono">Awaiting input…</p>
                            </div>

                            {/* Target Role */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-300">Target Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl text-gray-100 py-3.5 px-4 appearance-none focus:outline-none focus:ring-1 focus:ring-mongodb-neon focus:border-mongodb-neon transition-all cursor-pointer hover:border-gray-700 hover:bg-gray-800/50"
                                >
                                    <option>Senior Backend Engineer</option>
                                    <option>Frontend Developer</option>
                                    <option>Full-Stack Engineer</option>
                                    <option>DevOps Engineer</option>
                                </select>
                            </div>
                        </div>

                        {/* Prepare Button */}
                        <div className="pt-8 flex justify-end">
                            <button
                                disabled
                                className="flex items-center gap-2 bg-gray-800/50 text-gray-500 border border-gray-700/50 font-bold py-3 px-8 rounded-xl cursor-not-allowed"
                            >
                                Prepare Interview Plan
                                <Zap size={18} className="opacity-50" />
                            </button>
                        </div>
                    </div>

                    {/* ── Card 2: Interview Plan (Right) ── */}
                    <div className="col-span-12 lg:col-span-5 bg-mongodb-card border border-gray-800 rounded-3xl p-8 flex flex-col min-h-[500px] shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <List className="w-6 h-6 text-mongodb-neon" />
                            <h3 className="text-2xl font-bold text-gray-100">Interview Plan</h3>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border border-mongodb-neon/20">
                                <div className="w-6 h-6 rounded-full border border-mongodb-neon flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="text-mongodb-neon w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-100 font-bold text-sm">System Architecture Design</h4>
                                    <p className="text-gray-500 text-xs mt-1">Focus: Distributed Caching & Sharding</p>
                                </div>
                                <span className="text-mongodb-neon text-[10px] font-mono">45 MIN</span>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                                <div className="w-6 h-6 rounded-full border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                    <Clock className="text-gray-500 w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-100 font-bold text-sm">Concurrency & Performance</h4>
                                    <p className="text-gray-500 text-xs mt-1">Focus: Go Goroutines & Mutexes</p>
                                </div>
                                <span className="text-gray-500 text-[10px] font-mono uppercase">Pending</span>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                                <div className="w-6 h-6 rounded-full border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                    <Clock className="text-gray-500 w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-100 font-bold text-sm">Behavioral: Leadership</h4>
                                    <p className="text-gray-500 text-xs mt-1">Focus: Conflict Resolution (STAR)</p>
                                </div>
                                <span className="text-gray-500 text-[10px] font-mono uppercase">Pending</span>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800 opacity-50">
                                <div className="w-6 h-6 rounded-full border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                    <Lock className="text-gray-500 w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-400 font-bold text-sm">API Security Patterns</h4>
                                    <p className="text-gray-600 text-xs mt-1">Focus: OAuth2 & JWT flows</p>
                                </div>
                                <span className="text-gray-600 text-[10px] font-mono uppercase">Locked</span>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/30 border border-gray-800 opacity-50">
                                <div className="w-6 h-6 rounded-full border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                    <Lock className="text-gray-500 w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-400 font-bold text-sm">Refactoring & Review</h4>
                                    <p className="text-gray-600 text-xs mt-1">Focus: Complex PR Feedback</p>
                                </div>
                                <span className="text-gray-600 text-[10px] font-mono uppercase">Locked</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full border-2 border-mongodb-card bg-gray-800 flex items-center justify-center text-[10px] font-medium text-white">JS</div>
                                <div className="w-8 h-8 rounded-full border-2 border-mongodb-card bg-gray-800 flex items-center justify-center text-[10px] font-medium text-white">GO</div>
                                <div className="w-8 h-8 rounded-full border-2 border-mongodb-card bg-gray-800 flex items-center justify-center text-[10px] font-medium text-white">SQL</div>
                            </div>
                            <p className="text-xs text-gray-400">3 Technical Domains Identified</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Floating Action Bar (Asymmetric Layout Footer Style) ── */}
            <div className="fixed bottom-0 left-0 w-full px-8 py-5 bg-gradient-to-t from-mongodb-bg via-mongodb-bg/95 to-transparent backdrop-blur-sm z-40">
                <div className="max-w-7xl mx-auto flex items-end justify-between gap-6">

                    {/* Status Readout */}
                    <div className="hidden md:flex flex-col gap-1 border-l-2 border-gray-800 pl-4 pb-1">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Network Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" />
                            <span className="text-gray-500 font-mono text-xs">Waiting For Inputs</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        disabled
                        className="w-full md:w-[55%] lg:w-[45%] bg-mongodb-card border border-gray-800 text-gray-500 font-semibold py-4 px-6 rounded-2xl shadow-2xl cursor-not-allowed flex items-center gap-4 hover:border-gray-700 transition-colors"
                    >
                        <div className="flex-1 text-left pl-1">
                            <span className="text-lg block">Start Interview</span>
                            <span className="block text-[11px] font-normal text-gray-600 uppercase tracking-widest font-mono mt-0.5">
                                Requires Prepared Plan
                            </span>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-gray-600 flex items-center justify-center">
                            <PlayCircle size={24} />
                        </div>
                    </button>
                </div>
            </div>

        </div>
    );
}
