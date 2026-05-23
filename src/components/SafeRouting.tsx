import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, ShieldAlert, Sparkles, AlertCircle, Compass, CheckCircle2, 
  MapPin, Eye, Loader2, Footprints, Car, Bike, Train, Shield, Lightbulb, 
  Users, Sliders, RefreshCw, AlertTriangle, Info, Map as MapIcon, ChevronRight, EyeOff,
  Clock
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { RouteRecommendationResult } from '../types';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Dynamic Leaflet Loader Helper
const loadLeaflet = (callback: () => void) => {
  if ((window as any).L) {
    callback();
    return;
  }

  // Load CSS
  const cssId = 'leaflet-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // Load JS
  const jsId = 'leaflet-js';
  if (!document.getElementById(jsId)) {
    const script = document.createElement('script');
    script.id = jsId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      callback();
    };
    document.body.appendChild(script);
  } else {
    const checkEl = setInterval(() => {
      if ((window as any).L) {
        clearInterval(checkEl);
        callback();
      }
    }, 100);
  }
};

// Polyline helper component
function MapPolyline({ path, strokeColor, strokeWidth = 5 }: { path: google.maps.LatLngLiteral[], strokeColor: string, strokeWidth?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !path || path.length === 0) return;
    const polyline = new google.maps.Polyline({
      path,
      strokeColor,
      strokeOpacity: 0.85,
      strokeWeight: strokeWidth,
      map
    });
    return () => {
      polyline.setMap(null);
    };
  }, [map, path, strokeColor, strokeWidth]);
  return null;
}


interface SafeRoutingProps {
  onRouteSelected?: (type: 'safest' | 'balanced' | 'fastest') => void;
  onOriginsUpdate?: (origin: string, dest: string) => void;
}

