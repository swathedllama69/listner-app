"use client"

import { useState, FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, KeyRound, ArrowRight, Sparkles, Users, User as UserIcon } from "lucide-react"

/* eslint-disable @next/next/no-img-element */

export function CreateHouseholdForm({ user, onHouseholdCreated }: { user: User, onHouseholdCreated: (user: User) => void }) {
    const [displayName, setDisplayName] = useState("")
    const [householdName, setHouseholdName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateUserProfile = async () => {
        if (!displayName.trim()) return;
        const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } })
        if (error) throw error
    }

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()
        if (displayName.trim() === "") return setError("Please enter your display name.")
        if (householdName.trim() === "") return setError("Please enter a household name.")
        setIsSubmitting(true); setError(null);
        try {
            await updateUserProfile()
            const { error } = await supabase.rpc('create_new_household', { household_name: householdName })
            if (error) throw error
            onHouseholdCreated(user)
        } catch (err: any) { console.error(err); setError(err.message || "Failed."); setIsSubmitting(false); }
    }

    const handleJoin = async (e: FormEvent) => {
        e.preventDefault()
        if (displayName.trim() === "") return setError("Please enter your display name.")
        if (inviteCode.trim() === "") return setError("Please enter a code.")
        setIsSubmitting(true); setError(null);
        try {
            await updateUserProfile()
            const { error } = await supabase.rpc('join_household_with_code', { invite_code_to_join: inviteCode.trim().toUpperCase() })
            if (error) throw error
            onHouseholdCreated(user)
        } catch (err: any) { console.error(err); setError(err.message || "Failed."); setIsSubmitting(false); }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
            <div className="mb-8 text-center animate-in slide-in-from-bottom-4 duration-700">
                <img src="/logo-icon.png" alt="ListNer" className="w-16 h-16 mx-auto mb-4 drop-shadow-md" />
                <h1 className="text-3xl font-bold text-slate-900">Setup Your Profile</h1>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">Before we start, let us know who you are.</p>
            </div>
            <Card className="w-full max-w-lg rounded-3xl shadow-xl border-none overflow-hidden animate-in slide-in-from-bottom-8 duration-700 fill-mode-backwards">
                <CardContent className="p-8 bg-white">
                    <div className="space-y-2 mb-8">
                        <Label className="text-slate-600 font-medium ml-1 flex items-center gap-2"><UserIcon className="w-4 h-4" /> Your Display Name</Label>
                        <Input placeholder="e.g. Sarah, Mike, Dad" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isSubmitting} className="h-12 text-lg bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all rounded-xl" />
                    </div>
                    <Tabs defaultValue="create" className="w-full">
                        <div className="bg-slate-50/50 p-2 border-b border-slate-100 mb-6 rounded-xl">
                            <TabsList className="grid w-full grid-cols-2 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                                <TabsTrigger value="create" className="rounded-md py-2 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">New Space</TabsTrigger>
                                <TabsTrigger value="join" className="rounded-md py-2 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">Join Space</TabsTrigger>
                            </TabsList>
                        </div>
                        {error && <div className="mb-4 text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {error}</div>}
                        <TabsContent value="create" className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100"><div className="bg-indigo-100 p-2 rounded-lg"><Sparkles className="w-5 h-5 text-indigo-600" /></div><div><h3 className="font-bold text-indigo-900 text-sm">Starting Fresh?</h3><p className="text-xs text-indigo-700">Create a space for yourself, your family, or your housemates.</p></div></div>
                                <div className="space-y-2"><Label className="text-slate-600 font-medium ml-1">Name your space</Label><div className="relative"><Home className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><Input placeholder="e.g. The Smith Family" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} disabled={isSubmitting} className="pl-10 h-12 text-lg bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all rounded-xl" /></div></div>
                            </div>
                            <Button onClick={handleCreate} disabled={isSubmitting} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-base rounded-xl shadow-lg shadow-slate-200">{isSubmitting ? "Creating..." : "Create Space"} <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </TabsContent>
                        <TabsContent value="join" className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100"><div className="bg-blue-100 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div><div><h3 className="font-bold text-blue-900 text-sm">Moving In?</h3><p className="text-xs text-blue-700">Enter the invite code shared by your housemate or family member.</p></div></div>
                                <div className="space-y-2"><Label className="text-slate-600 font-medium ml-1">Invite Code</Label><div className="relative"><KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><Input placeholder="e.g. A8K2Z9" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} disabled={isSubmitting} className="pl-10 h-12 text-lg bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 transition-all rounded-xl font-mono uppercase tracking-widest" /></div></div>
                            </div>
                            <Button onClick={handleJoin} disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base rounded-xl shadow-lg shadow-blue-200">{isSubmitting ? "Joining..." : "Join Space"} <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            <p className="text-center text-xs text-slate-400 mt-8">© 2025 ListNer Inc. Secure & Private.</p>
        </main>
    )
}