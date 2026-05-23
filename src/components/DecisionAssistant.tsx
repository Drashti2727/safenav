import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, ShieldAlert, Sparkles, AlertCircle, Compass, 
  CheckCircle2, MapPin, ShieldCheck, Loader2, HelpCircle, 
  Phone, Volume2, Shield, Radio, Bell, ArrowRight, ShieldCheck as VerifiedIcon
} from 'lucide-react';
import { SafetyDecisionResult } from '../types';

interface DecisionAssistantProps {
  onAddTravelLog?: (origin: string, destination: string, score: number) => void;
  onTriggerSilentProtection?: () => void;
}

export default function DecisionAssistant({ onAddTravelLog, onTriggerSilentProtection }: DecisionAssistantProps) {
  const [situationInput, setSituationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SafetyDecisionResult | null>(null);
  const [errorText, setErrorText] = useState('');
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  // Audio state for synthesized siren alarm
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [oscillator, setOscillator] = useState<any>(null);
  const [audioCtx, setAudioCtx] = useState<any>(null);

  // Track the most recently triggered critical result object to prevent re-triggering on unrelated re-renders
  const lastTriggeredResultRef = useRef<SafetyDecisionResult | null>(null);

  // Auto trigger silent protection when critical threat is loaded
  useEffect(() => {
    const isCritical = analysisResult?.riskLevel === 'Critical Risk' || analysisResult?.riskLevel === 'CRITICAL';
    if (isCritical && onTriggerSilentProtection) {
      if (lastTriggeredResultRef.current !== analysisResult) {
        lastTriggeredResultRef.current = analysisResult;
        console.log("CRITICAL THREAT DETECTED: Automatically engaging Silent Protection Shield!");
        onTriggerSilentProtection();
      }
    }
  }, [analysisResult, onTriggerSilentProtection]);

  // Clean play state on unmount
  useEffect(() => {
    return () => {
      if (oscillator) {
        try {
          oscillator.stop();
        } catch (_) {}
      }
    };
  }, [oscillator]);

  const preConfiguredSituations = [
    { text: "He is trying to kill me", label: "🚨 Active Life Threat" },
    { text: "Someone is attacking me right now in the park!", label: "🚨 Active Physical Attack" },
    { text: "I am being followed aggressively by a stranger shouting obscenities.", label: "🚨 Aggressive Pursuit" },
    { text: "Help me, I think I'm in immediate danger in an unlit alleyway.", label: "🚨 Immediate Danger" },
    { text: "My cab driver just turned onto a dark, unpaved side road late at night.", label: "Cab Route Divergence" },
    { text: "Someone has been following my exact walking patterns for the last three blocks.", label: "Suspected Tails" },
  ];

  const handleAnalyzeSituation = async (situationText: string) => {
    if (!situationText.trim()) return;
    setLoading(true);
    setAnalysisResult(null);
    setErrorText('');
    setIsLocalFallback(false);

    try {
      const response = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: situationText })
      });

      if (!response.ok) {
        let errorMsg = "Failed to analyze situation";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const textData = await response.text();
            if (textData && (textData.includes("<!DOCTYPE") || textData.includes("<html"))) {
              errorMsg = `Server returned HTML status ${response.status} (likely running on independent Vite HMR port rather than Express server port 3000)`;
            } else {
              errorMsg = textData || `Status ${response.status}`;
            }
          }
        } catch (_) {
          errorMsg = `Status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const result: SafetyDecisionResult = await response.json();
      setAnalysisResult(result);
    } catch (error: any) {
      console.warn("Backend Decision API unavailable, engaging local decision engine fallback:", error.message || error);
      
      const textLower = situationText.toLowerCase();
      let riskLevel: 'Low' | 'Medium' | 'High' | 'CRITICAL' = 'Low';
      let urgency: 'Secure' | 'Cautious' | 'Urgent' | 'IMMEDIATE ACTION REQUIRED' = 'Secure';
      let possibleThreats = ["Unfamiliar surroundings with reduced activity."];
      let recommendedActions = [
        "Keep your phone active and ready in your hand.",
        "Scan for lighted businesses or active storefronts to walk near.",
        "Hold a steady, confidence-driven pace with high posture."
      ];
      let saferAlternatives = [
        "Re-route around unlit or quiet streets.",
        "Share your active transit trail with a reliable contact."
      ];
      let nearbyHelp = ["A 24/7 convenience store or brightly lit lobby.", "Nearest main corridor or public zone."];
      let confidenceGuidance = "Project extreme alertness. Walk with physical alignment and poise.";
      let safetyConfidenceScore = 75;

      if (textLower.includes("kill") || textLower.includes("attack") || textLower.includes("immediate danger") || textLower.includes("hurt") || textLower.includes("aggressively") || textLower.includes("screaming") || textLower.includes("beaten")) {
        riskLevel = 'CRITICAL';
        urgency = 'IMMEDIATE ACTION REQUIRED';
        possibleThreats = [
          "Direct and active threat of physical confrontation, assault, or high-profile safety disruption."
        ];
        recommendedActions = [
          "Seek safety inside a brightly lit business, restaurant, or hotel lobby immediately.",
          "Broadcaster links are fully active. Keep walking decisively towards populated streets.",
          "Prepare to double tap the side buttons to broadcast emergency coordinates to local law enforcement/contacts."
        ];
        saferAlternatives = [
          "Engage in verbal deterrence (yelling firmly 'Stay Back!') while walking away.",
          "Sprint to any populated open zone; do not try to search for quiet side paths."
        ];
        nearbyHelp = ["Local police box / smart alarm pillar", "24/7 commercial gas station", "Active commuter hub platforms"];
        confidenceGuidance = "CRITICAL SITUATION: Prioritise crowd-density integration and immediate visual protection. Speed is equivalent to security.";
        safetyConfidenceScore = 20;
      } else if (textLower.includes("follow") || textLower.includes("tail") || textLower.includes("behind") || textLower.includes("stalk") || textLower.includes("chase") || textLower.includes("stranger")) {
        riskLevel = 'High';
        urgency = 'Urgent';
        possibleThreats = [
          "Persistent tracking behavior by a suspicious subject.",
          "Imminent escalation from active following to direct contact on a quiet segment."
        ];
        recommendedActions = [
          "Confirm tracking: deliberately change sides of the street or step into a shop.",
          "Maintain active eye contact or brief acknowledgment if approached; assert your personal boundary.",
          "Initiate audio/video stream or dial a trusted connection on speakerphone."
        ];
        saferAlternatives = [
          "Switch direction directly towards the nearest municipal transit booth or major intersection.",
          "Remain in a well-lit area; avoid taking private shortcuts through residential yards or alleyways."
        ];
        nearbyHelp = ["Illuminated storefront cafes", "Smart emergency call box with CCTV camera coverage"];
        confidenceGuidance = "URGENT RESPONSE: project strong spatial awareness. Do not hide your awareness. Visually checking your tail sends a warning that you are alert.";
        safetyConfidenceScore = 55;
      } else if (textLower.includes("dark") || textLower.includes("unlit") || textLower.includes("quiet") || textLower.includes("isolated") || textLower.includes("alley")) {
        riskLevel = 'Medium';
        urgency = 'Cautious';
        possibleThreats = ["Reduced public surveillance", "Diminished visibility index", "Isolated corridor footprint"];
        recommendedActions = [
          "Secure smart-location telemetry broadcast.",
          "Refuelling step: plan path intersections towards high-lux lighting segments.",
          "Comfort posture: walk in the center lane of the sidewalk, avoiding dark recessed portals."
        ];
        saferAlternatives = ["Increase pacing to step out of the unlit segment.", "Use custom light map directions to steer around dark corridors."];
        nearbyHelp = ["Streetlights on major avenues", "Local residential smart Ring cameras"];
        confidenceGuidance = "CAUTIOUS STANDBY: Keep attention focused forward. Maintain natural, elegant stride patterns.";
        safetyConfidenceScore = 80;
      }

      setAnalysisResult({
        riskLevel,
        urgency,
        possibleThreats,
        recommendedActions,
        saferAlternatives,
        nearbyHelp,
        confidenceGuidance,
        safetyConfidenceScore
      });
      setIsLocalFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/30 animate-pulse';
      case 'high': 
        return 'bg-rose-500/10 border-rose-500/25 text-rose-400';
      case 'medium': 
        return 'bg-amber-500/10 border-amber-500/25 text-amber-400';
      default: 
        return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    const uLower = urgency?.toLowerCase() || '';
    if (uLower.includes('immediate') || uLower.includes('critical')) {
      return 'bg-red-500/25 text-red-200 border-red-500/40 font-black animate-pulse';
    }
    switch (uLower) {
      case 'urgent': 
        return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
      case 'cautious': 
        return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
      default: 
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
    }
  };

  const toggleSirenAlarm = () => {
    try {
      if (alarmPlaying) {
        if (oscillator) {
          oscillator.stop();
          oscillator.disconnect();
        }
        setAlarmPlaying(false);
        setOscillator(null);
      } else {
        const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioCtx) setAudioCtx(ctx);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        let t = ctx.currentTime;
        for (let i = 0; i < 60; i++) {
          osc.frequency.setValueAtTime(800, t + i * 0.4);
          osc.frequency.linearRampToValueAtTime(1500, t + i * 0.4 + 0.2);
          osc.frequency.linearRampToValueAtTime(800, t + i * 0.4 + 0.4);
        }

        gain.gain.setValueAtTime(0.5, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        setOscillator(osc);
        setAlarmPlaying(true);
      }
    } catch (e) {
      console.error("Failed to generate siren audio", e);
    }
  };

  const isCriticalMode = analysisResult?.riskLevel === 'Critical Risk' || analysisResult?.riskLevel === 'CRITICAL';

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-pink-500" />
            AI Decision Assistant
          </h2>
          <p className="text-xs text-gray-400">
            Formulate proactive responses, identify situational patterns, and retain confidence using Gemini models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Input console */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-300">Situation Audit Console</h3>
            </div>

            <textarea
              id="assistant-textarea"
              value={situationInput}
              onChange={(e) => setSituationInput(e.target.value)}
              placeholder="E.g., 'A suspicious sedan has driven past me three times slowly...' or 'My rideshare driver just asked me several highly personal questions and keeps looking at me in the rear view...'"
              rows={4}
              className="w-full bg-[#030712] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 leading-relaxed scrollbar-thin outline-none"
            />

            <button
              id="assistant-analyze-button"
              onClick={() => handleAnalyzeSituation(situationInput)}
              disabled={loading || !situationInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-40 transition-transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Computing Proactive Matrix...</span>
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  <span>Execute AI Assessment</span>
                </>
              )}
            </button>

            {errorText && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 p-3 rounded-lg leading-relaxed flex items-start gap-2 animate-bounce">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}
          </div>

          {/* Preset Prompts Selector */}
          <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 text-left">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">Quick Simulation Paradigms</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
              {preConfiguredSituations.map((situ, idx) => {
                const isEmergencyParadigms = situ.label.includes("🚨");
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSituationInput(situ.text);
                      handleAnalyzeSituation(situ.text);
                    }}
                    className={`p-3 border rounded-xl text-left text-xs transition-colors flex flex-col gap-1 cursor-pointer select-none ${
                      isEmergencyParadigms
                        ? 'bg-red-950/20 hover:bg-red-950/45 border-red-500/20 hover:border-red-500/60'
                        : 'bg-gray-900/40 hover:bg-gray-800/40 border-white/5 hover:border-pink-500/25'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-bold tracking-tight ${
                      isEmergencyParadigms ? 'text-red-400' : 'text-pink-400'
                    }`}>
                      {situ.label}
                    </span>
                    <span className="text-gray-300 font-sans line-clamp-1 italic">
                      "{situ.text}"
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Proactive Evaluation Result display */}
        <div className="lg:col-span-12 xl:col-span-7">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-card rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center space-y-5 h-[480px]"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-16 w-16 rounded-full border-t-2 border-pink-500 animate-spin" />
                  <Brain className="h-8 w-8 text-pink-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-sans font-bold text-white">Gemini situational audit underway...</p>
                  <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                    Analyzing emotional urgency, predictive danger factors, immediate physical redirects, and confidence coordinates before situations escalate.
                  </p>
                </div>
              </motion.div>
            ) : analysisResult ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 text-left animate-in fade-in duration-300"
              >
                {/* Critical Safety Emergency Panel */}
                {isCriticalMode && (
                  <motion.div
                    initial={{ scale: 0.97, opacity: 0 }}
                    animate={{ scale: [1, 1.01, 1], opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                    className="p-4 bg-gradient-to-r from-red-950/60 via-red-900/40 to-amber-950/40 border-2 border-red-500/80 rounded-2xl flex items-center gap-3 shadow-2xl shadow-red-500/10"
                  >
                    <div className="h-10 w-10 shrink-0 bg-red-600/30 border border-red-500 rounded-full flex items-center justify-center">
                      <ShieldAlert className="h-6 w-6 text-red-400 animate-bounce" />
                    </div>
                    <div className="text-left flex-1">
                      <h4 className="text-sm font-mono font-extrabold text-red-200 tracking-wider">
                        CRITICAL THREAT ACTIVATED
                      </h4>
                      <p className="text-[10.5px] text-red-300/90 leading-tight">
                        Apparatus has escalated safeguards. Silent Protection initialized. Pursue immediate physical crowd density.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Main Score & Badges card */}
                <div className={`glass-card rounded-2xl p-5 border relative overflow-hidden ${
                  isCriticalMode ? 'border-red-500/40 bg-gradient-to-br from-[#1a0808]/90 to-[#2c0d0d]/40' : 'border-white/5'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                    isCriticalMode ? 'bg-red-500/10' : 'bg-pink-500/5'
                  }`} />

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${getRiskColor(analysisResult.riskLevel)}`}>
                        RISK: {analysisResult.riskLevel}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${getUrgencyColor(analysisResult.urgency)}`}>
                        URGENCY: {analysisResult.urgency}
                      </span>
                      {isLocalFallback && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/35 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Local Sentinel Engine
                        </span>
                      )}
                    </div>

                    {/* Travel Confidence Meter / Alarm Control */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-bold">Threat Index</div>
                        <div className="text-xs font-mono font-bold text-red-400">
                          {isCriticalMode ? "MAX THREAT" : `${analysisResult.safetyConfidenceScore}/100`}
                        </div>
                      </div>
                      <div 
                        className="h-10 w-10 rounded-full border-2 flex items-center justify-center p-0.5 bg-gray-950/80 shadow-md font-mono font-black text-xs text-white" 
                        style={{ borderColor: isCriticalMode ? '#EF4444' : (analysisResult.safetyConfidenceScore > 50 ? '#10B981' : '#EF4444') }}
                      >
                        {isCriticalMode ? "🚨" : `${analysisResult.safetyConfidenceScore}%`}
                      </div>
                    </div>
                  </div>

                  {/* Fast Action Buttons Dashboard for Escape (Shown if Critical) */}
                  {isCriticalMode && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-red-500/20 mt-4">
                      <a
                        href="tel:911"
                        className="p-3 bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-xl text-center flex flex-col items-center justify-center gap-1 font-mono font-bold text-[10px] uppercase shadow-lg shadow-red-500/20 cursor-pointer active:scale-95 transition-all text-decoration-none"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call Police (911)</span>
                      </a>

                      <button
                        onClick={toggleSirenAlarm}
                        className={`p-3 border rounded-xl text-center flex flex-col items-center justify-center gap-1 font-mono font-bold text-[10px] uppercase cursor-pointer active:scale-95 transition-all outline-none ${
                          alarmPlaying 
                            ? 'bg-amber-600 hover:bg-amber-500 text-black border-amber-400 animate-pulse' 
                            : 'bg-black/60 hover:bg-gray-900 border-red-500/40 text-red-200'
                        }`}
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>{alarmPlaying ? "Stop Alarm" : "Siren Alarm"}</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("Emergency Coords Shared: lat=37.7749 lng=-122.4194 (San Francisco Safe Haven)");
                          alert("Emergency coordinates copied to clipboard & broadcasted to custodians.");
                        }}
                        className="p-3 bg-[#0d0d1a] hover:bg-[#15152b] border border-blue-500/40 text-blue-200 rounded-xl text-center flex flex-col items-center justify-center gap-1 font-mono font-bold text-[10px] uppercase cursor-pointer active:scale-95 transition-all outline-none"
                      >
                        <Radio className="h-4 w-4" />
                        <span>Share Location</span>
                      </button>

                      <button
                        onClick={() => onTriggerSilentProtection && onTriggerSilentProtection()}
                        className="p-3 bg-[#0a1410] hover:bg-[#12241d] border border-emerald-500 text-emerald-400 rounded-xl text-center flex flex-col items-center justify-center gap-1 font-mono font-bold text-[10px] uppercase cursor-pointer active:scale-95 transition-all outline-none"
                      >
                        <Shield className="h-4 w-4 animate-spin-slow" />
                        <span>Tracking Active</span>
                      </button>
                    </div>
                  )}

                  {/* Advisor Guidance Message text */}
                  <div className={`rounded-xl p-4 border mt-3 ${
                    isCriticalMode ? 'bg-[#290c0b]/60 border-red-500/25' : 'bg-[#0b1329]/45 border-white/5'
                  }`}>
                    <h4 className={`text-xs font-display font-bold mb-1 flex items-center gap-1.5 ${
                      isCriticalMode ? 'text-red-400' : 'text-pink-400'
                    }`}>
                      <Compass className={`h-4 w-4 shrink-0 ${isCriticalMode ? 'text-red-500' : 'text-pink-500'} animate-pulse`} />
                      Tactical Survivor Guidance
                    </h4>
                    <p className={`text-xs leading-relaxed italic font-sans font-bold ${
                      isCriticalMode ? 'text-white' : 'text-gray-250 text-gray-200'
                    }`}>
                      "{analysisResult.confidenceGuidance}"
                    </p>
                  </div>
                </div>

                {/* Threat Indicators & Strategic Advice columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Potential Threats or Critical Alert warning panel */}
                  <div className={`glass-card rounded-2xl p-5 border ${
                    isCriticalMode ? 'border-red-500/20 bg-[#160c0d]/90' : 'border-rose-500/10 bg-[#0c080d]'
                  }`}>
                    <h4 className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 mb-3 font-bold ${
                      isCriticalMode ? 'text-red-400' : 'text-rose-400'
                    }`}>
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Critical Threats Identified
                    </h4>
                    <ul className="space-y-2">
                      {analysisResult.possibleThreats.map((threat, idx) => (
                        <li key={idx} className="text-xs text-gray-350 leading-relaxed flex items-start gap-2 font-sans border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                          <span className={`${isCriticalMode ? 'text-red-500' : 'text-rose-500'} font-bold shrink-0 text-xs`}>●</span>
                          <span className={isCriticalMode ? 'text-white font-semibold' : 'text-gray-300'}>{threat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Immediate Recommended Survival Actions */}
                  <div className={`glass-card rounded-2xl p-5 border ${
                    isCriticalMode ? 'border-red-500/30 bg-[#21090c]/90 text-left' : 'border-emerald-500/10 bg-[#060b09]'
                  }`}>
                    <h4 className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 mb-3 font-bold ${
                      isCriticalMode ? 'text-orange-400 animate-pulse' : 'text-emerald-400'
                    }`}>
                      <VerifiedIcon className="h-4 w-4 shrink-0 text-emerald-500 animate-pulse" />
                      Recommended Immediate Actions
                    </h4>
                    <ul className="space-y-2">
                      {analysisResult.recommendedActions.map((action, idx) => (
                        <li key={idx} className="text-xs leading-relaxed flex items-start gap-2 font-sans border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${isCriticalMode ? 'text-red-450 text-red-500' : 'text-emerald-400'}`} />
                          <span className={isCriticalMode ? 'text-white font-black' : 'text-gray-300'}>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Safe redirections & Safe Havens Panel */}
                <div className={`glass-card rounded-2xl p-5 border ${
                  isCriticalMode ? 'border-red-500/20 bg-gradient-to-b from-[#130707] to-gray-950/80' : 'border-white/5'
                } space-y-4`}>
                  <h4 className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                    isCriticalMode ? 'text-red-400' : 'text-indigo-400'
                  }`}>
                    {isCriticalMode ? "🚨 DE-ESCALATION LOCATIONS & HOSPITALS (SAFE-HAVENS)" : "Safe Redirection & Local Support Suggestions"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    <div className={`${isCriticalMode ? 'bg-red-950/10 border-red-500/10' : 'bg-[#0b1329]/30'} p-4 rounded-xl border border-white/5`}>
                      <h5 className={`font-display font-medium mb-2 text-xs flex items-center gap-1.5 ${
                        isCriticalMode ? 'text-red-400' : 'text-indigo-300'
                      }`}>
                        <MapPin className="h-3.5 w-3.5" />
                        Move Toward Safety Targets
                      </h5>
                      <ul className="space-y-2 text-gray-300 font-sans">
                        {analysisResult.saferAlternatives.map((alt, idx) => (
                          <li key={idx} className="list-disc list-inside leading-normal text-[11px] font-semibold">{alt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={`${isCriticalMode ? 'bg-red-950/20 border-red-500/20' : 'bg-[#0b1329]/30'} p-4 rounded-xl border border-white/5`}>
                      <h5 className={`font-display font-medium mb-2 text-xs flex items-center gap-1.5 ${
                        isCriticalMode ? 'text-emerald-400' : 'text-emerald-300'
                      }`}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Pillars of Active Protection
                      </h5>
                      <ul className="space-y-2 text-gray-300 font-sans">
                        {analysisResult.nearbyHelp.map((help, idx) => (
                          <li key={idx} className="list-disc list-inside leading-normal text-[11px] font-black tracking-wide text-white">{help}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-2xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-4 h-[480px]"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-pink-500/10 to-indigo-500/10 border border-white/10 text-pink-500 flex items-center justify-center shadow-lg">
                  <Brain className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-sans font-bold text-white">Assessment Matrix Empty</p>
                  <p className="text-xs text-gray-400 max-w-[320px] leading-relaxed mx-auto">
                    Type a travel situation or select a quick simulation option on the left to start the safety decision support flow.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
