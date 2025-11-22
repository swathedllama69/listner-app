"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Session, User } from "@supabase/supabase-js"
import { Dashboard } from "@/components/app/Dashboard"
import { CreateHouseholdForm } from "@/components/app/CreateHouseholdForm"
import { Household } from "@/lib/types"
import { Loader2, ShieldCheck, Users, User as UserIcon, Mail, Lock, Wand2, ArrowLeft, CheckCircle2, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/* eslint-disable @next/next/no-img-element */

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Keep track of the last checked user to prevent redundant fetches
  const lastCheckedUserId = useRef<string | null>(null)

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        handleUserCheck(session.user)
      } else {
        setIsLoading(false)
      }
    })

    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event); // Debugging
      setSession(session)

      // 🛑 CRITICAL FIX: Ignore updates that don't change identity
      // This prevents the app from reloading when you just change your name/avatar
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        return;
      }

      if (session) {
        handleUserCheck(session.user)
      } else {
        setIsLoading(false)
        setHousehold(null)
        lastCheckedUserId.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Smart wrapper to prevent re-fetching if we already have data for this user
  const handleUserCheck = (user: User) => {
    if (lastCheckedUserId.current === user.id && household) {
      // We already loaded this user's household, do nothing.
      return;
    }
    lastCheckedUserId.current = user.id;
    checkUserHousehold(user);
  }

  async function checkUserHousehold(user: User) {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("household_members")
        .select("households(*)") // Selecting * gets all fields including settings
        .eq("user_id", user.id)
        .maybeSingle() // Use maybeSingle to avoid 406 errors if no rows found

      if (error) console.error("Error fetching household:", error)

      if (data && data.households) {
        const hh = Array.isArray(data.households) ? data.households[0] : data.households;
        setHousehold(hh as Household);
      } else {
        setHousehold(null)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-teal-950"><Loader2 className="w-10 h-10 animate-spin text-lime-400" /></div>

  // 1. Logged In + Has Household -> Dashboard
  if (session && household) return <Dashboard user={session.user} household={household} />

  // 2. Logged In + No Household -> Setup
  if (session && !household) return <CreateHouseholdForm user={session.user} onHouseholdCreated={checkUserHousehold} />

  // 3. Not Logged In -> Auth Page
  return <AuthPage />
}

// --- AUTH PAGE COMPONENT (Same as before, kept for completeness) ---
function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)

  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link' | 'forgot_password'>('password')

  const features = [
    { title: "Sync Your Home", desc: "Coordinate lists and tasks in real-time.", icon: Users, color: "bg-teal-500" },
    { title: "Solo or Shared", desc: "Perfect for singles or partners.", icon: UserIcon, color: "bg-emerald-500" },
    { title: "Secure & Private", desc: "Encrypted data. Privacy first.", icon: ShieldCheck, color: "bg-lime-500" }
  ]

  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((prev) => (prev + 1) % features.length), 5000)
    return () => clearInterval(timer)
  }, [])

  const handleAuth = async (mode: 'signin' | 'signup') => {
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg("Account created! Check email to confirm.");
      } else {
        if (authMethod === 'password') {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
          if (error) throw error;
          setSuccessMsg("Magic link sent! Check email.");
        }
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const handleResetPassword = async () => {
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setSuccessMsg("Reset link sent to your email.");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const handleGoogleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }); }

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-slate-900">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-teal-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob"></div>
        <div className="absolute top-[20%] right-[-20%] w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-lime-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row">
        {/* Left Side */}
        <div className="hidden lg:flex w-1/2 h-screen flex-col justify-between p-16 text-white">
          <div className="flex items-center gap-4"><img src="/logo-icon.png" alt="Logo" className="w-12 h-12 brightness-0 invert" /><span className="text-3xl font-bold tracking-tight">ListNer.</span></div>
          <div className="space-y-8 mb-20">
            <div className="h-[200px] relative">
              {features.map((f, i) => (
                <div key={i} className={`absolute top-0 left-0 transition-all duration-1000 ${i === slideIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className={`w-16 h-16 rounded-2xl ${f.color} flex items-center justify-center mb-6 shadow-lg shadow-black/20`}><f.icon className="w-8 h-8 text-white" /></div>
                  <h1 className="text-5xl font-bold mb-4 leading-tight">{f.title}</h1>
                  <p className="text-teal-100 text-xl max-w-md opacity-90">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">{features.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === slideIndex ? 'w-12 bg-lime-400' : 'w-2 bg-white/20'}`} />))}</div>
          </div>
          <div className="text-xs text-teal-200/50">© 2025 ListNer Inc.</div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 h-screen flex flex-col items-center justify-center p-6">
          <div className="lg:hidden mb-8 flex flex-col items-center"><img src="/logo-icon.png" alt="Logo" className="w-16 h-16 mb-4 drop-shadow-2xl brightness-0 invert" /><h2 className="text-3xl font-bold text-white tracking-tight">ListNer.</h2></div>
          <Card className="w-full max-w-[420px] border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/20">
            <CardHeader className="pb-2 pt-8 text-center"><CardTitle className="text-2xl font-bold text-slate-900">{authMethod === 'forgot_password' ? "Reset Password" : "Welcome"}</CardTitle><CardDescription>{authMethod === 'forgot_password' ? "Enter your email to recover access." : "Access your shared space"}</CardDescription></CardHeader>
            <CardContent className="px-8 pb-8">
              {authMethod === 'forgot_password' ? (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Email Address</Label><Input type="email" placeholder="you@example.com" className="h-12" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  {successMsg && <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}
                  {error && <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</div>}
                  <Button onClick={handleResetPassword} disabled={loading} className="w-full h-12 bg-teal-900 text-white">{loading ? "Sending..." : "Send Reset Link"}</Button>
                  <Button variant="ghost" onClick={() => setAuthMethod('password')} className="w-full h-12"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In</Button>
                </div>
              ) : (
                <Tabs defaultValue="signin" className="w-full">
                  <div className="flex gap-3 mb-6">
                    <TabsList className="grid grid-cols-2 flex-1 h-12 bg-slate-100/80 p-1 rounded-xl"><TabsTrigger value="signin" className="rounded-lg font-semibold">Sign In</TabsTrigger><TabsTrigger value="signup" className="rounded-lg font-semibold">Sign Up</TabsTrigger></TabsList>
                    <Button variant="outline" onClick={handleGoogleLogin} className="h-12 w-12 rounded-xl border-slate-200 bg-white p-0 flex items-center justify-center shrink-0 shadow-sm"><svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg></Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label><div className="relative"><Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input id="email" type="email" placeholder="hello@example.com" className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl transition-all" value={email} onChange={e => setEmail(e.target.value)} /></div></div>
                    {authMethod !== 'magic_link' && (<div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</Label><span onClick={() => setAuthMethod('forgot_password')} className="text-xs text-teal-600 font-semibold cursor-pointer hover:underline">Forgot?</span></div><div className="relative"><Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input id="password" type="password" placeholder="••••••••" className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl transition-all" value={password} onChange={e => setPassword(e.target.value)} /></div></div>)}
                    {error && <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</div>}
                    {successMsg && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}
                    <TabsContent value="signin" className="mt-2 space-y-3"><Button onClick={() => handleAuth('signin')} disabled={loading} className="w-full h-12 bg-teal-900 hover:bg-teal-800 text-white text-base font-bold rounded-xl shadow-lg shadow-teal-900/20 transition-transform active:scale-95">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMethod === 'magic_link' ? "Send Magic Link" : "Sign In")}</Button><div className="text-center"><span onClick={() => setAuthMethod(prev => prev === 'password' ? 'magic_link' : 'password')} className="text-xs text-slate-500 hover:text-teal-700 cursor-pointer font-medium transition-colors flex items-center justify-center gap-1"><Wand2 className="w-3 h-3" /> {authMethod === 'password' ? "Sign in with Magic Link" : "Sign in with Password"}</span></div></TabsContent>
                    <TabsContent value="signup" className="mt-2"><Button onClick={() => handleAuth('signup')} disabled={loading} className="w-full h-12 bg-lime-500 hover:bg-lime-600 text-teal-950 text-base font-bold rounded-xl shadow-lg shadow-lime-500/30 transition-transform active:scale-95">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"} <ArrowRight className="w-5 h-5 ml-2 opacity-80" /></Button></TabsContent>
                  </div>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}