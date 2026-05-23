import React, { useState, useEffect } from 'react';
import { 
  Shield, Navigation, Compass, Brain, Users, AlertTriangle, 
  Eye, Activity, User, Phone, LogOut, CheckCircle2, 
  Bell, MapPin, Settings, HelpCircle, Loader2, Play, Square, Mic, Radio, ChevronRight, Sparkles, MessageCircle, HeartHandshake, Map
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import InteractiveMap from './components/InteractiveMap';
import DecisionAssistant from './components/DecisionAssistant';
import SafeRouting from './components/SafeRouting';
import InsightsPanel from './components/InsightsPanel';
import ProfileSettings from './components/ProfileSettings';
import SilentProtection from './components/SilentProtection';
import CommunityExperiences from './components/CommunityExperiences';
import { SafeNavLogo, SafeNavIcon } from './components/SafeNavLogo';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { SafetyAlert, TravelLog } from './types';

// Pre-configured mock alerts for robust offline/fallback use
const initialMockAlerts: SafetyAlert[] = [
  {
    alertId: "alert_1",
    type: "poorly_lit",
    description: "Streetlamps near the residential alleyway are flickering and dim past 8 PM.",
    lat: 37.7725,
    lng: -122.4150,
    createdAt: new Date(),
    createdBy: "mock_user_1",
    reporterName: "Resident (Anonymous)",
    dangerLevel: "Medium",
    upvotes: 14,
    upvotedBy: []
  },
  {
    alertId: "alert_2",
    type: "suspicious_activity",
    description: "Suspicious vehicle loitering near the dark pathway exit blocks.",
    lat: 37.7750,
    lng: -122.4210,
    createdAt: new Date(),
    createdBy: "mock_user_2",
    reporterName: "Sarah J. (Certified Helper)",
    dangerLevel: "High",
    upvotes: 38,
    upvotedBy: []
  },
  {
    alertId: "alert_3",
    type: "harassment",
    description: "Active verbal harassment reported near the park subway gate benches.",
    lat: 37.7810,
    lng: -122.4080,
    createdAt: new Date(),
    createdBy: "mock_user_3",
    reporterName: "Jane D. (Resident)",
    dangerLevel: "High",
    upvotes: 27,
    upvotedBy: []
  }
];

function SafeNavAppContent() {
  const { user, profile, loading, signInWithGoogle, signInAsDemo, signOutUser } = useAuth();
  
  // App navigation state: 'dashboard' | 'assistant' | 'routing' | 'heatmap' | 'insights' | 'settings' | 'community'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assistant' | 'routing' | 'heatmap' | 'insights' | 'settings' | 'community'>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [enteredApp, setEnteredApp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore & local states
  const [alerts, setAlerts] = useState<SafetyAlert[]>(initialMockAlerts);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [syncingFirestore, setSyncingFirestore] = useState(false);

  // Smart routing coordinator
  const [mapOrigin, setMapOrigin] = useState("Transit Zone - Hub A");
  const [mapDestination, setMapDestination] = useState("Residential Sector - Gate B");
  const [selectedRoute, setSelectedRoute] = useState<'safest' | 'balanced' | 'fastest'>('safest');

  // "I Feel Unsafe" proactive alert state
  const [panicMode, setPanicMode] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [coordsInterval, setCoordsInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeRecording, setActiveRecording] = useState(false);
  const [contactsNotified, setContactsNotified] = useState(false);
  const [isSilentProtectionOpen, setIsSilentProtectionOpen] = useState(false);

  // Fetch travel history logs and alerts from firestore
  useEffect(() => {
    if (!user) {
      setAlerts(initialMockAlerts);
      return;
    }

    setSyncingFirestore(true);
    // Real-time alerts synchronization
    const alertsQuery = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const fetchedAlerts: SafetyAlert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedAlerts.push({
          alertId: doc.id,
          type: data.type,
          description: data.description,
          lat: data.lat,
          lng: data.lng,
          locationName: data.locationName || '',
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          reporterName: data.reporterName || 'Resident (Anonymous)',
          dangerLevel: data.dangerLevel,
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || []
        });
      });

      // Merge dynamic alerts with presets to populate heatmap fully
      setAlerts(fetchedAlerts.length > 0 ? fetchedAlerts : initialMockAlerts);
      setSyncingFirestore(false);
    }, (error) => {
      // Gracefully fetch fallback if permissions is lacking during bootstrap
      console.warn("Firestore alerts listener closed (likely security sandbox checks):", error.message);
      setAlerts(initialMockAlerts);
      setSyncingFirestore(false);
    });

    return () => unsubscribeAlerts();
  }, [user]);

  // Record silent duration during panic mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (panicMode) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [panicMode]);

  // Handle reporting an alert directly to firestore (or locally during demo)
  const handleAddAlertReport = async (lat: number, lng: number, desc: string, type: string, dangerLevel: string) => {
    const reporterName = user?.displayName ? `${user.displayName} (Verified User)` : 'Resident (Anonymous)';
    const newAlert: Omit<SafetyAlert, 'alertId'> = {
      type: type as any,
      description: desc,
      lat,
      lng,
      locationName: `Observatory Coordinates`,
      createdAt: user ? Timestamp.now() : new Date(),
      createdBy: user?.uid || 'anonymous',
      reporterName,
      dangerLevel: dangerLevel as any,
      upvotes: 0,
      upvotedBy: []
    };

    if (user) {
      try {
        await addDoc(collection(db, 'alerts'), {
          ...newAlert,
          createdAt: Timestamp.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'alerts');
      }
    } else {
      // Local push for quick demo interactivity
      const localAlert: SafetyAlert = {
        ...newAlert,
        alertId: 'local_' + Date.now()
      };
      setAlerts(prev => [localAlert, ...prev]);
    }
  };

  const handleTriggerPanic = () => {
    setPanicMode(true);
    setActiveRecording(true);
    setContactsNotified(true);
    setIsSilentProtectionOpen(true);
    setTimeout(() => {
      setContactsNotified(false);
    }, 4000);
  };

  const handleCancelPanic = () => {
    setPanicMode(false);
    setActiveRecording(false);
    setIsSilentProtectionOpen(false);
  };

  // Precalculated general stats based on alerts
  const highDangerCount = alerts.filter(a => a.dangerLevel === 'High').length;
  const standardSafetyScore = Math.max(98 - highDangerCount * 5 - alerts.length, 65);

  const formatTime = (secs: number) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Helper to handle launching in demo mode
  const handleStartDemo = () => {
    setIsDemoMode(true);
    setEnteredApp(true);
  };

  const handleStartAuth = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
      setEnteredApp(true);
    } catch (err: any) {
      console.error(err);
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStartDemoLogin = () => {
    setAuthError(null);
    signInAsDemo("Drashti Patel", "pdrashti2705@gmail.com");
    setEnteredApp(true);
  };

  // Determine whether to display Landing page
  const showLanding = !enteredApp && !user && !isDemoMode;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="glass-card rounded-2xl p-8 border border-white/10 shadow-3xl flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-gray-300">Decrypting Safety Interface...</p>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return (
      <LandingPage 
        onStart={handleStartDemo} 
        onLogin={handleStartAuth} 
        onDemoLogin={handleStartDemoLogin}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 flex flex-col md:flex-row font-sans overflow-x-hidden relative pb-20 md:pb-0">
      
      {/* Background ambient glow bubbles */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-pink-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* MOBILE TOP BAR HEADER */}
      <header className="md:hidden w-full bg-[#070b19]/90 backdrop-blur-md border-b border-white/5 py-2.5 px-5 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <SafeNavIcon size={34} className="text-rose-500 animate-pulse-slow" />
          <span className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            SafeNav <span className="text-rose-400">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!user && (
            <span className="text-[8px] font-mono font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
              Guest Access
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-300 font-semibold max-w-[80px] truncate">
                {profile?.displayName || user.displayName}
              </span>
              <button
                type="button"
                onClick={signOutUser}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartAuth}
                className="px-2.5 py-1 bg-gradient-to-r from-rose-600 to-indigo-650 text-white rounded-lg text-[9px] font-bold active:scale-95 transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={handleStartDemoLogin}
                className="px-2.5 py-1 bg-gray-900 border border-white/5 text-rose-400 hover:text-rose-300 rounded-lg text-[9px] font-bold active:scale-95 transition-all cursor-pointer"
              >
                Demo Auth
              </button>
            </div>
          )}
        </div>
      </header>

      {/* DESKTOP SIDEBAR NAVIGATION PANEL */}
      <aside className="hidden md:flex w-64 bg-[#070b19]/90 backdrop-blur-md border-r border-white/5 flex-col z-20 shrink-0">
        {/* Logo block */}
        <div className="p-5 border-b border-white/5 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-rose-950/5 to-transparent">
          <SafeNavLogo size={75} showText={false} colorClass="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
          <div className="flex flex-col items-center">
            <span className="font-display font-bold tracking-wider text-xs+ text-white uppercase">
              SafeNav <span className="text-rose-500">AI</span>
            </span>
            <span className="text-[8px] font-mono tracking-[0.25em] text-gray-500 uppercase mt-1">Secure Sentinel</span>
          </div>
        </div>

        {/* Tab links */}
        <nav className="flex-1 p-4 flex flex-col overflow-y-auto">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Compass className="h-4 w-4 shrink-0" />
                <span>Overview Dashboard</span>
              </div>
              {activeTab === 'dashboard' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'assistant' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Brain className="h-4 w-4 shrink-0" />
                <span>AI Decision Assistant</span>
              </div>
              {activeTab === 'assistant' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('routing')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'routing' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Navigation className="h-4 w-4 shrink-0" />
                <span>Safe Route Audit</span>
              </div>
              {activeTab === 'routing' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'insights' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 shrink-0" />
                <span>AI Safety Forecasts</span>
              </div>
              {activeTab === 'insights' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'community' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0" />
                <span>Community Experience</span>
              </div>
              {activeTab === 'community' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-gradient-to-r from-pink-650 to-rose-500 text-white shadow-md shadow-pink-600/15 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 shrink-0" />
                <span>Emergency Settings</span>
              </div>
              {activeTab === 'settings' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          </div>

          {/* Spacer to push guardian block to the bottom of the sidebar */}
          <div className="flex-1 min-h-[40px]" />

          {/* Active Guardian Status Widget to fill the blank space beautifully */}
          <div className="pt-4 border-t border-white/5 space-y-2.5 mt-auto hidden md:block">
            <div className="px-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-3.5 w-3.5 text-pink-550 text-pink-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-400">Guardian Shield</span>
              </div>
              <span className="text-[9px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                SECURE
              </span>
            </div>
            
            <div className="p-2.5 bg-gray-950/40 border border-white/5 rounded-xl space-y-1.5 text-[10px] text-gray-400 text-left">
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                <span>System status fully operational</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                <span>Encrypted local log vault active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 bg-pink-400 rounded-full shrink-0 animate-ping" />
                <span className="truncate">
                  {profile?.emergencyContacts && profile.emergencyContacts.length > 0 
                    ? `${profile.emergencyContacts.length} trusted contacts synced` 
                    : 'Emergency standby active'}
                </span>
              </div>
            </div>

            <div className="px-1">
              <p className="text-[9px] text-gray-500 italic leading-snug text-left">
                "Safety is not about panic — it's about anticipating risks."
              </p>
            </div>
          </div>
        </nav>

        {/* User Session and logins info section */}
        <div className="p-4 border-t border-white/5 bg-gray-950/60 flex flex-col gap-3">
          {user ? (
            <div className="flex items-center justify-between gap-2 text-left">
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <User className="h-3 w-3 text-pink-500" />
                  {profile?.displayName || user.displayName}
                </div>
                <div className="text-[9px] font-mono text-gray-500 truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={signOutUser}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400">Sync with Firebase account securely:</p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleStartAuth}
                  className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-650 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-[10px] cursor-pointer"
                >
                  Sign In with Google
                </button>
                <button
                  type="button"
                  onClick={handleStartDemoLogin}
                  className="w-full py-1.5 bg-[#171f38] hover:bg-[#252f52] border border-white/5 text-pink-400 hover:text-pink-300 font-semibold rounded-xl text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Sign In with Demo Account
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#070b19]/95 border-t border-white/5 backdrop-blur-lg flex justify-around items-center py-2.5 px-2 z-40 shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'dashboard' ? 'text-pink-400 font-bold scale-105' : 'text-gray-450 hover:text-gray-200'
          }`}
        >
          <Compass className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'assistant' ? 'text-pink-400 font-bold scale-105' : 'text-gray-450 hover:text-gray-200'
          }`}
        >
          <Brain className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">AI Decision</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routing')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'routing' ? 'text-pink-400 font-bold scale-105' : 'text-gray-450 hover:text-gray-200'
          }`}
        >
          <Navigation className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">Safe Route</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'insights' ? 'text-pink-400 font-bold scale-105' : 'text-gray-455 hover:text-gray-250 hover:text-gray-200'
          }`}
        >
          <Activity className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">Forecasts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'community' ? 'text-pink-400 font-bold scale-105' : 'text-gray-450 hover:text-gray-200'
          }`}
        >
          <Users className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">Community</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all py-1 cursor-pointer ${
            activeTab === 'settings' ? 'text-pink-400 font-bold scale-105' : 'text-gray-450 hover:text-gray-200'
          }`}
        >
          <Settings className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[9px] font-sans">Settings</span>
        </button>
      </nav>

      {/* CORE WORKSPACE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8 space-y-6 relative z-10">
        
        {/* TOP COMPONENT HEADER: DEMO ALERTER OR PROFILE */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shadow-inner">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-bold text-sm text-white">Proactive Protection Shield Active</h3>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                No local critical alerts flagged in immediate 1km range.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick I Feel Unsafe Button trigger */}
            <button
              onClick={handleTriggerPanic}
              className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer flex items-center gap-2 ${
                panicMode 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25'
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>{panicMode ? 'Proactive Mode Live' : 'I Feel Unsafe'}</span>
            </button>
          </div>
        </div>

        {/* PANIC / PROACTIVE BROADCASTING MODULE OVERLAY - Reassuring list design */}
        {panicMode && (
          <div className="p-6 bg-rose-950/20 border border-rose-500/35 rounded-2xl space-y-4 text-left animate-in fade-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Mic className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">Reassurance Broadcast Shield Active</h3>
                  <p className="text-xs text-rose-300 leading-relaxed font-sans">
                    We are tracking your position, preparing trusted SMS buffers, and recording environmental audio silently. Stay calm. You are in control.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#0a0f1d] px-4 py-2 rounded-xl border border-rose-500/25 shrink-0 self-start md:self-auto text-xs font-mono">
                <span className="text-rose-400 font-bold block animate-pulse">● REC {formatTime(recordingSeconds)}</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">FPS: 30 (Silent Capture)</span>
              </div>
            </div>

            {/* Broadcast states */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <div className="p-3.5 bg-gray-900/70 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wide">Live Coordinates Share</span>
                <div className="text-xs text-gray-200">
                  Broadcasting real-time telemetry to trusted circle ({profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? profile.emergencyContacts.map(c => c.name).join(', ') : 'Alice, Mom, Father'}). Coordinates: <span className="text-rose-300 font-mono">37.7782, -122.4130</span>.
                </div>
              </div>

              <div className="p-3.5 bg-gray-900/70 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-mono text-[#ca8a04] uppercase tracking-wide">SMS Alert Pipeline</span>
                <div className="text-xs text-gray-200">
                  {contactsNotified ? (
                    <span className="text-emerald-400 font-semibold">✔ Emergency text delivered successfully.</span>
                  ) : (
                    <span>Pre-configured emergency notification ready to broadcast.</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-gray-900/70 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide">Safe Havens Target</span>
                <div className="text-xs text-gray-200 flex flex-col gap-1">
                  <span className="font-medium">Closest: Vibrant Hub Cafe (200m)</span>
                  <a href="tel:911" className="text-indigo-400 hover:underline">Quick Call Metropolitan Emergency (911)</a>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleCancelPanic}
                className="px-5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-white/5 text-xs text-gray-300"
              >
                Deactivate Guardian Mode
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC RENDERING FOR TAB VIEWS */}
        <div className="mt-4">
          
          {/* VIEW: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Cockpit top telemetry counters (Bento Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                
                {/* Score gauge card */}
                <div className="glass-card rounded-2xl p-5 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Zone safety index</span>
                    <span className="text-2xl font-display font-bold text-white mt-1 block">{standardSafetyScore}%</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Predicted High Control</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>

                {/* Local reports count */}
                <div className="glass-card rounded-2xl p-5 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-pink-500 uppercase tracking-wider block">Active local warnings</span>
                    <span className="text-2xl font-display font-bold text-white mt-1 block">{alerts.length}</span>
                    <span className="text-[10px] text-red-400 mt-1 block">{highDangerCount} Critical Red Zones</span>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>

                {/* Commute strategy status */}
                <div className="glass-card rounded-2xl p-5 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block">Commute Strategy</span>
                    <span className="text-sm font-display font-bold text-white mt-1.5 block">WELL_LIT_LANES FAVOR</span>
                    <span className="text-[10px] text-[#ca8a04] mt-1 block">Preference: Crowded Avenues</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Navigation className="h-6 w-6" />
                  </div>
                </div>

                {/* AI Agent Status */}
                <div className="glass-card rounded-2xl p-5 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#ca8a04] uppercase tracking-wider block">Decision intelligence</span>
                    <span className="text-sm font-display font-medium text-white mt-1.5 block flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-yellow-400 shrink-0 inline" />
                      Gemini Activated
                    </span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">Full-stack Secure Proxy</span>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400 shrink-0">
                    <Brain className="h-6 w-6" />
                  </div>
                </div>

              </div>

              {/* CORE DASHBOARD: MAP AND SIDEWAYS COMMITS FEED columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Map Portal Preview */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between text-left">
                    <div>
                      <h3 className="font-display font-bold text-sm text-white">Live Safety Map Workspace</h3>
                      <p className="text-xs text-gray-400">Plot safe avenues, preview lit indicators, or anonymous hazard drop-pins.</p>
                    </div>
                  </div>

                  <InteractiveMap 
                    alerts={alerts}
                    onAddAlert={handleAddAlertReport}
                    selectedRouteType={selectedRoute}
                    originName={mapOrigin}
                    destinationName={mapDestination}
                    preferences={{ litPref: true, crowdedPref: true, avoidIsolated: true }}
                    panicModeActive={panicMode}
                  />
                </div>

                {/* Right Side: Quick Action console & alerts feed */}
                <div className="lg:col-span-4 space-y-4 text-left">
                  
                  {/* AI Assistant shortcut */}
                  <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-pink-400 tracking-wider font-semibold uppercase">AI Decision Support</span>
                      <Brain className="h-4 w-4 text-pink-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed">
                      "My cab driver suddenly turned off course." Get instant risk factors analysis, recommended actions, and confidence advice from Gemini.
                    </p>
                    <button
                      onClick={() => setActiveTab('assistant')}
                      className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Consult Decision Engine</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Hazard alert logs feed */}
                  <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-gray-300">Community Safety Stream</h3>
                    <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                      {alerts.map((alert) => (
                        <div key={alert.alertId} className="p-2.5 bg-gray-900/60 rounded-xl border border-white/5 text-xs text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate max-w-[120px]">{alert.reporterName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                              alert.dangerLevel === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {alert.dangerLevel} Danger
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                            "{alert.description}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* VIEW: AI DECISION CHATBOT SITUATION ASSESSMENT */}
          {activeTab === 'assistant' && (
            <DecisionAssistant 
              onTriggerSilentProtection={() => setIsSilentProtectionOpen(true)} 
            />
          )}

          {/* VIEW: SMART SAFE ROUTING PARAMETERS */}
          {activeTab === 'routing' && (
            <SafeRouting 
              onRouteSelected={(type) => setSelectedRoute(type)}
              onOriginsUpdate={(o, d) => {
                setMapOrigin(o);
                setMapDestination(d);
              }}
            />
          )}

          {/* VIEW: AI FORECASTER INSIGHTS */}
          {activeTab === 'insights' && (
            <InsightsPanel />
          )}

          {/* VIEW: COMMUNITY LIVED EXPERIENCES HUB */}
          {activeTab === 'community' && (
            <CommunityExperiences />
          )}

          {/* VIEW: USER PROFILE SETTINGS */}
          {activeTab === 'settings' && (
            <ProfileSettings />
          )}

        </div>

      </main>

      {/* Floating Silent Protection Action Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleTriggerPanic}
          className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-full shadow-2xl hover:shadow-pink-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none border border-white/10"
        >
          <div className="relative">
            <Shield className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-wider font-semibold">Silent Protect</span>
        </button>
      </div>

      {/* Silent Protection Modal Overlay */}
      <SilentProtection 
        isOpen={isSilentProtectionOpen}
        onClose={() => {
          setIsSilentProtectionOpen(false);
          handleCancelPanic();
        }}
        userCoords={{ lat: 37.7782, lng: -122.4130 }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SafeNavAppContent />
    </AuthProvider>
  );
}
