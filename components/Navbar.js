"use client"
import React from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

export const Navbar = () => {
    const active = usePathname()

    return (
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
                    <Link href="/dashboard" className={`${active === '/dashboard' ? 'border-b-2 text-mongodb-neon' : 'text-gray-400 hover:text-gray-100'} text-sm font-medium pb-1`}>Dashboard</Link>
                    <Link href="/reports" className={`${active === '/reports' ? 'border-b-2 text-mongodb-neon' : 'text-gray-400 hover:text-gray-100'} text-sm font-medium pb-1`}>Reports</Link>
                    <Link href="/history" className={`${active === '/history' ? 'border-b-2 text-mongodb-neon' : 'text-gray-400 hover:text-gray-100'} text-sm font-medium pb-1`}>History</Link>
                </div>
            </div>
            <div>
                <UserButton />
            </div>
        </nav>
    )
}
