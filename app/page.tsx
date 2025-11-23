"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Dashboard } from '@/components/app/Dashboard';
import { OnboardingScreen } from '@/components/app/OnboardingScreen';
import { Tutorial } from '@/components/app/Tutorial';
import { CreateHouseholdForm } from '@/components/app/CreateHouseholdForm';
import { Household } from '@/lib/types';
import {
  Loader2, ShieldCheck, Users, Mail, Lock, Wand2, ArrowLeft,
  CheckCircle2, ArrowRight, ListChecks, ShoppingCart, Wallet, AlertTriangle, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/* eslint-disable @next/next/no-img-element */

type UserProfile = User & {
  has_seen_tutorial: boolean;
  username?: string;
};

export default function Home() {
  return <AuthWrapper />;
}

// --- AUTH WRAPPER ---
function AuthWrapper() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stage, setStage] = useState<'LOADING' | 'WELCOME' | 'AUTH' | 'TUTORIAL' | 'SETUP_HOUSEHOLD' | 'APP' | 'ERROR'>('LOADING');
  const [household, setHousehold] = useState<Household | null>(null);
  const [debugMsg, setDebugMsg] = useState("Initializing...");
  const [errorDetails, setErrorDetails] = useState("");

  const listenersInitialized = useRef(false);
  const processedUrls = useRef<Set<string>>(new Set());

  // --- HELPER: PROCESS URL ---
  const handleUrl = async (url: string) => {
    // 1. Prevent "Stale Link" Loop on Restart
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log("✅ Already logged in. Ignoring deep link.");
      // If we are stuck in LOADING/AUTH but actually logged in, force fetch
      if (stage !== 'APP') await fetchProfileAndHousehold(session.user);
      return;
    }

    // 2. Prevent Double Processing (within same session)
    if (processedUrls.current.has(url)) return;
    processedUrls.current.add(url);

    // 3. Force UI to Loading (so user sees progress)
    setStage('LOADING');
    setDebugMsg("Processing Login...");
    console.log("📲 Deep Link Detected:", url);

    try {
      let newData = null;

      if (url.includes('code=')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const code = params.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          newData = data;
          setDebugMsg("Session exchanged...");
        }
      }
      else if (url.includes('access_token')) {
        const hashIndex = url.indexOf('#');
        const hash = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          newData = data;
          setDebugMsg("Session tokens set...");
        }
      }

      // 4. Direct Handoff (Don't wait for event listener)
      if (newData?.user) {
        setDebugMsg("Fetching Profile...");
        await fetchProfileAndHousehold(newData.user);
      }

    } catch (e: any) {
      console.error("Deep link error:", e);
      if (!e.message?.includes('flow state')) {
        setErrorDetails(e.message);
        setStage('ERROR');
      } else {
        // If flow state error, likely a duplicate click. Check if we are good.
        const { data } = await supabase.auth.getUser();
        if (data.user) await fetchProfileAndHousehold(data.user);
      }
    }
  };

  // 💡 1. WEB RESCUE
  useEffect(() => {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      const hash = window.location.hash;
      const search = window.location.search;
      const hasTokens = hash.includes('access_token') || search.includes('code');
      const isMobileWidth = window.innerWidth < 768;

      if (hasTokens && isMobileWidth) {
        window.location.href = `listner://callback${search}${hash}`;
      }
    }
  }, []);

  // 💡 2. NATIVE LISTENERS
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !listenersInitialized.current) {
      listenersInitialized.current = true;

      // Live Listener
      App.addListener('appUrlOpen', (data) => handleUrl(data.url));

      // Cold Start Check
      const checkLaunchUrl = async () => {
        const launchData = await App.getLaunchUrl();
        if (launchData?.url) {
          console.log("🚀 Cold Start URL found");
          handleUrl(launchData.url);
        }
      };
      // Check immediately and again shortly after to be safe
      checkLaunchUrl();
      setTimeout(checkLaunchUrl, 1000);
    }
  }, []);

  // 💡 3. AUTH STATE SYNC
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfileAndHousehold(session.user);
      } else {
        setStage('AUTH');
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Only fetch if we aren't already (prevent double fetch race condition)
        if (!user) await fetchProfileAndHousehold(session.user);
      } else if (event === 'SIGNED_OUT') {
        window.location.reload(); // Hard reload to clear state
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndHousehold = async (u: User) => {
    try {
      // 💡 FIX: Robust Profile Upsert
      let username = u.email?.split('@')[0] || 'user';
      if (username.length < 3) username = username + '_user';

      // Try to get existing profile first
      let { data: profileData } = await supabase.from('profiles').select('has_seen_tutorial, username').eq('id', u.id).single();

      // If not found, creating it
      if (!profileData) {
        setDebugMsg("Creating Profile...");
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: u.id,
            email: u.email,
            username: username,
            has_seen_tutorial: false
          }, { onConflict: 'id' })
          .select('has_seen_tutorial, username')
          .single();

        if (createError) throw createError;
        profileData = newProfile;
      }

      setDebugMsg("Loading Household...");
      let currentHousehold: Household | null = null;
      const { data: householdData } = await supabase.from("household_members").select("households(*)").eq("user_id", u.id).maybeSingle();

      if (householdData && householdData.households) {
        currentHousehold = Array.isArray(householdData.households) ? householdData.households[0] as Household : householdData.households as Household;
      }

      const mergedUser: UserProfile = { ...u, ...profileData! };
      const localSeen = typeof window !== 'undefined' ? localStorage.getItem(`tutorial_seen_${u.id}`) : null;
      if (localSeen === 'true') mergedUser.has_seen_tutorial = true;

      setUser(mergedUser);
      setHousehold(currentHousehold);

      // Transition to App
      if (currentHousehold) {
        setStage(mergedUser.has_seen_tutorial ? 'APP' : 'TUTORIAL');
      } else {
        setStage('SETUP_HOUSEHOLD');
      }

    } catch (err: any) {
      console.error("Critical Data Load Error:", err);
      setErrorDetails(err.message || "Unknown error loading data");
      setStage('ERROR');
    }
  }

  const handleTutorialComplete = async () => {
    if (!user) return;
    const updatedUser = { ...user, has_seen_tutorial: true };
    setUser(updatedUser);
    localStorage.setItem(`tutorial_seen_${user.id}`, "true");
    if (household) setStage('APP');
    else setStage('SETUP_HOUSEHOLD');
    await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('id', user.id);
  }

  const handleHouseholdCreated = (u: User) => {
    fetchProfileAndHousehold(u);
  }

  // 💡 Safe Area CSS (Fixes button tucked to bottom)
  // pt-safe-top adds padding for notch/status bar
  // pb-safe-bottom adds padding for home swipe indicator
  const safeAreaWrapper = "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] min-h-screen flex flex-col";

  switch (stage) {
    case 'LOADING': return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-6" />
        <h2 className="text-lg font-semibold text-white mb-2">Loading...</h2>
        <p className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">{debugMsg}</p>
      </div>
    );
    case 'ERROR': return (
      <div className={`flex flex-col items-center justify-center bg-slate-50 p-6 text-center ${safeAreaWrapper}`}>
        <div className="bg-rose-100 p-4 rounded-full mb-4"><AlertTriangle className="w-8 h-8 text-rose-600" /></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load</h2>
        <p className="text-sm text-slate-500 mb-6">We ran into an issue loading your data.</p>
        <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-600 mb-6 max-w-full break-all border border-slate-200">{errorDetails}</div>
        <div className="flex gap-3 w-full max-w-xs">
          <Button onClick={() => window.location.reload()} className="flex-1 bg-slate-900 text-white">Retry</Button>
          <Button variant="outline" onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"><LogOut className="w-4 h-4 mr-2" /> Log Out</Button>
        </div>
      </div>
    );
    case 'WELCOME': return <OnboardingScreen onStart={() => setStage('AUTH')} />;
    case 'AUTH': return <div className={safeAreaWrapper}><AuthPage /></div>;
    case 'TUTORIAL': return <div className={safeAreaWrapper}><Tutorial onComplete={handleTutorialComplete} /></div>;
    case 'SETUP_HOUSEHOLD': return <div className={safeAreaWrapper}><CreateHouseholdForm user={user!} onHouseholdCreated={handleHouseholdCreated} /></div>;
    case 'APP': return (
      <div className={safeAreaWrapper}>
        <Dashboard user={user!} household={household!} />
      </div>
    );
    default: return null;
  }
}

