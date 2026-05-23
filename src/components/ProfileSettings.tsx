import React, { useState } from 'react';
import { User, Phone, Users, Shield, Save, Sliders, Bell, Eye, EyeOff, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmergencyContact } from '../types';

export default function ProfileSettings() {
  const { profile, updateUserPreferences, updateUserEmergencyContacts } = useAuth();
  
  // Local form inputs state
  const [dispName, setDispName] = useState(profile?.displayName || 'Traveler');
  
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Friend');

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  // Preference fields state
  const [litPref, setLitPref] = useState(profile?.preferences?.litPref ?? true);
  const [crowdedPref, setCrowdedPref] = useState(profile?.preferences?.crowdedPref ?? true);
  const [avoidIsolated, setAvoidIsolated] = useState(profile?.preferences?.avoidIsolated ?? true);
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT'>(profile?.preferences?.travelMode ?? 'WALKING');

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setShowSavedMsg(false);
    try {
      await updateUserPreferences({
        litPref,
        crowdedPref,
        avoidIsolated,
        travelMode
      });
      setShowSavedMsg(true);
      setTimeout(() => setShowSavedMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const currentContacts = profile?.emergencyContacts || [];
    const newContact: EmergencyContact = {
      id: 'contact_' + Date.now(),
      name: contactName,
      phone: contactPhone,
      relation: contactRelation,
      isActiveShare: true
    };

    const updatedContacts = [...currentContacts, newContact];
    try {
      await updateUserEmergencyContacts(updatedContacts);
      setContactName('');
      setContactPhone('');
      setContactRelation('Friend');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    const currentContacts = profile?.emergencyContacts || [];
    const updatedContacts = currentContacts.filter(c => c.id !== contactId);
    try {
      await updateUserEmergencyContacts(updatedContacts);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-indigo-400" />
          Settings & Profile Setup
        </h2>
        <p className="text-xs text-gray-400">
          Sync emergency trusted circles, choose commuter strategies, and personalize telemetry details securely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Safety preferences */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSavePreferences} className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-300">Commuter Safety Preferences</h3>
            </div>

            <div className="space-y-4">
              
              {/* Preferred commute modes */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Standard Commute Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['WALKING', 'DRIVING', 'BICYCLING', 'TRANSIT'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTravelMode(mode)}
                      className={`py-2 rounded-lg border text-xs font-semibold ${
                        travelMode === mode 
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500' 
                          : 'bg-gray-900 hover:bg-gray-800 border-white/5 text-gray-400'
                      }`}
                    >
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles switches list */}
              <div className="p-3 bg-gray-900 rounded-xl space-y-3">
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Avoid poorly-lit sectors</span>
                    <span className="text-[10px] text-gray-400">Filter routes favoring streets with active lampposts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={litPref}
                    onChange={(e) => setLitPref(e.target.checked)}
                    className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Prioritize active crowds</span>
                    <span className="text-[10px] text-gray-400">Favor avenues with running establishments, coffee hubs, and transit lines</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={crowdedPref}
                    onChange={(e) => setCrowdedPref(e.target.checked)}
                    className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Strict isolated evacuation warnings</span>
                    <span className="text-[10px] text-gray-400">Send warning alerts if coordinates trigger isolated behavior patterns</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={avoidIsolated}
                    onChange={(e) => setAvoidIsolated(e.target.checked)}
                    className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                  />
                </div>

              </div>

            </div>

            <div className="flex items-center justify-between pt-2">
              {showSavedMsg && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Preferences updated safely.
                </span>
              )}
              <button
                type="submit"
                disabled={savingPrefs}
                className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-55"
              >
                {savingPrefs ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Guard Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy HUD Overview card */}
          <div className="glass-card rounded-2xl p-5 border border-white/5 text-xs text-gray-400 leading-relaxed font-sans space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#ca8a04]">🔒 Zero-Trust Privacy Shield</h4>
            <p>
              Your travel history logs and custom emergency contacts are encrypted client-side and locked using secure Firebase firestore rules. We never sell location telemetry or package personal profiles to advertisers.
            </p>
          </div>
        </div>

        {/* Right Column: Emergency circle list management */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-500" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-300">Emergency Trusted Circle</h3>
            </div>

            {/* List current trusted circle */}
            <div className="space-y-3">
              {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                profile.emergencyContacts.map((contact) => (
                  <div key={contact.id} className="p-3 bg-gray-900 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center font-display font-black text-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {contact.name}
                          <span className="text-[8px] font-mono leading-none bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded tracking-wide uppercase">
                            {contact.relation}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3 inline text-gray-500" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact.id)}
                      className="text-[10px] font-mono text-red-400 hover:text-red-300 hover:underline px-2.5 py-1 rounded bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 bg-gray-900/40 rounded-xl text-center border border-white/5 text-gray-400 flex flex-col items-center justify-center space-y-2">
                  <Phone className="h-8 w-8 text-pink-500/30" />
                  <p className="text-xs">Your trusted safety circle is empty.</p>
                  <p className="text-[10px] text-gray-500">Add trusted friends, family, or neighborhood guards below.</p>
                </div>
              )}
            </div>

            {/* Add Trusted contacts form */}
            <form onSubmit={handleAddContact} className="pt-4 border-t border-white/5 space-y-3 text-left">
              <h5 className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Append Trusted Guardian</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Contact Name input */}
                <div>
                  <label className="block text-[9px] font-mono text-gray-400 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Alice Smith"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                    required
                  />
                </div>

                {/* Contact phone input */}
                <div>
                  <label className="block text-[9px] font-mono text-gray-400 mb-1">Emergency Calls Line</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                    required
                  />
                </div>
              </div>

              {/* Relationship options */}
              <div className="grid grid-cols-4 gap-2">
                {(['Parent', 'Sibling', 'Partner', 'Friend'] as const).map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => setContactRelation(rel)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold text-center cursor-pointer transition-colors ${
                      contactRelation === rel 
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' 
                        : 'bg-gray-900 border border-white/5 text-gray-400'
                    }`}
                  >
                    {rel}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!contactName.trim() || !contactPhone.trim()}
                className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Add Contact to Shield</span>
              </button>
            </form>

          </div>
        </div>

      </div>

    </div>
  );
}
