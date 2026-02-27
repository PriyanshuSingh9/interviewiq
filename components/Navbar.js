"use client"
import React from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { BrainCircuit } from 'lucide-react'

export const Navbar = () => {
    const active = usePathname()

    return (
        <nav className="flex items-center justify-between px-10 py-4 border-b border-gray-800 bg-mongodb-bg/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 text-mongodb-neon">
                    <div className="w-8 h-8 flex items-center justify-center bg-mongodb-neon/10 rounded-lg">
                        <BrainCircuit className="text-mongodb-neon" size={24} />
                    </div>
                    <h2 className="text-gray-100 text-xl font-bold tracking-tight">
                        <Link href="/dashboard">
                            InterviewIQ
                        </Link>
                    </h2>
                </div>
                <div className="hidden md:flex items-center gap-6 ml-4">
                    <Link href="/dashboard" className={`${active === '/dashboard' ? 'border-b-2 text-mongodb-neon' : 'text-gray-400 hover:text-gray-100'} text-sm font-medium pb-1`}>Dashboard</Link>
                    <Link href="/reports" className={`${active === '/reports' ? 'border-b-2 text-mongodb-neon' : 'text-gray-400 hover:text-gray-100'} text-sm font-medium pb-1`}>Reports</Link>
                </div>
            </div>
            <div className="flex items-center justify-center p-[2px] rounded-full border-2 border-[#113247] hover:border-mongodb-neon transition-all duration-300">
                <UserButton
                    appearance={{
                        variables: {
                            spacingUnit: "1.3rem"
                        }
                    }}
                />
            </div>
        </nav>
    )
}
