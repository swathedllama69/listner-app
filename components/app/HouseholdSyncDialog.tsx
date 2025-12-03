"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Copy, Share2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { Share } from '@capacitor/share'

export function HouseholdSyncDialog({ isOpen, onOpenChange, householdId, userId, onJoinSuccess }: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    householdId: string,
    userId: string,
    onJoinSuccess: () => void
}) {
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [joinCode, setJoinCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [previewName, setPreviewName] = useState<string | null>(null)
    const [step, setStep] = useState<'input' | 'preview'>('input')

    // TAB 1: GENERATE INVITE
    const handleGenerateInvite = async () => {
        setLoading(true)
        // RPC call to generate a unique code for the household
        const { data, error } = await supabase.rpc('create_invite_code', { target_household_id: householdId })
        setLoading(false)
        if (!error) setInviteCode(data)
    }

    // HANDLE SHARE
    const handleShare = async () => {
        if (!inviteCode) return;
        const message = `Join my household on ListNer with code: ${inviteCode}`;
        const url = 'https://listner.site'; // Update with your actual landing page or deep link

        try {
            if (Capacitor.isNativePlatform()) {
                await Share.share({
                    title: 'Join my Household',
                    text: message,
                    url: url,
                    dialogTitle: 'Share Invite Code',
                });
            } else if (navigator.share) {
                await navigator.share({ title: 'ListNer Invite', text: message, url });
            } else {
                // Fallback to copy if share API not supported
                await navigator.clipboard.writeText(`${message} ${url}`);
                alert("Invite copied to clipboard!");
            }
        } catch (error) {
            console.error("Share failed:", error);
        }
    };

    // TAB 2: JOIN FLOW
    const handlePreview = async () => {
        if (!joinCode.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('households')
                .select('name')
                .eq('invite_code', joinCode.trim().toUpperCase())
                .single();

            if (data) {
                setPreviewName(data.name);
                setStep('preview');
            } else {
                alert("Invalid code. Please check and try again.");
            }
        } catch (e) {
            console.error("Verification failed:", e);
        } finally {
            setLoading(false);
        }
    }

    const handleConfirmJoin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.rpc('join_household_with_code', {
                invite_code_to_join: joinCode.trim().toUpperCase()
            });
            if (error) throw error;

            onOpenChange(false);
            onJoinSuccess(); // Triggers reload
        } catch (err: any) {
            console.error(err.message);
            alert("Failed to join. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Sync Household</DialogTitle>
                    <DialogDescription>Connect with your partner or housemate.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="invite" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="invite" className="rounded-lg">Invite Member</TabsTrigger>
                        <TabsTrigger value="join" className="rounded-lg">Join Existing</TabsTrigger>
                    </TabsList>

                    {/* INVITE TAB */}
                    <TabsContent value="invite" className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800 leading-relaxed">
                            <p className="font-semibold mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite a User</p>
                            Share this code with the person you want to add. They will gain access to shared lists and finances.
                        </div>

                        <div className="py-2 text-center">
                            {inviteCode ? (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="p-5 bg-slate-900 rounded-xl text-white shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-50"><Share2 className="w-12 h-12 text-slate-700" /></div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Code</p>
                                        <p className="text-4xl font-mono font-bold tracking-widest text-lime-400 select-all">{inviteCode}</p>
                                    </div>

                                    <Button onClick={handleShare} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100">
                                        <Share2 className="w-4 h-4 mr-2" /> Share Invite
                                    </Button>

                                    <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-slate-600" onClick={() => {
                                        navigator.clipboard.writeText(inviteCode);
                                        alert("Code copied!");
                                    }}>
                                        <Copy className="w-3 h-3 mr-1" /> Copy Code Only
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleGenerateInvite} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-bold rounded-xl">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Invite Code"}
                                </Button>
                            )}
                        </div>
                    </TabsContent>

                    {/* JOIN TAB */}
                    <TabsContent value="join" className="space-y-4">
                        {step === 'input' ? (
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter Code (e.g. A8X9Z)"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        className="text-center text-xl tracking-[0.5em] font-mono uppercase h-14 rounded-xl border-2 focus:border-indigo-500 transition-all"
                                        maxLength={6}
                                    />
                                    <p className="text-xs text-center text-slate-400">Ask the household owner for their invite code.</p>
                                </div>
                                <Button onClick={handlePreview} disabled={loading || joinCode.length < 3} className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl">
                                    {loading ? "Checking..." : "Preview Household"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle2 className="w-6 h-6" /></div>
                                    <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Found Household</p>
                                    <p className="text-xl font-bold text-emerald-900">{previewName}</p>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-amber-700"><AlertTriangle className="w-4 h-4" /> Important:</div>
                                    <ul className="list-disc list-inside space-y-1 opacity-90 pl-1">
                                        <li>Your dashboard will sync with <strong>{previewName}</strong>'s data.</li>
                                        <li>Your current lists will be moved here.</li>
                                        <li><strong>Private lists remain private</strong> unless you share them.</li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setStep('input')} className="flex-1 h-12 rounded-xl border-slate-200">Back</Button>
                                    <Button onClick={handleConfirmJoin} disabled={loading} className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100">
                                        {loading ? "Joining..." : "Confirm & Join"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}