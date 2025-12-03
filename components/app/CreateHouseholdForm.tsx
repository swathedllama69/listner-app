"use client"

import { useState, FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, KeyRound, ArrowRight, Sparkles, Users, Building2 } from "lucide-react"

/* eslint-disable @next/next/no-img-element */

export function CreateHouseholdForm({ user, onHouseholdCreated }: { user: User, onHouseholdCreated: (user: User) => void }) {
    const [householdName, setHouseholdName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()
        if (householdName.trim() === "") return setError("Please enter a name for your space.")

        setIsSubmitting(true); setError(null);
        try {
            const { error } = await supabase.rpc('create_new_household', { household_name: householdName })
            if (error) throw error
            onHouseholdCreated(user)
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create space.");
            setIsSubmitting(false);
        }
    }

    const handleJoin = async (e: FormEvent) => {
        e.preventDefault()
        if (inviteCode.trim() === "") return setError("Please enter a valid code.")

        setIsSubmitting(true); setError(null);
        try {
            const { error } = await supabase.rpc('join_household_with_code', { invite_code_to_join: inviteCode.trim().toUpperCase() })
            if (error) throw error
            onHouseholdCreated(user)
        } catch (err: any) {
            console.error(err);
            setError("Invalid code or already a member.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
            <div className="mb-8 text-center animate-in slide-in-from-bottom-4 duration-700">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                    <img src="/logo-icon.png" alt="ListNer" className="w-10 h-10 object-contain" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Setup Your Space</h1>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">Create a new dashboard for yourself or join an existing one.</p>
            </div>

            <Card className="w-full max-w-md rounded-[32px] shadow-2xl shadow-slate-200/50 border-none overflow-hidden animate-in slide-in-from-bottom-8 duration-700 bg-white">
                <CardContent className="p-1">
                    <Tabs defaultValue="create" className="w-full">
                        <div className="p-2 bg-slate-50/80 m-1 rounded-[28px]">
                            <TabsList className="grid w-full grid-cols-2 bg-white/50 p-1 h-auto rounded-[24px] shadow-sm">
                                <TabsTrigger value="create" className="rounded-[20px] py-3 text-sm font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Create New</TabsTrigger>
                                <TabsTrigger value="join" className="rounded-[20px] py-3 text-sm font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Join Existing</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 pt-4">
                            {error && (
                                <div className="mb-6 bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-3 items-center animate-in slide-in-from-top-2">
                                    <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 text-rose-600 font-bold">!</div>
                                    <p className="text-xs font-bold text-rose-700">{error}</p>
                                </div>
                            )}

                            <TabsContent value="create" className="space-y-6 mt-0">
                                <div className="text-center pb-2">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Name your HQ</h3>
                                    <p className="text-xs text-slate-500">e.g. "My Apartment" or "Smith Family"</p>
                                </div>
                                <div className="relative group">
                                    <Home className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <Input
                                        placeholder="Space Name"
                                        value={householdName}
                                        onChange={(e) => setHouseholdName(e.target.value)}
                                        disabled={isSubmitting}
                                        className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded-xl font-medium"
                                    />
                                </div>
                                <Button onClick={handleCreate} disabled={isSubmitting} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all">
                                    {isSubmitting ? "Setting up..." : "Create Space"} <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </TabsContent>

                            <TabsContent value="join" className="space-y-6 mt-0">
                                <div className="text-center pb-2">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Have an invite?</h3>
                                    <p className="text-xs text-slate-500">Enter the 6-character code.</p>
                                </div>
                                <div className="relative group">
                                    <Sparkles className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <Input
                                        placeholder="CODE"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        disabled={isSubmitting}
                                        className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600 rounded-xl font-mono text-lg tracking-widest uppercase"
                                        maxLength={6}
                                    />
                                </div>
                                <Button onClick={handleJoin} disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all">
                                    {isSubmitting ? "Verifying..." : "Join Now"} <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    )
}