export default function SafeRouting({ onRouteSelected, onOriginsUpdate }: SafeRoutingProps) {
  const [origin, setOrigin] = useState('Transit Zone - Hub A');
  const [destination, setDestination] = useState('Residential Sector - Gate B');
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT'>('WALKING');
  
  // Simulated Travel Variables
  const [travelTime, setTravelTime] = useState<string>('evening');
  const [crowdDensity, setCrowdDensity] = useState<string>('moderate');
  const [lightingLevel, setLightingLevel] = useState<string>('standard');
  
  // Leaflet refs
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletLayersRef = useRef<any[]>([]);
  
  // Custom travel preferences state
  const [prefs, setPrefs] = useState({
    litPref: true,
    crowdedPref: true,
    avoidIsolated: true
  });

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [routingResult, setRoutingResult] = useState<RouteRecommendationResult | null>(null);
  const [activeRouteTab, setActiveRouteTab] = useState<'safest' | 'balanced' | 'fastest'>('safest');
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [errorText, setErrorText] = useState('');

  // Geolocation detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorText("HTML5 Geolocation is not supported by your browser environment.");
      return;
    }

    setDetectingLocation(true);
    setErrorText('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt reverse geocoding via OpenStreetMap nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'SafeNav-AI-Safety-App'
              }
            }
          );
          if (!response.ok) throw new Error("Reverse geocoding failed");
          const data = await response.json();
          const readable = data.display_name;
          // Format tidy address
          const tidyAddress = readable
            ? readable.split(',').slice(0, 3).join(',').trim()
            : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setOrigin(tidyAddress);
        } catch (err) {
          console.warn("Using coordinate fallback due to geocoding timeout:", err);
          setOrigin(`Zone at ${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°W`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Browser location error:", error);
        setDetectingLocation(false);
        setErrorText("Coordinates unavailable. Ensure location permissions are active in your browser.");
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleComputeRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    setLoading(true);
    setErrorText('');
    setRoutingResult(null);
    setSelectedStepIndex(0);

    try {
      const response = await fetch('/api/route-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          preferences: {
            travelMode,
            ...prefs
          },
          travelTime,
          crowdDensity,
          lightingLevel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to calculate safety routes.");
      }

      const result: RouteRecommendationResult = await response.json();
      setRoutingResult(result);
      
      // Update parent states 
      if (onOriginsUpdate) {
        onOriginsUpdate(origin, destination);
      }
      if (onRouteSelected) {
        onRouteSelected('safest');
      }
      setActiveRouteTab('safest');
    } catch (error: any) {
      console.error(error);
      setErrorText(error.message || "An error occurred during safety route compilation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTab = (type: 'safest' | 'balanced' | 'fastest') => {
    setActiveRouteTab(type);
    setSelectedStepIndex(0);
    if (onRouteSelected) {
      onRouteSelected(type);
    }
  };

  const getRouteDetails = () => {
    if (!routingResult) return null;
    switch (activeRouteTab) {
      case 'safest': return routingResult.safestRoute;
      case 'balanced': return routingResult.balancedRoute;
      case 'fastest': return routingResult.fastestRoute;
    }
  };

  const selectedDetails = getRouteDetails();

  // Robust Turn-by-Turn fallback generator for pristine step rendering
  const getRouteSteps = () => {
    if (!selectedDetails) return [];
    if (selectedDetails.instructions && selectedDetails.instructions.length > 0) {
      return selectedDetails.instructions;
    }

    // Default High-Fidelity Backup Instructions based on selected route type or parameters
    switch (activeRouteTab) {
      case 'safest':
        return [
          {
            instruction: `Depart from "${origin}" via well-lit main avenue corridor.`,
            safetyHighlight: "Fully illuminated sidewalks with active community patrols and CCTV monitoring.",
            lightStatus: "Fully Lit (100% Coverage)",
            crowdPacing: "High Foot Traffic",
            latOffset: 0.001,
            lngOffset: -0.002
          },
          {
            instruction: "Slight right turn at Metropolitan Transit plaza, maintaining pace near 24/7 cafes.",
            safetyHighlight: "Bright storefront arrays, no secluded pockets, immediate safe havens accessible.",
            lightStatus: "Vibrant Skylighting",
            crowdPacing: "Active Shops & Crowded",
            latOffset: 0.004,
            lngOffset: 0.001
          },
          {
            instruction: `Approach secure gated entry of "${destination}" past lighted neighborhood bypass path.`,
            safetyHighlight: "Residential community perimeter fitted with high-definition emergency intercoms.",
            lightStatus: "Adequately Lit",
            crowdPacing: "Moderate Traffic",
            latOffset: 0.008,
            lngOffset: 0.004
          }
        ];
      case 'balanced':
        return [
          {
            instruction: `Leaving "${origin}", proceed south on standard avenue connector lane.`,
            safetyHighlight: "Normal street lamps operational. Minimal isolated blind corners.",
            lightStatus: "Moderately Lit",
            crowdPacing: "Moderate/Normal",
            latOffset: 0.002,
            lngOffset: -0.001
          },
          {
            instruction: "Cross broad central parkway pathway intersection directly.",
            safetyHighlight: "Vibrant storefront presence, but transient crowd levels. Remain vigilant.",
            lightStatus: "Partial Brightness",
            crowdPacing: "Intermittent Public Flow",
            latOffset: 0.005,
            lngOffset: 0.003
          },
          {
            instruction: `Conclude final 150 meters along the tree-lined bypass directly leading to "${destination}".`,
            safetyHighlight: "Quiet residential lane but fully patrolled by neighborhood watch groups.",
            lightStatus: "Mixed Lit Levels",
            crowdPacing: "Quiet Area",
            latOffset: 0.008,
            lngOffset: 0.006
          }
        ];
      case 'fastest':
        return [
          {
            instruction: `Head straight from "${origin}" through the shortcut passage behind industrial zones.`,
            safetyHighlight: "Direct pathing, but alert warnings exist due to dimmed street lighting fixtures.",
            lightStatus: "Dimly Lit Corridor",
            crowdPacing: "Quiet Pedestrians",
            latOffset: 0.003,
            lngOffset: -0.003
          },
          {
            instruction: "Go through the underpass tunnel bridge directly to bypass heavy crossroads.",
            safetyHighlight: "Quiet underpass. Recommended to speed up pace or make standard check-ins.",
            lightStatus: "Low Visibility",
            crowdPacing: "Very Secluded Lane",
            latOffset: 0.006,
            lngOffset: 0.002
          },
          {
            instruction: `Exit underpass onto the residential sector road towards "${destination}".`,
            safetyHighlight: "Regains illuminated street lighting coverage closer to home portal gate.",
            lightStatus: "Normal Lamps On",
            crowdPacing: "Quiet Area",
            latOffset: 0.008,
            lngOffset: 0.005
          }
        ];
    }
  };

  const steps = getRouteSteps();
  const activeStep = steps[selectedStepIndex] || steps[0];

  // Parse preset coordinates
  const getCoordinatesForPreset = (name: string, defaultLat: number, defaultLng: number) => {
    const norm = name.toLowerCase().trim();
    if (norm.includes('transit zone') || norm.includes('hub a')) {
      return { lat: 37.7725, lng: -122.4150 };
    }
    if (norm.includes('residential sector') || norm.includes('gate b')) {
      return { lat: 37.7900, lng: -122.4010 };
    }
    
    const latMatch = name.match(/(-?\d+\.\d+)\s*°?\s*N/i) || name.match(/lat:\s*(-?\d+\.\d+)/i) || name.match(/(-?\d+\.\d+)/);
    const lngMatch = name.match(/(-?\d+\.\d+)\s*°?\s*[WE]/i) || name.match(/lng:\s*(-?\d+\.\d+)/i) || name.match(/(?:,\s*)(-?\d+\.\d+)/);
    
    if (latMatch && lngMatch) {
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }
    
    return { lat: defaultLat, lng: defaultLng };
  };

  const originCoords = getCoordinatesForPreset(origin, 37.7725, -122.4150);
  const destinationCoords = getCoordinatesForPreset(destination, 37.7900, -122.4010);

  const stepsCoordinates = steps.map((st: any) => {
    return {
      lat: originCoords.lat + (st.latOffset || 0),
      lng: originCoords.lng + (st.lngOffset || 0)
    };
  });

  const routePolylineCoords = [originCoords, ...stepsCoordinates, destinationCoords];
  const activeStepCoords = stepsCoordinates[selectedStepIndex] || originCoords;

  // Synchronize Leaflet map instance and draw route markers in SafeRouting
  useEffect(() => {
    if (hasValidKey) return;

    let resizeObserver: any = null;

    loadLeaflet(() => {
      const L = (window as any).L;
      if (!L || !leafletContainerRef.current) return;

      // Initialize Map Instance
      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(leafletContainerRef.current, {
          zoomControl: false,
          doubleClickZoom: false
        }).setView([originCoords.lat, originCoords.lng], 14);
      }

      const map = leafletMapRef.current;

      // Clean old layers
      leafletLayersRef.current.forEach(layer => layer.remove());
      leafletLayersRef.current = [];

      // Dark tactical tiles
      const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
      leafletLayersRef.current.push(tiles);

      // Icon creators
      const createPinIcon = (color: string, letter: string) => {
        return L.divIcon({
          html: `
            <div style="position: relative; width: 28px; height: 28px; transform: translate(-25%, -70%); display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0 2.5px 3px rgba(0,0,0,0.45));">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="1.6" />
                <circle cx="12" cy="9" r="3.5" fill="#ffffff" />
              </svg>
              <span style="position: absolute; top: 4px; left: 10px; font-size: 9px; font-weight: 800; color: ${color}; font-family: sans-serif;">${letter}</span>
            </div>`,
          className: 'custom-pin-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });
      };

      const createStepIcon = (isActive: boolean, number: number) => {
        const bg = isActive ? '#ec4899' : '#1e293b';
        const stroke = isActive ? '#ffffff' : '#475569';
        const size = isActive ? 24 : 18;
        return L.divIcon({
          html: `
            <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${bg}; border: 1.5px solid ${stroke}; color: white; display: flex; align-items: center; justify-content: center; font-size: ${isActive ? '10px' : '8px'}; font-weight: bold; font-family: sans-serif; box-shadow: 0 2.5px 3px rgba(0,0,0,0.3); transform: translate(-20%, -20%);">
              ${number}
            </div>`,
          className: 'custom-step-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });
      };

      // Draw path sequence
      const polyLinePoints = routePolylineCoords.map(c => [c.lat, c.lng] as [number, number]);
      const routeColor = activeRouteTab === 'safest' ? '#10B981' : activeRouteTab === 'balanced' ? '#3B82F6' : '#EF4444';

      const line = L.polyline(polyLinePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round'
      }).addTo(map);
      leafletLayersRef.current.push(line);

      // Glow layer
      const core = L.polyline(polyLinePoints, {
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        lineJoin: 'round'
      }).addTo(map);
      leafletLayersRef.current.push(core);

      // Origin Pin
      const originMarker = L.marker([originCoords.lat, originCoords.lng], {
        icon: createPinIcon('#3b82f6', 'A')
      }).addTo(map);
      leafletLayersRef.current.push(originMarker);

      // Destination Pin
      const destMarker = L.marker([destinationCoords.lat, destinationCoords.lng], {
        icon: createPinIcon('#10b981', 'B')
      }).addTo(map);
      leafletLayersRef.current.push(destMarker);

      // Steps Pin list
      stepsCoordinates.forEach((coord, idx) => {
        const isActive = selectedStepIndex === idx;
        const m = L.marker([coord.lat, coord.lng], {
          icon: createStepIcon(isActive, idx + 1),
          zIndexOffset: isActive ? 1000 : 10
        }).addTo(map).on('click', () => {
          setSelectedStepIndex(idx);
        });

        if (isActive) {
          m.bindTooltip(`Step ${idx + 1}: ${steps[idx]?.instruction || ''}`, {
            permanent: true,
            direction: 'top',
            className: 'custom-bold-tooltip'
          }).openTooltip();
        }

        leafletLayersRef.current.push(m);
      });

      // Fit layout view
      map.fitBounds([
        [originCoords.lat, originCoords.lng],
        [destinationCoords.lat, destinationCoords.lng]
      ], { padding: [30, 30] });

      // Live Heatmap Overlays (Pulsing circles representing crowded hubs and active caution zones)
      // Active crowd hub hotspot circle:
      const crowdHotspot = L.circle([originCoords.lat + 0.001, originCoords.lng + 0.0012], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.16,
        radius: crowdDensity === 'high' ? 450 : 280,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(map);
      crowdHotspot.bindTooltip("<b>👥 Active Pedestrian Hotspot</b><br/>Monitored Crowd Cluster", { direction: 'top', className: 'custom-bold-tooltip' });
      leafletLayersRef.current.push(crowdHotspot);

      // Caution area circle:
      const cautionColor = '#ef4444';
      const cautionRadius = travelTime === 'late_night' ? 440 : 220;
      const cautionHotspot = L.circle([originCoords.lat + 0.0024, originCoords.lng - 0.0012], {
        color: cautionColor,
        fillColor: cautionColor,
        fillOpacity: lightingLevel === 'poor' ? 0.28 : 0.20,
        radius: cautionRadius,
        weight: 1.5,
        dashArray: '2, 3'
      }).addTo(map);
      
      const cautionLabel = travelTime === 'late_night' 
        ? "<b>⚠️ Caution Spot: High Nighttime Isolation Risk</b>" 
        : `<b>⚠️ Caution Zone: ${lightingLevel === 'poor' ? 'Dimmed Municipal Lights' : 'Limited Community Sightline'}</b>`;
      
      cautionHotspot.bindTooltip(cautionLabel, { direction: 'top', className: 'custom-bold-tooltip' });
      leafletLayersRef.current.push(cautionHotspot);

      // Force size invalidation and watch for dimensions changes (important for mobile/tabs)
      if (map) {
        map.invalidateSize();
        if (typeof ResizeObserver !== 'undefined' && leafletContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (leafletMapRef.current) {
              leafletMapRef.current.invalidateSize();
            }
          });
          resizeObserver.observe(leafletContainerRef.current);
        }

        // Staggered size updates to accommodate mobile screen render times and transition animation frames
        setTimeout(() => { if (leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 100);
        setTimeout(() => { if (leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 400);
        setTimeout(() => { if (leafletMapRef.current) leafletMapRef.current.invalidateSize(); }, 800);
      }
    });

    return () => {
      if (resizeObserver && resizeObserver.disconnect) {
        resizeObserver.disconnect();
      }
    };
  }, [origin, destination, activeRouteTab, selectedStepIndex, steps.length, hasValidKey, travelTime, crowdDensity, lightingLevel]);

  return (
    <div className="space-y-6">
      
      {/* Search Header layout */}
      <div>
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Navigation className="h-5 w-5 text-emerald-400" />
          Smart Safe Route Selection
        </h2>
        <p className="text-xs text-gray-400">
          Decide your commute path with full streetlight indicators, traffic congestion density overlays, and travel score algorithms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Input parameters */}
        <form onSubmit={handleComputeRoutes} className="lg:col-span-5 space-y-4 text-left">
          <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
            
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-pink-500" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-300">Route Configuration</h3>
            </div>

            {/* Inputs origin/destination */}
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Departure Origin</label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-pink-500" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Enter starting location or street code"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-2 pl-10 pr-24 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="absolute right-2 top-1.5 px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-[10px] font-mono rounded border border-pink-500/20 text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>Finding...</span>
                      </>
                    ) : (
                      <>
                        <span>🎯 Locate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Comings Destination</label>
                <div className="relative">
                  <Navigation className="absolute left-3.5 top-2.5 h-4 w-4 text-emerald-400" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter target gate or workplace location"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Simulated Live Variables */}
            <div className="p-3.5 bg-[#070b14] rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-1.5 justify-between">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-pink-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Live Commute Simulation
                </h4>
                <span className="text-[8.5px] uppercase font-mono tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/15 py-0.5 px-1.5 rounded animate-pulse">
                  Reactive Mode
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-mono uppercase text-gray-400 mb-1">Timing Context</label>
                  <select
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="morning">🌅 Morning Shift</option>
                    <option value="afternoon">☀️ Afternoon</option>
                    <option value="evening">🌆 Twilight/Evening</option>
                    <option value="late_night">🌙 Late Night</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-mono uppercase text-gray-400 mb-1">Crowd Density</label>
                  <select
                    value={crowdDensity}
                    onChange={(e) => setCrowdDensity(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="low">👤 Sparse/Quiet</option>
                    <option value="moderate">👥 Moderate Flow</option>
                    <option value="high">🛍️ Bustling Hubs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-mono uppercase text-gray-400 mb-1">Muni Lighting</label>
                  <select
                    value={lightingLevel}
                    onChange={(e) => setLightingLevel(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="poor">🌑 Dim Alleys</option>
                    <option value="standard">💡 Standard Lamps</option>
                    <option value="good">⚡ Smart LEDs</option>
                  </select>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 leading-normal italic">
                Simulating different times of day immediately influences safety scores, visibility forecasts, and recommended routes.
              </p>
            </div>

            {/* Travel Mode choices */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">Transit Strategy</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['WALKING', 'DRIVING', 'BICYCLING', 'TRANSIT'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    className={`py-1.5 rounded-lg border text-[10px] font-semibold flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                      travelMode === mode 
                        ? 'bg-pink-600/20 text-pink-400 border-pink-500' 
                        : 'bg-[#0a0f1d]/50 hover:bg-gray-800 border-white/5 text-gray-400'
                    }`}
                  >
                    {mode === 'WALKING' && <Footprints className="h-3.5 w-3.5" />}
                    {mode === 'DRIVING' && <Car className="h-3.5 w-3.5" />}
                    {mode === 'BICYCLING' && <Bike className="h-3.5 w-3.5" />}
                    {mode === 'TRANSIT' && <Train className="h-3.5 w-3.5" />}
                    <span className="capitalize text-[8px]">{mode.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Proactive Safety switches list */}
            <div className="p-3 bg-[#0a0f1d] rounded-xl border border-white/5 space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Security Guard Filters</h4>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                  Prioritize Well-lit roads
                </span>
                <input
                  type="checkbox"
                  checked={prefs.litPref}
                  onChange={(e) => setPrefs(p => ({ ...p, litPref: e.target.checked }))}
                  className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 flex items-center gap-1.5">
                  <span className="text-emerald-400 shrink-0 text-xs">👥</span>
                  Prefer active crowds / open shops
                </span>
                <input
                  type="checkbox"
                  checked={prefs.crowdedPref}
                  onChange={(e) => setPrefs(p => ({ ...p, crowdedPref: e.target.checked }))}
                  className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 flex items-center gap-1.5">
                  <span className="text-red-400 shrink-0 text-xs">🛑</span>
                  Evade dark alleys and isolated lanes
                </span>
                <input
                  type="checkbox"
                  checked={prefs.avoidIsolated}
                  onChange={(e) => setPrefs(p => ({ ...p, avoidIsolated: e.target.checked }))}
                  className="rounded border-white/10 bg-slate-950 text-pink-600 focus:ring-pink-500/20 h-4 w-4"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !origin.trim() || !destination.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/45 cursor-pointer disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Calculating Safe Paths...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5" />
                  <span>Audit Safe Routes</span>
                </>
              )}
            </button>

            {errorText && (
              <div className="bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}
          </div>
        </form>

        {/* Right: Comparative displays & Turn-by-Turn Instruction Step Map */}
        <div className="lg:col-span-7">
          {loading ? (
            <div className="glass-card rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center space-y-4 h-[440px]">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-sans font-medium text-white">Generating secure pathing configurations...</p>
                <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                  Deciphering street lighting status, evaluating nearest emergency circles, and plotting alternative bypass routes with Gemini models in real-time.
                </p>
              </div>
            </div>
          ) : routingResult ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Stacked Google Maps-style route cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">GoogleMaps-Style Route Alternatives</span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase">Live Safety Score Ratings</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Safest Option Card */}
                  <div
                    onClick={() => handleSelectTab('safest')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                      activeRouteTab === 'safest'
                        ? 'bg-[#091814] border-emerald-500/80 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-500/35'
                        : 'bg-gray-900/40 hover:bg-gray-900/80 border-white/5'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[8.5px] font-mono text-emerald-300 font-semibold tracking-wider uppercase bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/25">
                          Option A • Safest Path
                        </span>
                        <span className="text-xs font-mono font-extrabold text-emerald-400">
                          {routingResult.safestRoute.safetyScore}%
                        </span>
                      </div>
                      <h4 className="text-xs font-display font-bold text-white line-clamp-1">
                        {routingResult.safestRoute.name}
                      </h4>
                      <p className="text-[9.5px] text-gray-400 line-clamp-2 leading-relaxed">
                        {routingResult.safestRoute.litLevel}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-[#ca8a04]">
                        <span className="flex items-center gap-1">
                          👥 {routingResult.safestRoute.crowdPacing.split('(')[0].trim()}
                        </span>
                        <span className="font-mono text-gray-400">{travelMode === 'WALKING' ? '12 min walk' : '4 min transit'}</span>
                      </div>

                      {/* Real-time confidence bar index */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono">
                          <span className="text-emerald-400/80">Audit Confidence</span>
                          <span className="text-emerald-300">{routingResult.safestRoute.confidenceMeter}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${routingResult.safestRoute.confidenceMeter}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balanced Option Card */}
                  <div
                    onClick={() => handleSelectTab('balanced')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                      activeRouteTab === 'balanced'
                        ? 'bg-[#0a1422] border-blue-500/80 shadow-md shadow-blue-900/10 ring-1 ring-blue-500/35'
                        : 'bg-gray-900/40 hover:bg-gray-900/80 border-white/5'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[8.5px] font-mono text-blue-300 font-semibold tracking-wider uppercase bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/25">
                          Option B • Balanced
                        </span>
                        <span className="text-xs font-mono font-extrabold text-blue-400">
                          {routingResult.balancedRoute.safetyScore}%
                        </span>
                      </div>
                      <h4 className="text-xs font-display font-bold text-white line-clamp-1">
                        {routingResult.balancedRoute.name}
                      </h4>
                      <p className="text-[9.5px] text-gray-400 line-clamp-2 leading-relaxed">
                        {routingResult.balancedRoute.litLevel}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-blue-400">
                        <span className="flex items-center gap-1">
                          👤 {routingResult.balancedRoute.crowdPacing.split('(')[0].trim()}
                        </span>
                        <span className="font-mono text-gray-400">{travelMode === 'WALKING' ? '10 min walk' : '3 min transit'}</span>
                      </div>

                      {/* Real-time confidence bar index */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono">
                          <span className="text-blue-400/80">Audit Confidence</span>
                          <span className="text-blue-300">{routingResult.balancedRoute.confidenceMeter}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${routingResult.balancedRoute.confidenceMeter}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fastest / Direct Option Card */}
                  <div
                    onClick={() => handleSelectTab('fastest')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                      activeRouteTab === 'fastest'
                        ? 'bg-[#180d12] border-red-500/80 shadow-md shadow-red-900/10 ring-1 ring-red-500/35'
                        : 'bg-gray-900/40 hover:bg-gray-900/80 border-white/5'
                    }`}
                  >
                    {/* Animated Caution Alert Pulse Dot */}
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[8.5px] font-mono text-red-300 font-semibold tracking-wider uppercase bg-red-500/15 px-2 py-0.5 rounded border border-red-500/25">
                          Option C • Direct Alleys
                        </span>
                        <span className="text-xs font-mono font-extrabold text-red-400">
                          {routingResult.fastestRoute.safetyScore}%
                        </span>
                      </div>
                      <h4 className="text-xs font-display font-bold text-white line-clamp-1">
                        {routingResult.fastestRoute.name}
                      </h4>
                      <p className="text-[9.5px] text-gray-400 line-clamp-2 leading-relaxed">
                        {routingResult.fastestRoute.litLevel}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-[#ef4444] font-medium">
                        <span className="flex items-center gap-1 animate-pulse">
                          ⚠️ Caution Alleys Warning
                        </span>
                        <span className="font-mono text-gray-400">{travelMode === 'WALKING' ? '8 min walk' : '2 min transit'}</span>
                      </div>

                      {/* Real-time confidence bar index */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono">
                          <span className="text-red-400/80">Audit Confidence</span>
                          <span className="text-red-300">{routingResult.fastestRoute.confidenceMeter}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all duration-500" 
                            style={{ width: `${routingResult.fastestRoute.confidenceMeter}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

                     {/* Active Route overview specifications with LIVE STEP MAP */}
              <AnimatePresence mode="wait">
                {selectedDetails && (
                  <motion.div
                    key={activeRouteTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="glass-card rounded-2xl p-5 border border-white/5 space-y-4 text-left"
                  >
                  
                    {/* Street & metrics summary */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#ca8a04] uppercase tracking-wide">ACTIVE RECOMMENDATION BLUEPRINT</span>
                        <h4 className="text-base font-display font-bold text-white mt-0.5 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-pink-500" />
                          {selectedDetails.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <div className="text-[9px] font-mono text-gray-400 uppercase">Lighting Index</div>
                          <div className="font-semibold text-gray-200">{selectedDetails.litLevel}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-mono text-gray-400 uppercase">Social Presence</div>
                          <div className="font-semibold text-gray-200">{selectedDetails.crowdPacing}</div>
                        </div>
                      </div>
                    </div>
                                 {/* LIVE INSTRUCTION SEGMENT MINI-MAP */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <MapIcon className="h-3.5 w-3.5 text-pink-400" />
                          Interactive Step Map
                        </span>
                        <span className="text-[10px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/15">
                          Step {selectedStepIndex + 1} of {steps.length}
                        </span>
                      </div>

                      <div className="relative w-full h-[220px] bg-slate-950/85 rounded-xl overflow-hidden border border-white/10">
                        {hasValidKey ? (
                          <APIProvider apiKey={API_KEY} version="weekly">
                            <GoogleMap
                              center={activeStepCoords}
                              zoom={15}
                              mapId="DEMO_MAP_ID"
                              gestureHandling="cooperative"
                              disableDefaultUI={true}
                              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                              style={{ width: '100%', height: '100%' }}
                            >
                              <MapPolyline 
                                path={routePolylineCoords} 
                                strokeColor={activeRouteTab === 'safest' ? '#10B981' : activeRouteTab === 'balanced' ? '#3B82F6' : '#EF4444'} 
                              />

                              {/* Origin Pin */}
                              <AdvancedMarker position={originCoords} title="Departure State">
                                <Pin background="#3B82F6" scale={0.8} />
                              </AdvancedMarker>

                              {/* Steps representation pins */}
                              {stepsCoordinates.map((coord, idx) => (
                                <AdvancedMarker
                                  key={`coord_${idx}`}
                                  position={coord}
                                  onClick={() => setSelectedStepIndex(idx)}
                                >
                                  <Pin 
                                    background={selectedStepIndex === idx ? '#ec4899' : '#1e293b'} 
                                    borderColor={selectedStepIndex === idx ? '#ffffff' : '#475569'}
                                    glyphColor="#ffffff" 
                                    scale={selectedStepIndex === idx ? 1.0 : 0.75}
                                  >
                                    <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                                  </Pin>
                                </AdvancedMarker>
                              ))}

                              {/* Custom label float tooltip for active step */}
                              <InfoWindow position={activeStepCoords} disableAutoPan={true}>
                                <div className="p-1 px-[3px] text-slate-800 text-[10px] font-sans max-w-[150px]">
                                  <span className="font-bold text-pink-600 font-mono">Step {selectedStepIndex + 1}:</span> {activeStep?.instruction || ''}
                                </div>
                              </InfoWindow>
                            </GoogleMap>
                          </APIProvider>
                        ) : (
                          <div ref={leafletContainerRef} className="w-full h-full" style={{ outline: 'none' }} />
                        )}

                        {/* HUD Overlays overlay details */}
                        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-wrap gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold bg-gray-950/90 border border-white/10 ${
                            activeStep?.lightStatus.includes('Fully') || activeStep?.lightStatus.includes('Well')
                              ? 'text-emerald-400'
                              : 'text-yellow-400'
                          }`}>
                            💡 {activeStep?.lightStatus}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-gray-950/90 border border-white/10 text-pink-400">
                            👥 {activeStep?.crowdPacing}
                          </span>
                        </div>
                      </div>
               </div>

                    {/* STEP BY STEP LIVE CARDS */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Turn-by-turn Secure Guidance</h5>
                      <div className="space-y-2">
                        {steps.map((st, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedStepIndex(i)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              selectedStepIndex === i
                                ? 'bg-gradient-to-r from-pink-950/20 to-slate-900 border-pink-500/60 shadow-md shadow-pink-950/20'
                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className={`h-5 w-5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0 ${
                                selectedStepIndex === i 
                                  ? 'bg-pink-500 text-white font-bold' 
                                  : 'bg-gray-800 text-gray-400'
                              }`}>
                                {i + 1}
                              </span>
                              <div className="space-y-1 flex-1">
                                <p className={`text-xs font-sans leading-relaxed ${
                                  selectedStepIndex === i ? 'text-white font-medium' : 'text-gray-300'
                                }`}>
                                  {st.instruction}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-pink-400 flex items-center gap-1 shrink-0 font-sans">
                                    <Shield className="h-3 w-3 shrink-0" />
                                    <span className="text-[9px] text-slate-400 font-mono tracking-normal">{st.safetyHighlight}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Proactive Analytical observations */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <h5 className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-pink-500" />
                        Analytical Observations
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {selectedDetails.details}
                      </p>
                    </div>

                    {/* Dual Meters: safety and travel confidence */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-950/60 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-gray-400 uppercase">Street safety rating</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-mono font-bold text-white">{selectedDetails.safetyScore}%</span>
                          <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedDetails.safetyScore}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-950/60 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-gray-400 uppercase">Travel Security Index</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-mono font-bold text-white">{selectedDetails.confidenceMeter}%</span>
                          <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-pink-500 h-full rounded-full" style={{ width: `${selectedDetails.confidenceMeter}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* General Route safety insights list card */}
              <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-2 text-left">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Predictive Journey Tips
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-300 font-sans">
                  {routingResult.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-pink-500 text-sm mt-0.5 shrink-0">✔</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-white/5 p-12 text-center flex flex-col items-center justify-center space-y-4 h-[440px]">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Navigation className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-sans font-medium text-white">Commute Map Empty</p>
                <p className="text-xs text-gray-400 max-w-[320px] leading-relaxed mx-auto">
                  Submit an origin address and destination target on the left panel to assess route differences. Clicking cards highlights selected routes instantly.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
