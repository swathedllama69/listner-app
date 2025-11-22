"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { EXPENSE_CATEGORIES } from "@/lib/constants"

// Type definition for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export function VoiceAssistant({ userId, householdId, onAction }: { userId: string, householdId: string, onAction: () => void }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
    const [feedback, setFeedback] = useState("");

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US'; // You can make this dynamic

                recognition.onstart = () => {
                    setIsListening(true);
                    setStatus('listening');
                    setTranscript("");
                    setFeedback("Listening...");
                };

                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    handleCommand(text);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech error:", event.error);
                    setStatus('error');
                    setFeedback("Could not understand. Try again.");
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                    if (status === 'listening') setStatus('idle');
                };

                recognitionRef.current = recognition;
            }
        }
    }, [userId, householdId]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
            } catch (e) {
                alert("Voice input is not supported in this browser.");
            }
        }
    };

    // --- INTELLIGENT PARSER ---
    const handleCommand = async (text: string) => {
        setStatus('processing');
        setFeedback("Processing...");
        const lower = text.toLowerCase();

        try {
            // 1. DETECT EXPENSE ("Spent 5000 on food", "Paid 2000 for taxi")
            if (lower.includes('spent') || lower.includes('paid') || lower.includes('cost')) {
                const amountMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/); // Extract number
                const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;

                // Guess Category
                let category = "Other";
                const categoriesLower = EXPENSE_CATEGORIES.map(c => c.toLowerCase());
                for (const cat of categoriesLower) {
                    if (lower.includes(cat) || (cat === 'transport' && (lower.includes('fuel') || lower.includes('taxi') || lower.includes('bus'))) || (cat === 'groceries' && (lower.includes('food') || lower.includes('market')))) {
                        category = EXPENSE_CATEGORIES[categoriesLower.indexOf(cat)];
                        break;
                    }
                }

                if (amount > 0) {
                    await supabase.from('expenses').insert({
                        user_id: userId,
                        household_id: householdId,
                        name: `Voice Entry: ${text}`,
                        amount: amount,
                        category: category,
                        expense_date: new Date().toISOString()
                    });
                    setFeedback(`Logged: ${category} expense of ${amount}`);
                    setStatus('success');
                    setTimeout(onAction, 1500); // Refresh dashboard
                    return;
                }
            }

            // 2. DETECT SHOPPING ("Add milk", "Buy bread", "Need eggs")
            if (lower.includes('add') || lower.includes('buy') || lower.includes('need')) {
                // Clean up string: remove "add", "to list", "please"
                let itemName = text.replace(/^(add|buy|need)\s+/i, '').replace(/\s+(to\s+)?(shopping|list|cart).*$/i, '').trim();

                // Find a shopping list (First available)
                const { data: lists } = await supabase.from('lists').select('id').eq('household_id', householdId).eq('list_type', 'shopping').limit(1);

                if (lists && lists.length > 0) {
                    await supabase.from('shopping_items').insert({
                        list_id: lists[0].id,
                        user_id: userId,
                        name: itemName,
                        quantity: "1",
                        priority: "Medium"
                    });
                    setFeedback(`Added "${itemName}" to shopping list`);
                    setStatus('success');
                    setTimeout(onAction, 1500);
                    return;
                } else {
                    setFeedback("No shopping list found.");
                    setStatus('error');
                    return;
                }
            }

            setFeedback("Command not recognized.");
            setStatus('error');

        } catch (e) {
            console.error(e);
            setFeedback("Something went wrong.");
            setStatus('error');
        }
    };

    // --- RENDER (Floating Overlay) ---
    return createPortal(
        <>
            {/* Floating Mic Button */}
            <div className="fixed bottom-44 right-4 md:bottom-28 md:right-8 z-[100]">
                <Button
                    onClick={toggleListening}
                    className={`h-14 w-14 rounded-full shadow-2xl border-4 border-white transition-all duration-300 ${isListening ? 'bg-rose-500 hover:bg-rose-600 animate-pulse scale-110' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    title="ListNer Voice Command"
                >
                    {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                </Button>
            </div>

            {/* Status Overlay (Visible only when active) */}
            {(status !== 'idle') && (
                <div className="fixed inset-x-0 bottom-0 p-6 z-[110] flex justify-center pointer-events-none">
                    <div className="bg-slate-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm w-full animate-in slide-in-from-bottom-10">
                        <div className={`p-2 rounded-full ${status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : (status === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400')}`}>
                            {status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : (status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : (status === 'error' ? <AlertCircle className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />))}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">ListNer AI</p>
                            <p className="text-sm font-medium truncate">{feedback || transcript || "Listening..."}</p>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}