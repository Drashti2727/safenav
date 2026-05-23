import React from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Navigation, Compass, Brain, Users, AlertTriangle, 
  Eye, ArrowRight, Activity, Zap, CheckCircle2, HeartHandshake, MapPin
} from 'lucide-react';
import { SafeNavLogo, SafeNavIcon } from './SafeNavLogo';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
  onDemoLogin: () => void;
  authError?: string | null;
}

export default function LandingPage({ onStart, onLogin, onDemoLogin, authError }: LandingPageProps) {
  // Stagger container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="relative min-h-screen bg-[#02050e] text-white overflow-hidden flex flex-col font-sans">
      {/* Background Animated Gradient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Dynamic Grid Background Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#030712] to-[#02050e] pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <SafeNavIcon size={44} className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
          <span className="font-display font-bold tracking-tight text-xl text-white">
            SafeNav <span className="bg-gradient-to-r from-rose-500 to-rose-450 bg-clip-text text-transparent font-medium">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-6">
          <button 
            type="button" 
            onClick={onLogin}
            className="text-xs font-semibold text-gray-300 hover:text-white hover:scale-[1.02] transition-all cursor-pointer bg-white/5 px-4 py-2 rounded-xl border border-white/5 active:scale-[0.98]"
          >
            Sign In with Google
          </button>
          <button
            type="button"
            onClick={onStart}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-600 hover:from-rose-500 hover:to-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/15 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Enter Platform
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 max-w-6xl mx-auto z-10 pt-8 pb-20">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center max-w-4xl"
        >
          {/* Main Symmetrical Brand Logo Artwork from the provided image */}
          <motion.div
            variants={itemVariants}
            className="mb-8 p-4 bg-gradient-to-b from-[#0e1630] to-transparent rounded-3xl border border-rose-500/10 shadow-[0_15px_35px_rgba(244,63,94,0.05)] backdrop-blur-md"
          >
            <SafeNavLogo size={180} showText={true} colorClass="text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
          </motion.div>

          {/* Proactive Safety Pill */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20 text-xs font-mono text-rose-400 mb-6 tracking-wider"
          >
            <Shield className="h-4 w-4 animate-pulse text-rose-500" />
            <span className="font-semibold text-[10px] uppercase">Proactive Intel for Pre-Transit Safety</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-7xl font-display font-bold tracking-tight text-white mb-8 leading-[1.05]"
          >
            Predict. Decide.<br />
            <span className="bg-gradient-to-r from-rose-500 via-rose-500 to-violet-400 bg-clip-text text-transparent">
              Stay in Control.
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-300 max-w-2xl mb-12 leading-relaxed font-sans"
          >
            Welcome to the next generation of situational awareness. SafeNav AI helps women decode risks early, choose crowd-trafficked paths, and retain absolute confidence before emergencies arise. No panicking. Just pure intelligence.
          </motion.p>

          {/* Dynamic Google Login / Popup Iframe Warning banner */}
          {authError && (
            <motion.div 
              variants={itemVariants}
              className="w-full max-w-2xl p-5 bg-pink-950/20 border border-pink-500/35 rounded-2xl text-left space-y-3.5 mb-10 backdrop-blur-md animate-in fade-in-50 duration-300"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-pink-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Google Sign-In Preview Warning</h4>
                  <p className="text-xs text-gray-300 leading-relaxed md:pr-4">
                    {authError}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2.5 pl-8 border-t border-white/5">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  <span>Open in New Tab ↗</span>
                </a>
                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-white/10 text-pink-400 hover:text-pink-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:scale-105"
                >
                  Sign In with Demo Account
                </button>
              </div>
            </motion.div>
          )}

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 w-full max-w-lg"
          >
            <button
              type="button"
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>Launch Safety Desktop</span>
              <ArrowRight className="h-4.5 w-4.5 animate-bounce-horizontal" />
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0f172a]/80 hover:bg-[#1e293b] text-sm font-semibold text-gray-200 border border-white/10 hover:border-pink-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              Secure Sync Profile
            </button>
          </motion.div>

          {/* Tertiary Quick Bypass Login Link */}
          <motion.div 
            variants={itemVariants}
            className="mb-16 text-center text-[11px] text-gray-400 mt-1"
          >
            Or, bypass Google signup & use the{" "}
            <button
              type="button"
              onClick={onDemoLogin}
              className="text-pink-400 hover:text-pink-300 font-bold underline transition-colors cursor-pointer"
            >
              Demo Sandbox Account
            </button>{" "}
            directly in this emulator layout.
          </motion.div>

          {/* Quick Real-World Impact Counters */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-16"
          >
            <div className="bg-[#0b1329]/45 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-xl font-display font-bold text-pink-400">98.7%</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase mt-1">Safe-Commute Rate</div>
            </div>
            <div className="bg-[#0b1329]/45 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-xl font-display font-bold text-emerald-400">12,500+</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase mt-1">Protected Commutes</div>
            </div>
            <div className="bg-[#0b1329]/45 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-xl font-display font-bold text-indigo-400">&lt; 3.2s</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase mt-1">AI Recommendation Time</div>
            </div>
            <div className="bg-[#0b1329]/45 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-xl font-display font-bold text-yellow-400">100%</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase mt-1">Zero-Trust Private Logs</div>
            </div>
          </motion.div>

          {/* Feature Grid highlights */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full mt-4"
          >
            <div className="glass-card rounded-2xl p-6 border border-white/5 glass-card-hover group">
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <h4 className="font-display font-bold text-white text-base mb-2">AI Decision Assistant</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Evaluate real-world context with Gemini. Identify drivers drifting off-course or dark routes, and receive practical next steps.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 glass-card-hover group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Navigation className="h-6 w-6" />
              </div>
              <h4 className="font-display font-bold text-white text-base mb-2">Smart Safe Routing</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Compare walking, driving, and transit routes. Filter by streetlight quality, crowd presence, and dynamic neighborhood safety indexes.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 glass-card-hover group">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="font-display font-bold text-white text-base mb-2">Anonymous Alerts Match</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Report harassment indicators, poorly-lit lanes, or unsafe activities. Help others chart dynamic, safe pathways.
              </p>
            </div>
          </motion.div>

          {/* Philosophy Core Section */}
          <motion.div 
            variants={itemVariants}
            className="mt-20 w-full glass-card rounded-3xl p-8 sm:p-12 border border-pink-500/15 max-w-4xl text-center relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-pink-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            <h3 className="font-display font-bold text-gray-100 text-xl sm:text-2xl mb-4">Our Proactive Safety Creed</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-3xl mx-auto italic font-medium font-sans">
              “Women should not have to wait for an emergency to feel secure. Safety is not about panic — it's about anticipating risks, possessing accurate environmental data, and having the decision support to act before any situation escalates.”
            </p>
            <div className="flex justify-center items-center gap-2.5 mt-8 border-t border-white/5 pt-6">
              <Activity className="h-5 w-5 text-pink-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-pink-400 font-bold">Empowerment over Fear-Mongering</span>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 bg-gray-950/85 text-center z-10 mt-auto">
        <p className="text-[10px] font-mono text-gray-500">
          SafeNav AI — Proactive Safety Decision Support Platform | Local Time Simulated: 2026-05
        </p>
      </footer>
    </div>
  );
}

