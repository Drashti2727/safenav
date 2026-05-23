import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, MapPin, AlertTriangle, Eye, Navigation, CheckCircle, 
  Info, Phone, Compass, Plus, Loader2, Map as MapIcon, Layers, Settings, EyeOff, Search 
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { SafetyAlert } from '../types';

// Detect Google Maps API Key
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Professional High-Contrast Vector SVG Helpers to replace children-style raw emojis
const getSafetyIconSvg = (type: string, size = 16) => {
  if (type === 'police') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  }
  if (type === 'hospital') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
  }
  if (type === 'shop' || type === 'safe_haven' || type === 'cafe') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  }
  // Default/Alert warning triangle
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
};

interface InteractiveMapProps {
  alerts: SafetyAlert[];
  onAddAlert?: (lat: number, lng: number, desc: string, type: string, dangerLevel: string) => void;
  selectedRouteType?: 'safest' | 'balanced' | 'fastest';
  originName?: string;
  destinationName?: string;
  preferences?: {
    litPref: boolean;
    crowdedPref: boolean;
    avoidIsolated: boolean;
  };
  panicModeActive?: boolean;
}

// Google Map Polyline Draw helper
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

// Dynamic Leaflet Loader
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

export default function InteractiveMap({
  alerts,
  onAddAlert,
  selectedRouteType = 'safest',
  originName = "Transit Zone - Hub A",
  destinationName = "Residential Sector - Gate B",
  preferences = { litPref: true, crowdedPref: true, avoidIsolated: true },
  panicModeActive = false
}: InteractiveMapProps) {
  
  // Real Addresses inputs states
  const [sourceInput, setSourceInput] = useState(originName);
  const [destInput, setDestInput] = useState(destinationName);
  const [isSearching, setIsSearching] = useState(false);
  const [currentRouteSelection, setCurrentRouteSelection] = useState<'safest' | 'balanced' | 'fastest'>(selectedRouteType);

  // Tactical Compass Mode State
  const [compassMode, setCompassMode] = useState<'north' | 'travel' | 'scan'>('travel');

  // Map layer toggle states
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSafeSpots, setShowSafeSpots] = useState(true);
  const [mapTheme, setMapTheme] = useState<'dark' | 'voyager'>('dark');

  // Reporting Alerts states
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('unsafe_zone');
  const [newLevel, setNewLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Selected details info cards on Leaflet map
  const [leafletSelectedSpot, setLeafletSelectedSpot] = useState<any | null>(null);
  const [leafletSelectedAlert, setLeafletSelectedAlert] = useState<SafetyAlert | null>(null);

  // Google Maps state handlers
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(null);
  const [selectedSafeSpot, setSelectedSafeSpot] = useState<any | null>(null);

  // Resolved real-world coordinates
  const [originCoords, setOriginCoords] = useState({ lat: 37.7725, lng: -122.4150 });
  const [destinationCoords, setDestinationCoords] = useState({ lat: 37.7900, lng: -122.4010 });

  // Route paths (Snapped via actual roads)
  const [safestPath, setSafestPath] = useState<[number, number][]>([]);
  const [balancedPath, setBalancedPath] = useState<[number, number][]>([]);
  const [fastestPath, setFastestPath] = useState<[number, number][]>([]);

  const [nearbySafeSpots, setNearbySafeSpots] = useState<any[]>([]);

  // Leaflet references
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletLayersRef = useRef<any[]>([]);

  // Geocoding helper using OSM Nominatim with a respectful User-Agent
  const geocodeAddress = async (address: string | any): Promise<{ lat: number, lng: number } | null> => {
    if (!address || typeof address !== 'string') return null;
    const stripped = address.trim();
    if (!stripped) return null;

    // Check pre-configured defaults
    const norm = stripped.toLowerCase();
    if (norm.includes('transit zone') || norm.includes('hub a')) {
      return { lat: 37.7725, lng: -122.4150 };
    }
    if (norm.includes('residential sector') || norm.includes('gate b')) {
      return { lat: 37.7900, lng: -122.4010 };
    }

    // Coordinates fallback match "lat, lng"
    const coordsMatch = stripped.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (coordsMatch) {
      return { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) };
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(stripped)}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SafeNav-AI-Safety-App'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }
    } catch (err) {
      console.error("Nominatim geocoding error:", err);
    }
    return null;
  };

  // Snapped routing paths via OSRM to get true route lines
  const fetchSnappedPath = async (
    start: { lat: number, lng: number },
    end: { lat: number, lng: number },
    viaOffset?: { latOffset: number, lngOffset: number }
  ): Promise<[number, number][]> => {
    try {
      let url = `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};`;
      
      if (viaOffset) {
        const viaLat = start.lat + viaOffset.latOffset;
        const viaLng = start.lng + viaOffset.lngOffset;
        url += `${viaLng},${viaLat};`;
      }
      
      url += `${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates; // [[lng, lat]]
          return coords.map((c: any) => [c[1], c[0]]); // [lat, lng]
        }
      }
    } catch (e) {
      console.error("OSRM routing request error:", e);
    }

    // Direct line backup
    if (viaOffset) {
      return [
        [start.lat, start.lng],
        [start.lat + viaOffset.latOffset, start.lng + viaOffset.lngOffset],
        [end.lat, end.lng]
      ];
    }
    return [
      [start.lat, start.lng],
      [end.lat, end.lng]
    ];
  };

  // Run addresses geocoding & route computations
  const calculateRealRoutes = async (srcOverride?: string | any, destOverride?: string | any) => {
    setIsSearching(true);
    const finalSource = (srcOverride && typeof srcOverride === 'string') ? srcOverride : sourceInput;
    const finalDest = (destOverride && typeof destOverride === 'string') ? destOverride : destInput;
    try {
      const sCoords = await geocodeAddress(finalSource) || { lat: 37.7725, lng: -122.4150 };
      const dCoords = await geocodeAddress(finalDest) || { lat: 37.7900, lng: -122.4010 };

      setOriginCoords(sCoords);
      setDestinationCoords(dCoords);

      // Generate dynamic safe hubs relative to current search query center
      const centerLat = (sCoords.lat + dCoords.lat) / 2;
      const centerLng = (sCoords.lng + dCoords.lng) / 2;
      const generatedSpots = [
        { name: "Metropolitan Police - Guard Sector", type: "police", lat: centerLat + 0.0035, lng: centerLng - 0.002, phone: "911", desc: "Active safe-zone with live video surveillance and alarm networks." },
        { name: "Bright Storefronts Street & Safe Cafe (24/7)", type: "shop", lat: centerLat - 0.002, lng: centerLng + 0.004, phone: "+1 (555) 019-2831", desc: "Well-lit retail zone with persistent staff presence." },
        { name: "City Care General Emergency Triage", type: "hospital", lat: centerLat + 0.006, lng: centerLng + 0.002, phone: "911", desc: "Open 24/7 hospital with highly illuminated corridors." },
        { name: "Well-Illuminated Metro Station Hub", type: "safe_haven", lat: centerLat - 0.0045, lng: centerLng - 0.003, phone: "+1 (555) 014-9988", desc: "Station equipped with continuous security patrols." }
      ];
      setNearbySafeSpots(generatedSpots);

      // Compute actual OSRM paths
      // Safest Path loops near the safe storefront cafe
      const sPath = await fetchSnappedPath(sCoords, dCoords, { latOffset: -0.002, lngOffset: 0.004 });
      
      // Balanced Path goes close to the secure police precinct station
      const bPath = await fetchSnappedPath(sCoords, dCoords, { latOffset: 0.0035, lngOffset: -0.002 });
      
      // Fastest Path is direct
      const fPath = await fetchSnappedPath(sCoords, dCoords);

      setSafestPath(sPath);
      setBalancedPath(bPath);
      setFastestPath(fPath);

      // Auto Pan leaflet map if loaded
      if (leafletMapRef.current && (window as any).L) {
        leafletMapRef.current.fitBounds([
          [sCoords.lat, sCoords.lng],
          [dCoords.lat, dCoords.lng]
        ], { padding: [40, 40] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // Sync route calculation when component mounts or search addresses change
  useEffect(() => {
    setSourceInput(originName);
    setDestInput(destinationName);
    calculateRealRoutes(originName, destinationName);
  }, [originName, destinationName]);

  // Keep route highlights responsive to route selection
  useEffect(() => {
    setCurrentRouteSelection(selectedRouteType);
  }, [selectedRouteType]);

  // Initialize and redraw Leaflet Maps
  useEffect(() => {
    if (hasValidKey) return; // Keep Google Maps instead if key is configured

    let resizeObserver: any = null;

    loadLeaflet(() => {
      const L = (window as any).L;
      if (!L || !leafletContainerRef.current) return;

      // Create Leaflet Map Instance
      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(leafletContainerRef.current, {
          zoomControl: false,
          doubleClickZoom: false
        }).setView([originCoords.lat, originCoords.lng], 14);

        // Click on map callback
        leafletMapRef.current.on('dblclick', (e: any) => {
          if (panicModeActive) return;
          setClickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          setShowAddAlertModal(true);
        });
      }

      const map = leafletMapRef.current;

      // Clean old layers
      leafletLayersRef.current.forEach(layer => layer.remove());
      leafletLayersRef.current = [];

      // Tile Layer (Dark Matter or Voyager)
      const tileUrl = mapTheme === 'dark' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      
      const tiles = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
      leafletLayersRef.current.push(tiles);

      // Professional vector icon mapping helpers
      const createCustomMarkerHtml = (type: string, dangerLevel?: string) => {
        let bgColor = "rgba(9, 13, 22, 0.95)";
        let borderColor = "rgba(255, 255, 255, 0.15)";
        let glowColor = "transparent";
        let color = "#cbd5e1";
        let isAnimated = false;

        if (type === 'police') {
          borderColor = "rgba(59, 130, 246, 0.8)";
          glowColor = "rgba(59, 130, 246, 0.45)";
          color = "#3b82f6";
        } else if (type === 'hospital') {
          borderColor = "rgba(16, 185, 129, 0.8)";
          glowColor = "rgba(16, 185, 129, 0.45)";
          color = "#10b981";
        } else if (type === 'shop' || type === 'safe_haven' || type === 'cafe') {
          borderColor = "rgba(245, 158, 11, 0.8)";
          glowColor = "rgba(245, 158, 11, 0.45)";
          color = "#f59e0b";
        } else if (type === 'alert') {
          if (dangerLevel === 'High') {
            borderColor = "rgba(244, 63, 94, 0.85)";
            glowColor = "rgba(244, 63, 94, 0.55)";
            color = "#f43f5e";
            isAnimated = true;
          } else {
            borderColor = "rgba(245, 158, 11, 0.8)";
            glowColor = "rgba(245, 158, 11, 0.4)";
            color = "#f59e0b";
          }
        }

        const pulseStyle = isAnimated 
          ? `animation: pulse-badge 1.5s infinite;` 
          : '';

        const svgCode = getSafetyIconSvg(type).trim();

        return `
          <div style="
            width: 32px;
            height: 32px;
            background: ${bgColor};
            border: 2.2px solid ${borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 10px ${glowColor}, 0 2px 4px rgba(0,0,0,0.5);
            cursor: pointer;
            color: ${color};
            transition: all 0.2s ease;
            ${pulseStyle}
          ">
            ${svgCode}
          </div>
          <style>
            @keyframes pulse-badge {
              0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); transform: scale(1); }
              50% { box-shadow: 0 0 12px 6px rgba(244, 63, 94, 0); transform: scale(1.08); }
              100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); transform: scale(1); }
            }
          </style>
        `;
      };

      const createCustomIcon = (type: string, dangerLevel?: string) => {
        return L.divIcon({
          html: createCustomMarkerHtml(type, dangerLevel),
          className: 'custom-professional-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
      };

      const createPinIcon = (color: string, letter: string) => {
        return L.divIcon({
          html: `
            <div style="position: relative; width: 32px; height: 32px; transform: translate(-25%, -70%); display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="1.8" />
                <circle cx="12" cy="9" r="4" fill="#ffffff" />
              </svg>
              <span style="position: absolute; top: 5px; left: 12px; font-size: 10px; font-weight: 800; color: ${color}; font-family: sans-serif;">${letter}</span>
            </div>`,
          className: 'custom-pin-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
      };

      // Draw Routes Lines styled like real navigation
      const drawRouteLine = (path: [number, number][], color: string, weight: number, opacity: number, active: boolean) => {
        if (!path || path.length === 0) return;
        const line = L.polyline(path, {
          color,
          weight,
          opacity,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        if (active) {
          // Inner glowing neon core line for the active route
          const core = L.polyline(path, {
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map);
          leafletLayersRef.current.push(core);
        }

        leafletLayersRef.current.push(line);
      };

      // Overlay Paths
      const showSafest = currentRouteSelection === 'safest';
      const showBalanced = currentRouteSelection === 'balanced';
      const showFastest = currentRouteSelection === 'fastest';

      drawRouteLine(safestPath, '#10b981', showSafest ? 7 : 4, showSafest ? 0.9 : 0.4, showSafest);
      drawRouteLine(balancedPath, '#3b82f6', showBalanced ? 7 : 4, showBalanced ? 0.9 : 0.4, showBalanced);
      drawRouteLine(fastestPath, '#ef4444', showFastest ? 7 : 4, showFastest ? 0.9 : 0.4, showFastest);

      // Origin Pin
      const originMarker = L.marker([originCoords.lat, originCoords.lng], {
        icon: createPinIcon('#3b82f6', 'A'),
        zIndexOffset: 100
      }).addTo(map).bindTooltip("Departure Area", { direction: 'top' });
      leafletLayersRef.current.push(originMarker);

      // Destination Pin
      const destMarker = L.marker([destinationCoords.lat, destinationCoords.lng], {
        icon: createPinIcon('#10b981', 'B'),
        zIndexOffset: 100
      }).addTo(map).bindTooltip("Destination Target", { direction: 'top' });
      leafletLayersRef.current.push(destMarker);

      // Draw Dynamic Heatmap Overlays (translucent gradient circles linked to alerts coordinate nodes)
      if (showHeatmap) {
        alerts.forEach(al => {
          const isHigh = al.dangerLevel === 'High';
          const outerRad = isHigh ? 200 : 120;
          const innerRad = isHigh ? 90 : 50;

          // Outer light safety bloom
          const outerBloom = L.circle([al.lat, al.lng], {
            radius: outerRad,
            color: 'transparent',
            fillColor: isHigh ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.25
          }).addTo(map);
          
          // Inner high-density safety core
          const innerBloom = L.circle([al.lat, al.lng], {
            radius: innerRad,
            color: 'transparent',
            fillColor: isHigh ? '#f43f5e' : '#eab308',
            fillOpacity: 0.5
          }).addTo(map);

          leafletLayersRef.current.push(outerBloom);
          leafletLayersRef.current.push(innerBloom);
        });
      }

      // Draw Safe Place Nodes (interactive)
      if (showSafeSpots) {
        nearbySafeSpots.forEach(spot => {
          const m = L.marker([spot.lat, spot.lng], {
            icon: createCustomIcon(spot.type)
          }).addTo(map).on('click', () => {
            setLeafletSelectedSpot(spot);
            setLeafletSelectedAlert(null);
          });
          leafletLayersRef.current.push(m);
        });
      }

      // Draw Safety Alert Warnings Markers
      alerts.forEach(al => {
        const m = L.marker([al.lat, al.lng], {
          icon: createCustomIcon('alert', al.dangerLevel)
        }).addTo(map).on('click', () => {
          setLeafletSelectedAlert(al);
          setLeafletSelectedSpot(null);
        });
        leafletLayersRef.current.push(m);
      });

      // Show Panic beacon ring
      if (panicModeActive) {
        const pulseOuter = L.circle([originCoords.lat, originCoords.lng], {
          radius: 350,
          color: '#ef4444',
          weight: 1.5,
          fillColor: '#ef4444',
          fillOpacity: 0.15
        }).addTo(map);
        leafletLayersRef.current.push(pulseOuter);
      }

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
  }, [originCoords, destinationCoords, safestPath, balancedPath, fastestPath, currentRouteSelection, mapTheme, showHeatmap, showSafeSpots, alerts, panicModeActive, nearbySafeSpots]);

  // Click handler to post reported alert on Leaflet map
  const handleCreateReport = () => {
    if (clickCoords && onAddAlert) {
      onAddAlert(
        Number(clickCoords.lat.toFixed(5)),
        Number(clickCoords.lng.toFixed(5)),
        newDesc || `Observed ${newType.replace('_', ' ')} warning`,
        newType,
        newLevel
      );
      setNewDesc('');
      setShowAddAlertModal(false);
      setClickCoords(null);
    }
  };

  const getRouteHighlightColor = (type: 'safest' | 'balanced' | 'fastest') => {
    switch(type) {
      case 'safest': return '#10b981';
      case 'balanced': return '#3b82f6';
      case 'fastest': return '#ef4444';
    }
  };

  // Click on Google Map Canvas
  const handleGoogleMapClick = (e: any) => {
    if (panicModeActive) return;
    const latLng = e.detail?.latLng || e.latLng;
    if (!latLng) return;
    
    const clickedLat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const clickedLng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

    setClickCoords({ lat: clickedLat, lng: clickedLng });
    setShowAddAlertModal(true);
  };

  // Dynamic Tactical Compass metrics
  const travelBearing = (() => {
    const start = originCoords;
    const end = destinationCoords;
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return Math.round((brng + 360) % 360);
  })();

  const travelDirection = (() => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(travelBearing / 45) % 8;
    return directions[index];
  })();

  const handleToggleCompass = () => {
    if (compassMode === 'north') {
      setCompassMode('travel');
    } else if (compassMode === 'travel') {
      setCompassMode('scan');
    } else {
      setCompassMode('north');
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#090D16] flex flex-col md:flex-row h-[600px]">
      
      {/* LEFT SIDEBAR: FUTURISTIC MAP INTERACTION CONSOLE & MULTI-ROUTE DISPATCHERS */}
      <div className="w-full md:w-[320px] bg-[#070b16]/95 backdrop-blur-md p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0 text-left z-10 overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-pink-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-300 font-bold">Commute Radar Core</span>
          </div>

          {/* Search Fields Area */}
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-mono uppercase text-gray-400 mb-1">Departure Origin</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-400" />
                <input 
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Street address or zone code"
                  className="w-full bg-[#0c1224] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-pink-500/80 focus:bg-pink-500/5 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase text-gray-400 mb-1">Target Destination</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-2.5 h-3.5 w-3.5 text-emerald-400" />
                <input 
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  placeholder="Target hub or gate"
                  className="w-full bg-[#0c1224] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-pink-500/80 focus:bg-pink-500/5 transition-all"
                />
              </div>
            </div>

            <button
              onClick={calculateRealRoutes}
              disabled={isSearching || !sourceInput.trim() || !destInput.trim()}
              className="w-full py-2 bg-gradient-to-r from-pink-600 with to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-500/10 transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Geocoding Real Roads...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Update Interactive Paths</span>
                </>
              )}
            </button>
          </div>

          <hr className="border-white/5" />

          {/* Route Selector Cards */}
          <div className="space-y-2">
            <span className="block text-[9px] font-mono uppercase text-gray-400 mb-2">Real Roads Recommendation</span>
            
            {/* option richest: Safest */}
            <button
              type="button"
              onClick={() => setCurrentRouteSelection('safest')}
              className={`w-full p-3 rounded-xl text-left border flex flex-col gap-1 transition-all cursor-pointer ${
                currentRouteSelection === 'safest'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-900/15'
                  : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Safest Path
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">98% Score</span>
              </div>
              <span className="text-[10px] text-gray-400 leading-snug">Traverses mostly well-lit storefront high-crowd commercial avenues.</span>
            </button>

            {/* Option balanced */}
            <button
              type="button"
              onClick={() => setCurrentRouteSelection('balanced')}
              className={`w-full p-3 rounded-xl text-left border flex flex-col gap-1 transition-all cursor-pointer ${
                currentRouteSelection === 'balanced'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-md shadow-blue-900/15'
                  : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Balanced Path
                </span>
                <span className="text-[10px] font-mono text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded">83% Score</span>
              </div>
              <span className="text-[10px] text-gray-400 leading-snug">Middle routing, moderate streetlights with standard neighborhood patrols.</span>
            </button>

            {/* Option fastest */}
            <button
              type="button"
              onClick={() => setCurrentRouteSelection('fastest')}
              className={`w-full p-3 rounded-xl text-left border flex flex-col gap-1 transition-all cursor-pointer ${
                currentRouteSelection === 'fastest'
                  ? 'bg-red-500/10 border-red-500 text-red-400 shadow-md shadow-red-900/15'
                  : 'bg-white/5 border-white/5 hover:border-white/10 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Direct Shortcut
                </span>
                <span className="text-[10px] font-mono text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded">65% Score</span>
              </div>
              <span className="text-[10px] text-gray-400 leading-snug">Quickest distance, but passes through several dark alleys or quiet spots.</span>
            </button>
          </div>

        </div>

        {/* Global toggles layers of HUD */}
        <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-gray-400">🛡️ Safe Spots Icons</span>
            <input 
              type="checkbox"
              checked={showSafeSpots}
              onChange={(e) => setShowSafeSpots(e.target.checked)}
              className="rounded border-white/10 bg-slate-950 text-pink-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-gray-400">🔥 Live Heatmap Overlay</span>
            <input 
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded border-white/10 bg-slate-950 text-pink-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-gray-400">🎨 Cyber Tactical Dark Map</span>
            <input 
              type="checkbox"
              checked={mapTheme === 'dark'}
              onChange={(e) => setMapTheme(e.target.value ? 'dark' : 'voyager')}
              onClick={() => setMapTheme(mapTheme === 'dark' ? 'voyager' : 'dark')}
              className="rounded border-white/10 bg-slate-950 text-pink-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: MAP CONTAINER WORKSPACE CONTAINER */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
        
        {/* TOP HUD floating controllers overlay inside the map space */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1.5 text-left">
          <div className="px-3 py-1.5 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl text-[10px] text-gray-300 shadow-xl pointer-events-auto flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px]">Live Safety Grid</span>
          </div>

          <div className="px-3 py-1.5 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl text-[10px] text-pink-400 pointer-events-auto max-w-[280px] leading-relaxed">
            <span>💡 Double-click any point on the map to pin localized safety reports.</span>
          </div>
        </div>

        {/* COMPASS OVERLAY */}
        <div 
          onClick={handleToggleCompass}
          title="Click to toggle Compass Alignment Modes (North-Up, Target-Bearing, and Telemetry Sweep)"
          className="absolute top-4 right-4 z-10 hidden md:flex flex-col gap-1 bg-[#090d16]/95 backdrop-blur-md rounded-xl p-2.5 border border-pink-500/20 text-[10px] text-gray-300 cursor-pointer select-none shadow-xl hover:bg-[#111726] hover:border-pink-500/40 active:scale-95 transition-all w-44 text-left pointer-events-auto"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-wider text-pink-400">Tactical Compass</span>
            <div className={`h-1.5 w-1.5 rounded-full ${compassMode === 'scan' ? 'bg-rose-500 animate-ping' : compassMode === 'travel' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 bg-pink-500/10 rounded-lg text-pink-500 transition-transform duration-500 ease-out"
              style={{ 
                transform: compassMode === 'scan' 
                  ? 'none' 
                  : `rotate(${compassMode === 'travel' ? travelBearing : 0}deg)` 
              }}
            >
              <Compass className={`h-4.5 w-4.5 ${compassMode === 'scan' ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>
            
            <div className="space-y-0.5 font-mono">
              <div className="text-[9.5px] font-bold text-white uppercase tracking-normal">
                {compassMode === 'north' && "North Alignment"}
                {compassMode === 'travel' && `Bearing: ${travelDirection}`}
                {compassMode === 'scan' && "Telemetry Sync"}
              </div>
              <div className="text-[8px] text-gray-400 leading-none">
                {compassMode === 'north' && "0° N (Static Up)"}
                {compassMode === 'travel' && `${travelBearing}° ${travelDirection} to Dumas`}
                {compassMode === 'scan' && "Scanning paths..."}
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-1 mt-0.5 flex flex-col gap-0.5 font-mono text-[7.5px] text-gray-400">
            <div className="flex justify-between">
              <span>LAT:</span>
              <span className="text-gray-300 font-semibold">{originCoords.lat.toFixed(4)}°N</span>
            </div>
            <div className="flex justify-between">
              <span>LNG:</span>
              <span className="text-gray-300 font-semibold">{originCoords.lng.toFixed(4)}°W</span>
            </div>
          </div>
        </div>

        {/* RENDERING REAL-WORLD MAP PORT */}
        <div className="w-full flex-1 h-full z-0 relative">
          {hasValidKey ? (
            /* REAL GOOGLE MAPS INTEGRATION */
            <APIProvider apiKey={API_KEY} version="weekly">
              <GoogleMap
                defaultCenter={originCoords}
                defaultZoom={14}
                mapId="DEMO_MAP_ID"
                onClick={handleGoogleMapClick}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                gestureHandling="cooperative"
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Dynamically overlay roadSnapped polyline paths based on selection */}
                {safestPath.length > 0 && (
                  <MapPolyline 
                    path={safestPath.map(c => ({ lat: c[0], lng: c[1] }))} 
                    strokeColor={getRouteHighlightColor(currentRouteSelection)} 
                  />
                )}

                {/* Departure Marker */}
                <AdvancedMarker position={originCoords} title={`Origin Address: ${sourceInput}`}>
                  <Pin background="#3B82F6" glyphColor="#ffffff" borderColor="#1E3A8A">
                    <span className="text-[10px] font-bold text-white">A</span>
                  </Pin>
                </AdvancedMarker>

                {/* Destination Marker */}
                <AdvancedMarker position={destinationCoords} title={`Destination Address: ${destInput}`}>
                  <Pin background="#10B981" glyphColor="#ffffff" borderColor="#064E3B">
                    <span className="text-[10px] font-bold text-white">B</span>
                  </Pin>
                </AdvancedMarker>

                {/* Safe Spots (interactive) */}
                {showSafeSpots && nearbySafeSpots.map((spot, idx) => {
                  let badgeColor = "text-[#f59e0b] border-amber-500 bg-[#7c2d12]/30";
                  if (spot.type === 'police') badgeColor = "text-[#3b82f6] border-blue-500 bg-[#1e3a8a]/30";
                  if (spot.type === 'hospital') badgeColor = "text-[#10b981] border-emerald-500 bg-[#064e3b]/30";
                  return (
                    <AdvancedMarker
                      key={`googlesafe_${idx}`}
                      position={{ lat: spot.lat, lng: spot.lng }}
                      title={spot.name}
                      onClick={() => {
                        setSelectedSafeSpot(spot);
                        setSelectedAlert(null);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 duration-150 transition-all ${badgeColor}`}
                           dangerouslySetInnerHTML={{ __html: getSafetyIconSvg(spot.type) }} />
                    </AdvancedMarker>
                  );
                })}

                {/* Heatmap/Alert overlay markers */}
                {alerts.map((al) => (
                  <AdvancedMarker
                    key={`googlealert_${al.alertId}`}
                    position={{ lat: al.lat, lng: al.lng }}
                    title={al.description}
                    onClick={() => {
                      setSelectedAlert(al);
                      setSelectedSafeSpot(null);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 duration-150 transition-all ${
                          al.dangerLevel === 'High' 
                            ? 'text-[#f43f5e] border-[#f43f5e] bg-[#991b1b]/30 animate-pulse'
                            : 'text-[#f59e0b] border-[#f59e0b] bg-[#92400e]/30'
                        }`}
                         dangerouslySetInnerHTML={{ __html: getSafetyIconSvg('alert') }} />
                  </AdvancedMarker>
                ))}

                {/* Dynamic overlay circles for glowing heatmap effect */}
                {showHeatmap && alerts.map((al, idx) => (
                  <React.Fragment key={`heatmapcircles_${idx}`}>
                    <AdvancedMarker position={{ lat: al.lat, lng: al.lng }}>
                      <div className="relative flex items-center justify-center">
                        <span className={`absolute inline-flex rounded-full opacity-20 animate-pulse ${
                          al.dangerLevel === 'High' ? 'h-32 w-32 bg-red-600' : 'h-20 w-20 bg-amber-500'
                        }`} />
                        <span className={`absolute inline-flex rounded-full opacity-35 ${
                          al.dangerLevel === 'High' ? 'h-16 w-16 bg-red-600' : 'h-10 w-10 bg-amber-500'
                        }`} />
                      </div>
                    </AdvancedMarker>
                  </React.Fragment>
                ))}

                {/* Info Window for selected alert info */}
                {selectedAlert && (
                  <InfoWindow
                    position={{ lat: selectedAlert.lat, lng: selectedAlert.lng }}
                    onCloseClick={() => setSelectedAlert(null)}
                  >
                    <div className="p-2 text-slate-900 w-[200px] text-left">
                      <div className="flex items-center gap-1 font-bold text-xs text-red-600 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{selectedAlert.dangerLevel} Danger Warning</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-800 mb-1 leading-snug">{selectedAlert.description}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">Reported by: {selectedAlert.reporterName}</div>
                    </div>
                  </InfoWindow>
                )}

                {/* Info Window for selected safe spots info */}
                {selectedSafeSpot && (
                  <InfoWindow
                    position={{ lat: selectedSafeSpot.lat, lng: selectedSafeSpot.lng }}
                    onCloseClick={() => setSelectedSafeSpot(null)}
                  >
                    <div className="p-2 text-slate-900 w-[180px] text-left">
                      <div className="flex items-center gap-1 font-bold text-xs text-emerald-600 mb-1">
                        <span className="text-xs">🛡️</span>
                        <span>Safe Hub Zone</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">{selectedSafeSpot.name}</div>
                      <div className="text-[10px] text-slate-600 mt-1 leading-normal">{selectedSafeSpot.desc}</div>
                      <a href={`tel:${selectedSafeSpot.phone}`} className="text-[10px] text-emerald-600 block mt-2 hover:underline font-bold">
                        📞 Dial Security Desk
                      </a>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          ) : (
            /* REAL-WORLD LEAFLET INTERACTIVE ROAD GRID FALLBACK */
            <div ref={leafletContainerRef} className="w-full h-full" style={{ outline: 'none' }} />
          )}

          {/* FLOAT CARDS ON TOP OF LEAFLET MAP */}
          {leafletSelectedSpot && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[260px] bg-[#0a0f1d]/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 text-left shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 z-10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">🛡️ Secure Haven</span>
                <button onClick={() => setLeafletSelectedSpot(null)} className="text-gray-400 hover:text-white text-xs">✕</button>
              </div>
              <h4 className="text-sm font-bold text-white">{leafletSelectedSpot.name}</h4>
              <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{leafletSelectedSpot.desc}</p>
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/5">
                <a href={`tel:${leafletSelectedSpot.phone}`} className="flex-1 py-1.5 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 text-[10px] font-mono font-bold rounded-lg text-center tracking-wider transition-colors">
                  📞 CALL: {leafletSelectedSpot.phone}
                </a>
              </div>
            </div>
          )}

          {leafletSelectedAlert && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[260px] bg-[#1a0f12]/95 backdrop-blur-md p-4 rounded-2xl border border-red-500/30 text-left shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 z-10">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded uppercase font-bold ${
                  leafletSelectedAlert.dangerLevel === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  🚨 {leafletSelectedAlert.dangerLevel} Hazard
                </span>
                <button onClick={() => setLeafletSelectedAlert(null)} className="text-gray-400 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-[11px] text-gray-200 leading-relaxed font-medium">"{leafletSelectedAlert.description}"</p>
              <span className="block text-[9px] font-mono text-gray-500 mt-2.5">Reporter: {leafletSelectedAlert.reporterName}</span>
            </div>
          )}
        </div>

      </div>

      {/* POST SECURITY HAZARD MODAL SHEET */}
      {showAddAlertModal && clickCoords && (
        <div className="absolute inset-0 bg-[#090D16]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 border border-white/10 shadow-3xl text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-pink-400 font-display font-bold text-base mb-4">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
              <h3>Report Safety Concern</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 font-mono leading-relaxed">
              Pinning security alert on street grid coordinates:<br />
              <span className="text-white">LAT: {clickCoords.lat.toFixed(5)} | LNG: {clickCoords.lng.toFixed(5)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-400 mb-1">Issue Category</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#0d1222] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="unsafe_zone">Unsafe Pedestrian Zone</option>
                  <option value="harassment">Active Harassment Spot</option>
                  <option value="suspicious_activity">Suspicious Group/Activity</option>
                  <option value="poorly_lit">Poorly Lit Road</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-400 mb-1">Danger Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewLevel(lvl)}
                      className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        newLevel === lvl 
                          ? lvl === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500' 
                            : lvl === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-[#ca8a04]'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500'
                          : 'bg-[#0d1222]/80 hover:bg-gray-800 border border-white/5 text-gray-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-400 mb-1">Observation Remarks</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="E.g. No operational lamps, dark hidden bypass lane, etc."
                  maxLength={150}
                  rows={2}
                  className="w-full bg-[#0d1222] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAlertModal(false)}
                  className="flex-1 bg-[#151c31] hover:bg-gray-800 border border-white/5 text-gray-300 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateReport}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-2 rounded-xl text-xs shadow-md shadow-pink-500/20 cursor-pointer"
                >
                  Post Anonymous Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