// --- AUTH PAGE ---
function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link' | 'forgot_password'>('password');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  const features = [
    { title: "The Best List App", desc: "Say goodbye to old spreadsheets. ListNer is the new command center for your household.", icon: ListChecks, color: "bg-teal-600" },
    { title: "Sync Your Home", desc: "Coordinate all lists, tasks, and goals in real-time with family or partners.", icon: Users, color: "bg-teal-500" },
    { title: "One-Stop Finance", desc: "Easily track shared expenses and automate IOU calculations instantly.", icon: Wallet, color: "bg-emerald-500" },
    { title: "Fully Secured", desc: "Your financial and household data is protected with enterprise-grade encryption.", icon: ShieldCheck, color: "bg-indigo-500" },
  ];

  const animationItems = [
    { type: '🍎', size: 10, duration: 18, delay: 0, top: '10%', left: '10%', animKey: 'slowDrift1', isEmoji: true },
    { type: '💵', size: 14, duration: 18, delay: 10, bottom: '10%', left: '40%', animKey: 'slowDrift3', isEmoji: true },
    { type: '🛒', size: 11, duration: 15, delay: 15, top: '20%', right: '30%', animKey: 'slowDrift4', isEmoji: true },
    { type: '🥦', size: 12, duration: 23, delay: 5, top: '50%', right: '5%', animKey: 'slowDrift2', isEmoji: true },
    { type: '🍐', size: 9, duration: 22, delay: 45, top: '5%', left: '25%', animKey: 'slowDrift10', isEmoji: true },
    { type: '🍌', size: 15, duration: 17, delay: 50, bottom: '20%', right: '50%', animKey: 'slowDrift11', isEmoji: true },
    { type: '🍇', size: 13, duration: 14, delay: 55, top: '75%', right: '25%', animKey: 'slowDrift12', isEmoji: true },
    { type: '🪑', size: 10, duration: 16, delay: 60, top: '60%', left: '5%', animKey: 'slowDrift13', isEmoji: true },
    { type: '🖊️', size: 9, duration: 20, delay: 65, bottom: '40%', left: '15%', animKey: 'slowDrift14', isEmoji: true },
    { type: '💻', size: 16, duration: 19, delay: 70, top: '30%', right: '10%', animKey: 'slowDrift15', isEmoji: true },
    { Icon: ShoppingCart, color: 'text-lime-400', size: 10, duration: 20, delay: 20, bottom: '25%', right: '15%', animKey: 'slowDrift5', isEmoji: false },
    { Icon: Wallet, color: 'text-teal-400', size: 12, duration: 18, delay: 25, top: '70%', left: '20%', animKey: 'slowDrift6', isEmoji: false },
  ];

  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((prev) => (prev + 1) % features.length), 7000);
    return () => clearInterval(timer);
  }, []);

  const getRedirectUrl = () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      return 'https://listner.vercel.app/auth/redirect';
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
  };

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
          const redirectTo = getRedirectUrl();
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo }
          });
          if (error) throw error;
          setSuccessMsg("Magic link sent! Check email.");
        }
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const handleResetPassword = async () => {
    setLoading(true); setError(null); setSuccessMsg(null);
    const redirectTo = getRedirectUrl();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectTo}/reset-password`
      });
      if (error) throw error;
      setSuccessMsg("Reset link sent to your email.");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectTo = getRedirectUrl();

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex-1 flex overflow-hidden bg-slate-50">
      <style jsx global>{`
        @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 25% { transform: translate(-200px, 150px) scale(1.1); } 50% { transform: translate(250px, -150px) scale(0.9); } 75% { transform: translate(-150px, -100px) scale(1.2); } }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes slowDrift1 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(10vw, 20vh) rotate(10deg); } 66% { transform: translate(-15vw, 5vh) rotate(-5deg); } }
        @keyframes slowDrift2 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 40% { transform: translate(-10vw, -10vh) rotate(-10deg); } 80% { transform: translate(10vw, 15vh) rotate(5deg); } }
        @keyframes slowDrift3 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 20% { transform: translate(25vw, -5vh) rotate(15deg); } 70% { transform: translate(-5vw, 25vh) rotate(-15deg); } }
        @keyframes slowDrift4 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-20vw, 10vh) rotate(20deg); } }
        @keyframes slowDrift5 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 60% { transform: translate(5vw, -20vh) rotate(-10deg); } }
        @keyframes slowDrift6 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 30% { transform: translate(-15vw, -5vh) rotate(5deg); } }
        @keyframes slowDrift7 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 70% { transform: translate(10vw, 10vh) rotate(-20deg); } }
        @keyframes slowDrift8 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 45% { transform: translate(-10vw, -20vh) rotate(10deg); } }
        @keyframes slowDrift9 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 55% { transform: translate(20vw, -10vh) rotate(-5deg); } }
        @keyframes slowDrift10 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 30% { transform: translate(-20vw, 5vh) rotate(15deg); } 60% { transform: translate(5vw, -10vh) rotate(-5deg); } }
        @keyframes slowDrift11 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 40% { transform: translate(15vw, 15vh) rotate(-10deg); } 80% { transform: translate(-5vw, -10vh) rotate(5deg); } }
        @keyframes slowDrift12 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(10vw, -25vh) rotate(5deg); } 75% { transform: translate(-10vw, 15vh) rotate(-15deg); } }
        @keyframes slowDrift13 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-5vw, 15vh) rotate(-5deg); } }
        @keyframes slowDrift14 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 65% { transform: translate(10vw, -10vh) rotate(10deg); } }
        @keyframes slowDrift15 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 35% { transform: translate(-15vw, 10vh) rotate(-10deg); } }
      `}</style>
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-teal-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob"></div>
        <div className="absolute top-[20%] right-[-20%] w-[600px] h-[600px] bg-emerald-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-lime-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5"></div>

        {animationItems.map((item, index) => {
          const sizeInPixels = item.size * (item.isEmoji ? 6 : 4.5);
          const IconComponent = item.Icon;
          return (
            <div key={index} className={`absolute pointer-events-none ${item.color || ''} opacity-[0.2]`} style={{ ...item, width: `${sizeInPixels}px`, height: `${sizeInPixels}px`, animation: `${item.animKey} ${item.duration}s ease-in-out ${item.delay}s infinite alternate` }}>
              {item.isEmoji ? <span className="text-5xl drop-shadow-md" style={{ fontSize: `${sizeInPixels}px` }}>{item.type}</span> : IconComponent && <IconComponent className="w-full h-full" />}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row">
        {/* Left Side */}
        <div className="hidden lg:flex w-1/2 h-screen flex-col justify-between p-16 text-slate-800 bg-slate-100/50">
          <div className="flex items-center gap-4">
            <img src="/logo-icon-lg.png" alt="ListNer App Logo" className="w-32 h-32 object-contain" />
            <span className="text-4xl font-bold tracking-tight">ListNer.</span>
          </div>
          <div className="space-y-8 mb-20">
            <div className="h-[200px] relative">
              {features.map((f, i) => (
                <div key={i} className={`absolute top-0 left-0 transition-all duration-1000 ${i === slideIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className={`w-16 h-16 rounded-2xl ${f.color} flex items-center justify-center mb-6 shadow-xl shadow-black/20`}><f.icon className="w-8 h-8 text-white" /></div>
                  <h1 className="text-5xl font-bold mb-4 leading-tight text-slate-900">{f.title}</h1>
                  <p className="text-slate-600 text-xl max-w-md opacity-90">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">{features.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === slideIndex ? 'w-12 bg-teal-600' : 'w-2 bg-slate-300'}`} />))}</div>
          </div>
          <div className="text-xs text-slate-400">© 2025 ListNer Inc.</div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-6">
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <img src="/logo-icon-lg.png" alt="ListNer App Logo" className="w-16 h-16 mb-4 object-contain" />
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">ListNer.</h2>
          </div>
          <Card className="w-full max-w-[420px] border-none shadow-2xl bg-white/90 rounded-3xl overflow-hidden ring-1 ring-slate-200">
            <CardHeader className="pb-2 pt-8 text-center">
              <CardTitle className="text-2xl font-bold text-slate-900">
                {authMethod === 'forgot_password' ? "Reset Password" : activeTab === 'signup' ? "Let's Get Started!" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {authMethod === 'forgot_password' ? "Enter your email to recover access." : activeTab === 'signup' ? "Create your account and sync up your home life." : "Sign in to access your shared space"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {authMethod === 'forgot_password' ? (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Email Address</Label><Input type="email" placeholder="you@example.com" className="h-12" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  {successMsg && <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}
                  {error && <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</div>}
                  <Button onClick={handleResetPassword} disabled={loading} className="w-full h-12 bg-teal-600 text-white">{loading ? "Sending..." : "Send Reset Link"}</Button>
                  <Button variant="ghost" onClick={() => setAuthMethod('password')} className="w-full h-12"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In</Button>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
                  <div className="flex gap-3 mb-6">
                    <TabsList className="grid grid-cols-2 flex-1 h-12 bg-slate-100/80 p-1 rounded-xl"><TabsTrigger value="signin" className="rounded-lg font-semibold">Sign In</TabsTrigger><TabsTrigger value="signup" className="rounded-lg font-semibold">Sign Up</TabsTrigger></TabsList>
                    <Button variant="outline" onClick={handleGoogleLogin} disabled={loading} className="h-12 w-12 rounded-xl border-slate-200 bg-white p-0 flex items-center justify-center shrink-0 shadow-sm">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label><div className="relative"><Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input id="email" type="email" placeholder="hello@example.com" className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl transition-all" value={email} onChange={e => setEmail(e.target.value)} /></div></div>
                    {authMethod !== 'magic_link' && (
                      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</Label><span onClick={() => setAuthMethod('forgot_password')} className="text-xs text-teal-600 font-semibold cursor-pointer hover:underline">Forgot?</span></div><div className="relative"><Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input id="password" type="password" placeholder="••••••••" className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-xl transition-all" value={password} onChange={e => setPassword(e.target.value)} /></div></div>
                    )}
                    {error && <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</div>}
                    {successMsg && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}
                    <TabsContent value="signin" className="mt-2 space-y-3"><Button onClick={() => handleAuth('signin')} disabled={loading} className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-xl shadow-lg shadow-teal-300/50 transition-transform active:scale-95">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMethod === 'magic_link' ? "Send Magic Link" : "Sign In")}</Button>
                      <div className="text-center">
                        <button type="button" onClick={() => setAuthMethod(prev => prev === 'password' ? 'magic_link' : 'password')} className="text-xs text-slate-500 hover:text-teal-700 cursor-pointer font-medium transition-colors flex items-center justify-center gap-1 w-full p-1">
                          <Wand2 className="w-3 h-3" /> {authMethod === 'password' ? "Sign in with Magic Link" : "Sign in with Password"}
                        </button>
                      </div>
                    </TabsContent>
                    <TabsContent value="signup" className="mt-2"><Button onClick={() => handleAuth('signup')} disabled={loading} className="w-full h-12 bg-lime-500 hover:bg-lime-600 text-teal-950 text-base font-bold rounded-xl shadow-lg shadow-lime-300/50 transition-transform active:scale-95">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"} <ArrowRight className="w-5 h-5 ml-2 opacity-80" /></Button></TabsContent>
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