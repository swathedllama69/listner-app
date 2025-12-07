//
"use client"

import { LayoutDashboard, ListChecks, ShoppingCart, HandCoins, Settings, User as UserIcon, LogOut, ChevronUp } from "lucide-react"
import { Household } from "@/lib/types"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"

/* eslint-disable @next/next/no-img-element */

const navItems = [
    { value: "home", label: "Dashboard", icon: LayoutDashboard },
    { value: "wishlist", label: "Wishlists", icon: ListChecks },
    { value: "shopping", label: "Shopping List", icon: ShoppingCart },
    { value: "finance", label: "Finance", icon: HandCoins },
]

export function SidebarLayout({ children, user, household, memberCount, activeTab, setActiveTab }: {
    children: React.ReactNode,
    user: any,
    household: Household & { avatar_url?: string | null },
    memberCount: number,
    activeTab: string,
    setActiveTab: (tab: string) => void
}) {
    const { name: householdName } = household;
    const metaName = user.user_metadata?.full_name;
    const displayName = metaName ? metaName.split(' ')[0] : (user.email?.split('@')[0] || 'User');
    const userInitials = displayName.substring(0, 2).toUpperCase();
    const userAvatar = user.user_metadata?.avatar_url;

    const handleSignOut = async () => { await supabase.auth.signOut(); window.location.reload(); }

    const householdIconUrl = household.avatar_url || '/logo-icon.png';

    return (
        <div className="flex min-h-screen bg-slate-50 relative">

            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-100/40 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-100/40 rounded-full blur-[120px] opacity-60"></div>
            </div>

            {/* --- 1. DESKTOP SIDEBAR --- */}
            <aside className="hidden md:flex w-72 flex-col border-r border-white/40 bg-white/60 backdrop-blur-xl h-screen sticky top-0 z-30 shadow-sm">
                <div className="p-6 pb-2">
                    <div
                        className="mb-8 pl-1 flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => setActiveTab('home')}
                    >
                        <img src="/logo-icon.png" alt="Logo" className="w-8 h-8" />
                        <span className="text-xl font-bold text-slate-900 tracking-tight">ListNer.</span>
                    </div>

                    <div
                        className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-white/60 shadow-sm backdrop-blur-md cursor-pointer hover:bg-white/80 transition-colors"
                        onClick={() => setActiveTab('home')}
                    >
                        <img src={householdIconUrl} alt="Household" className="h-10 w-10 rounded-lg object-cover shadow-sm bg-white" />
                        <div className="overflow-hidden">
                            <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">{householdName}</h2>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5">
                    {navItems.map(item => {
                        const isActive = activeTab === item.value;
                        return (
                            <button
                                key={item.value}
                                onClick={() => setActiveTab(item.value)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out group ${isActive
                                    ? 'bg-slate-900/90 text-white shadow-lg shadow-slate-900/10 scale-[1.02] backdrop-blur-md'
                                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 active:scale-95'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-lime-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                {item.label}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-200/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/60 cursor-pointer transition-all active:scale-95 duration-200">
                                {userAvatar ? <img src={userAvatar} alt="Profile" className="h-9 w-9 rounded-full border-2 border-white shadow-sm object-cover" /> : <div className="h-9 w-9 rounded-full bg-emerald-100 border-2 border-white shadow-sm flex items-center justify-center text-emerald-700 text-xs font-bold">{userInitials}</div>}
                                <div className="flex-1 overflow-hidden text-left">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{displayName}</p>
                                    <p className="text-[10px] text-slate-400 truncate">My Account</p>
                                </div>
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mb-2 rounded-xl bg-white/90 backdrop-blur-xl border-white/40 shadow-xl" side="right">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem onClick={() => setActiveTab('settings')}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem className="text-rose-600" onClick={handleSignOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* --- 2. MAIN CONTENT --- */}
            <main className="flex-1 w-full min-w-0 pb-24 md:pb-8 relative z-10 pt-16 md:pt-0">

                {/* Mobile Header - ENHANCED VISUALS */}
                <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/40 px-4 py-3 flex justify-between items-center shadow-sm pt-[env(safe-area-inset-top)] transition-all">
                    {/* Header Background Blobs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-teal-200/30 rounded-full blur-3xl"></div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    </div>

                    <div
                        className="flex items-center gap-2.5 cursor-pointer active:opacity-70 transition-opacity"
                        onClick={() => setActiveTab('home')}
                    >
                        <img src={householdIconUrl} alt="HH" className="h-8 w-8 rounded-lg object-cover shadow-md bg-white border border-white/50" />
                        <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px]">{householdName}</h1>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger>{userAvatar ? <img src={userAvatar} alt="Profile" className="h-8 w-8 rounded-full border border-white shadow-sm object-cover" /> : <div className="h-8 w-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 text-xs font-bold">{userInitials}</div>}</DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white/90 backdrop-blur-xl border-white/40 shadow-xl">
                            <DropdownMenuItem onClick={() => setActiveTab('settings')}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-200/50" />
                            <DropdownMenuItem className="text-rose-600" onClick={handleSignOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
                    {children}
                </div>
            </main>

            {/* --- 3. MOBILE NAV - LIFTED & ENHANCED --- */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
                <div className="bg-white/80 backdrop-blur-xl border-t border-white/40 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] pb-safe">
                    {/* Added padding bottom (pb-6) to lift icons up */}
                    <div className="flex justify-around items-center h-20 pb-5 px-2 pt-2">
                        {navItems.map(item => {
                            const isActive = activeTab === item.value;
                            return (
                                <button key={item.value} onClick={() => setActiveTab(item.value)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90`}>
                                    <div className={`p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-slate-900 text-lime-400 shadow-lg shadow-slate-900/20 translate-y-[-2px]' : 'text-slate-400'}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </nav>
        </div>
    )
}