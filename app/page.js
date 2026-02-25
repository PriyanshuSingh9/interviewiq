"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code2, BrainCircuit, Activity, BarChart } from "lucide-react";
import Link from "next/link";

import { SignedIn, SignInButton, SignUpButton, SignedOut, UserButton } from "@clerk/nextjs";

export default function LandingPage() {
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-mongodb-bg text-white selection:bg-mongodb-neon selection:text-mongodb-bg relative overflow-hidden font-sans">

      {/* Background Grid */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-50 pointer-events-none" />

      {/* Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-mongodb-neon opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mongodb-neon opacity-[0.02] blur-[100px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BrainCircuit className="text-mongodb-neon" size={28} />
            <span>InterviewIQ</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8899A6]">
            <Link href="#how-it-works" className="hover:text-white transition-colors duration-200">How it works</Link>
            <Link href="#features" className="hover:text-white transition-colors duration-200">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors duration-200">Pricing</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton>
              <button>
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="bg-mongodb-neon hover:bg-[#00c753] text-mongodb-bg px-5 py-2.5 rounded text-sm font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(0,237,100,0.3)] hover:shadow-[0_0_25px_rgba(0,237,100,0.5)]">
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">

        {/* Hero Section */}
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mongodb-neon/10 border border-mongodb-neon/20 text-mongodb-neon text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-mongodb-neon animate-pulse" />
            New: Agentic AI Interviewer
          </motion.div>

          <motion.h1 variants={fadeUpVariant} className="text-5xl md:text-7xl font-serif tracking-tight leading-[1.1] mb-6">
            One interviewer. <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-mongodb-neon to-[#00b04a]">Unlimited potential.</span>
          </motion.h1>

          <motion.p variants={fadeUpVariant} className="text-lg md:text-xl text-[#8899A6] max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Build your confidence with an AI agent that adapts, thinks, and interviews just like a real engineering manager. Master the behavioral, technical, and system design rounds.
          </motion.p>

          <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignInButton>
              <button className="w-full sm:w-auto bg-mongodb-neon hover:bg-[#00c753] text-mongodb-bg px-8 py-3.5 rounded text-lg font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(0,237,100,0.2)]">
                Try Mock Interview
              </button>
            </SignInButton>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Section (In-between Hero and Features) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          className="mt-24 max-w-5xl mx-auto"
        >
          {/* Mock Browser/Dashboard Window */}
          <div className="bg-mongodb-card border border-[#113247] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden relative">
            {/* Window Header */}
            <div className="bg-mongodb-bg border-b border-[#113247] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs font-mono text-[#8899A6] bg-mongodb-card px-3 py-1 rounded-md border border-[#113247]">
                InterviewIQ | System Design Round
              </div>
              <div className="w-14" /> {/* Spacer for centering */}
            </div>

            {/* Window Body */}
            <div className="flex flex-col md:flex-row h-100">

              {/* Left Column: Live Transcript */}
              <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-[#113247] bg-mongodb-bg/30 flex flex-col justify-end space-y-6 relative overflow-hidden">
                {/* Fade out top */}
                <div className="absolute top-0 inset-x-0 h-16 bg-linear-to-b from-mongodb-card to-transparent z-10" />

                <div className="space-y-2 relative z-0 opacity-40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded">AI Manager</span>
                    <span className="text-xs text-[#8899A6]">02:14</span>
                  </div>
                  <p className="text-sm text-[#E8EDF0] leading-relaxed">Let's move onto the system design. How would you architect a globally distributed rate limiter for our public API?</p>
                </div>

                <div className="space-y-2 relative z-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#8899A6] uppercase bg-[#113247] px-2 py-0.5 rounded">You</span>
                    <span className="text-xs text-[#8899A6]">02:28</span>
                  </div>
                  <p className="text-sm text-[#E8EDF0] leading-relaxed">I would start with a Redis cluster and use a sliding window log algorithm to track the requests...</p>
                </div>

                <div className="space-y-2 relative z-0 translate-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-mongodb-neon uppercase bg-mongodb-neon/10 px-2 py-0.5 rounded">AI Manager</span>
                    <span className="text-xs text-mongodb-neon animate-pulse">Thinking...</span>
                  </div>
                  {/* Typing indicator */}
                  <div className="flex gap-1 inset-y-0 mt-2">
                    <div className="w-1.5 h-1.5 bg-mongodb-neon rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-mongodb-neon rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-mongodb-neon rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>

              </div>

              {/* Right Column: The AI Orb */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 relative">

                {/* Progress Tracker Rings */}
                <div className="absolute top-6 right-6 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-mongodb-neon" />
                  <div className="w-2 h-2 rounded-full bg-mongodb-neon" />
                  <div className="w-2 h-2 rounded-full border border-[#113247]" />
                  <div className="w-2 h-2 rounded-full border border-[#113247]" />
                </div>

                {/* Glowing Orb Animation */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <div className="absolute inset-0 bg-mongodb-neon mix-blend-screen opacity-10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: "3s" }} />
                  <div className="absolute inset-4 bg-mongodb-neon mix-blend-screen opacity-20 rounded-full blur-xl animate-pulse" style={{ animationDuration: "2s" }} />
                  <div className="relative w-24 h-24 bg-linear-to-tr from-[#00b04a] to-mongodb-neon rounded-full shadow-[0_0_40px_rgba(0,237,100,0.6)] flex items-center justify-center">
                    {/* Inner waveform lines representing speech/processing */}
                    <div className="flex items-center gap-1 opacity-70">
                      <div className="w-1 h-3 bg-mongodb-bg rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                      <div className="w-1 h-6 bg-mongodb-bg rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                      <div className="w-1 h-4 bg-mongodb-bg rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                      <div className="w-1 h-8 bg-mongodb-bg rounded-full animate-bounce" style={{ animationDelay: "450ms", animationDuration: "0.8s" }} />
                      <div className="w-1 h-3 bg-mongodb-bg rounded-full animate-bounce" style={{ animationDelay: "600ms", animationDuration: "0.8s" }} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center space-y-2">
                  <h3 className="text-xl font-serif text-white">Alex (Engineering Manager)</h3>
                  <p className="text-sm font-sans tracking-wide text-mongodb-neon">EVALUATING SYSTEM DESIGN</p>
                </div>

              </div>
            </div>
          </div>
        </motion.div>


        {/* Features Section */}
        <div className="mt-40" id="features">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif mb-4">Interviewing, evolved.</h2>
            <p className="text-[#8899A6] text-lg max-w-2xl mx-auto">Not just LeetCode questions. We analyze your real architecture, adapt dynamically, and provide manager-level feedback.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-mongodb-card border border-[#113247] rounded-3xl p-8 hover:border-mongodb-neon/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-mongodb-bg flex items-center justify-center border border-[#113247] mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="text-mongodb-neon" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-sans">Pre-Interview Analysis</h3>
              <p className="text-[#8899A6] leading-relaxed">
                We parse your resume and GitHub repositories to extract architectural skeletons. No generic questions; every interview is tailored to your real skills.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-mongodb-card border border-[#113247] rounded-3xl p-8 hover:border-mongodb-neon/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-mongodb-bg flex items-center justify-center border border-[#113247] mb-6 group-hover:scale-110 transition-transform">
                <Activity className="text-mongodb-neon" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-sans">Dynamic Rounds</h3>
              <p className="text-[#8899A6] leading-relaxed">
                The agent listens, interrupts, and thinks. Experience realistic transitions between behavioral, technical deep-dives, and system design rounds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-mongodb-card border border-[#113247] rounded-3xl p-8 hover:border-mongodb-neon/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-mongodb-bg flex items-center justify-center border border-[#113247] mb-6 group-hover:scale-110 transition-transform">
                <BarChart className="text-mongodb-neon" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-sans">Deep-Dive Feedback</h3>
              <p className="text-[#8899A6] leading-relaxed">
                Receive an executive summary, radar charts on your communication and knowledge depth, and an actionable roadmap to fix your weak points.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-mongodb-bg py-12 relative z-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <BrainCircuit className="text-mongodb-neon" size={24} />
            <span className="font-bold">InterviewIQ</span>
          </div>
          <p className="text-[#8899A6] text-sm">© {new Date().getFullYear()} Team Code Red. Built for the Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
