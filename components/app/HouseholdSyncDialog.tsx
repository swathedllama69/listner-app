"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, ArrowRight, Copy, CheckCircle2, ShieldCheck, Loader2, AlertTriangle } from "lucide-react"

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
        const { data, error } = await supabase.rpc('create_invite_code', { target_household_id: householdId })
        setLoading(false)
        if (!error) setInviteCode(data)
    }

    // TAB 2: JOIN FLOW
    const handlePreview = async () => {
        if (!joinCode.trim()) return;
        setLoading(true);
        // Try to peek at the household. *Note: This requires RLS to allow reading by invite_code, 
        // or a specific RPC. Falling back to a safe assumption if fetch fails.*
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
                // If direct access failed (RLS), we might just have to proceed blindly or warn
                alert("Invalid code or household not found.");
            }
        } catch (e) {
            alert("Could not verify code.");
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
            alert(err.message);
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
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="invite">Invite Member</TabsTrigger>
                        <TabsTrigger value="join">Join Existing</TabsTrigger>
                    </TabsList>

                    {/* INVITE TAB */}
                    <TabsContent value="invite" className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800 leading-relaxed">
                            <p className="font-semibold mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite a User</p>
                            Share this code with the person you want to add. They will gain access to shared lists and finances.
                        </div>

                        <div className="py-4 text-center">
                            {inviteCode ? (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="p-4 bg-slate-900 rounded-xl text-white shadow-lg">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Your Code</p>
                                        <p className="text-3xl font-mono font-bold tracking-widest text-lime-400">{inviteCode}</p>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(inviteCode); alert("Copied!") }}>
                                        <Copy className="w-4 h-4 mr-2" /> Copy Code
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleGenerateInvite} disabled={loading} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Invite Code"}
                                </Button>
                            )}
                        </div>
                    </TabsContent>

                    {/* JOIN TAB */}
                    <TabsContent value="join" className="space-y-4">
                        {step === 'input' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter Invite Code (e.g. A8X9Z)"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        className="text-center text-lg tracking-widest font-mono uppercase h-12"
                                    />
                                </div>
                                <Button onClick={handlePreview} disabled={loading || !joinCode} className="w-full h-11">
                                    {loading ? "Checking..." : "Preview Household"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Found Household</p>
                                    <p className="text-lg font-bold text-emerald-900">{previewName}</p>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 space-y-2">
                                    <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4 text-amber-600" /> Important:</div>
                                    <ul className="list-disc list-inside space-y-1 opacity-90">
                                        <li>Your dashboard will update to show <strong>{previewName}</strong>'s data.</li>
                                        <li>Your current lists will be moved here.</li>
                                        <li><strong>Private lists will remain private</strong> unless you choose to share them later.</li>
                                    </ul>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => setStep('input')}>Back</Button>
                                    <Button onClick={handleConfirmJoin} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
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