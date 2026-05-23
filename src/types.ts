export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isActiveShare: boolean;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  travelMode: 'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT';
  litPref: boolean;
  crowdedPref: boolean;
  avoidIsolated: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  emergencyContacts?: EmergencyContact[];
  preferences?: UserPreferences;
}

export interface SafetyAlert {
  alertId: string;
  type: 'unsafe_zone' | 'harassment' | 'suspicious_activity' | 'poorly_lit';
  description: string;
  lat: number;
  lng: number;
  locationName?: string;
  createdAt: any; // Firestore Timestamp
  createdBy: string;
  reporterName: string;
  dangerLevel: 'Low' | 'Medium' | 'High';
  upvotes: number;
  upvotedBy: string[];
}

export interface TravelLog {
  historyId: string;
  userId: string;
  origin: string;
  destination: string;
  safetyScore: number;
  status: 'completed' | 'monitoring' | 'canceled';
  routeChanges: number;
  createdAt: any; // Firestore Timestamp
}

export interface SafetyDecisionResult {
  riskLevel: 'Low' | 'Medium' | 'High' | 'CRITICAL';
  urgency: 'Secure' | 'Cautious' | 'Urgent' | 'IMMEDIATE ACTION REQUIRED';
  possibleThreats: string[];
  recommendedActions: string[];
  saferAlternatives: string[];
  nearbyHelp: string[];
  confidenceGuidance: string;
  safetyConfidenceScore: number;
}

export interface RouteInstruction {
  instruction: string;
  safetyHighlight: string;
  lightStatus: string;
  crowdPacing: string;
  latOffset: number;
  lngOffset: number;
}

export interface RouteOption {
  name: string;
  safetyScore: number;
  litLevel: string;
  crowdPacing: string;
  details: string;
  confidenceMeter: number;
  instructions?: RouteInstruction[];
}

export interface RouteRecommendationResult {
  safestRoute: RouteOption;
  balancedRoute: RouteOption;
  fastestRoute: RouteOption;
  insights: string[];
}

export interface SafetyInsightsResult {
  safestTravelTimes: string[];
  riskyZones: string[];
  recommendations: string[];
  behaviorInsights: string;
  confidenceAnalytics: string;
}

export interface AreaExperience {
  experienceId: string;
  areaName: string;
  description: string;
  safetyRating: number;
  category: 'safety_tip' | 'well_lit_recommendation' | 'active_bystander' | 'general_review';
  createdAt: any; // Firestore Timestamp or Date
  createdBy: string;
  reporterName: string;
  upvotes: number;
  upvotedBy: string[];
}
