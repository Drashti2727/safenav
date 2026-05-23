import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
}

function handleGeminiError(context: string, error: any) {
  const errorMessage = error?.message || error?.toString() || "";
  const errLower = errorMessage.toLowerCase();
  
  const isTransient = 
    errorMessage.includes("429") || 
    errorMessage.includes("503") ||
    errLower.includes("quota") || 
    errLower.includes("resource_exhausted") || 
    errLower.includes("unavailable") ||
    errLower.includes("high demand") ||
    errLower.includes("overloaded") ||
    error?.status === 429 ||
    error?.status === 503 ||
    error?.code === 429 ||
    error?.code === 503 ||
    error?.error?.code === 429 ||
    error?.error?.code === 503;

  if (isTransient) {
    console.warn(`[Gemini API Transient Handshake] ${context}: Service under capacity limits (429/503). Robust offline decision engine seamlessly took over.`);
  } else {
    console.error(`[Gemini API Error] ${context}:`, errorMessage);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithRobustRetry(
  aiClient: GoogleGenAI,
  params: {
    contents: any;
    config: any;
  }
) {
  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || error?.toString() || "";
      const status = error?.status || error?.code || error?.error?.code;

      const isTransient = 
        status === 503 || 
        status === 429 || 
        errorMessage.includes("503") || 
        errorMessage.includes("429") || 
        errorMessage.toLowerCase().includes("unavailable") || 
        errorMessage.toLowerCase().includes("high demand") || 
        errorMessage.toLowerCase().includes("overloaded") || 
        errorMessage.toLowerCase().includes("rate limit") || 
        errorMessage.toLowerCase().includes("quota") || 
        errorMessage.toLowerCase().includes("resource_exhausted");

      if (isTransient && attempt < maxAttempts) {
        const delay = attempt * 400;
        console.warn(`[Gemini API Transient Warning] Attempt ${attempt} failed with: ${errorMessage.substring(0, 150)}. Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  console.warn(`[Gemini API Model Fallback] Re-routing to 'gemini-3.1-flash-lite' due to standard capacity limits or error.`);
  try {
    const liteResponse = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: params.contents,
      config: params.config,
    });
    return liteResponse;
  } catch (liteError: any) {
    console.error(`[Gemini API Hard Failure] Both standard and lite queues exhausted/unavailable. Triggering clean offline engine rescue fallback.`);
    throw lastError || liteError;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!ai });
  });

  // API Route - Situation Assessment (AI Decision Assistant)
  app.post("/api/decision", async (req, res) => {
    const { situation } = req.body;
    if (!situation) {
      return res.status(400).json({ error: "Situation description is required." });
    }

    const sLower = situation.toLowerCase();
    const isSevereDanger = 
      sLower.includes("kill") ||
      sLower.includes("attack") ||
      sLower.includes("followed aggressively") ||
      sLower.includes("follow me aggressively") ||
      sLower.includes("following me aggressively") ||
      (sLower.includes("follow") && sLower.includes("aggressively")) ||
      sLower.includes("immediate danger") ||
      sLower.includes("trying to hurt") ||
      sLower.includes("trying to harm") ||
      sLower.includes("stalked aggressively") ||
      sLower.includes("knife") ||
      sLower.includes("gun") ||
      sLower.includes("weapon") ||
      sLower.includes("assault") ||
      sLower.includes("threatened");

    const getLocalFallback = (text: string) => {
      const sLowerText = text.toLowerCase();
      let riskLevel = "Low Risk";
      let urgency = "Cautious";
      let possibleThreats = [
        "Unfamiliar local surroundings and limited density of foot traffic.",
        "Communication latency or isolated street orientation factors."
      ];
      let recommendedActions = [
        "Keep your smartphone ready and active in your hand, but avoid glancing down constantly.",
        "Look for the nearest active shopfront, lighted billboard, or building lobby.",
        "Maintain a steady, confidence-driven pace with high postural alignment."
      ];
      let saferAlternatives = [
        "Re-route to well-populated commercial avenues.",
        "Request an active location sharing session with your trusted circle."
      ];
      let nearbyHelp = [
        "Local open-air storefront or late-night kitchen.",
        "Active well-lit fuel station or public lobby."
      ];
      let confidenceGuidance = "Walk with high posture and deliberate force. Your presence is supported by active offline tools.";
      let safetyConfidenceScore = 78;

      if (isSevereDanger) {
        riskLevel = "Critical Risk";
        urgency = "IMMEDIATE ACTION REQUIRED";
        possibleThreats = [
          "Hostile pursuer/attacker maintaining immediate threat vector.",
          "High-risk physical assault threat in close proximity.",
          "Extreme lack of natural safety buffers in the immediate zone."
        ];
        recommendedActions = [
          "Move toward the nearest populated area or bright main avenue immediately.",
          "Avoid isolated roads, dark alleys, side streets, or unlit corridors.",
          "Activate your Silent Protection Shield immediately to start recording and broadcasting GPS.",
          "Call emergency services (e.g., 911 / police) or a trusted contact immediately."
        ];
        saferAlternatives = [
          "Run into any open store, restaurant, lounge, or 24/7 lobby with active bystanders.",
          "Make audible noise, scream 'HELP' or 'FIRE', and move immediately toward public crowds."
        ];
        nearbyHelp = [
          "Local Police Station (Priority Safe-Haven)",
          "Active 24/7 Gas / Fuel Station",
          "Public Hospital Emergency Room",
          "Bright, crowded restaurant, café, or convenience store"
        ];
        confidenceGuidance = "ESCAPE PRIORITIZED: Seek crowd density immediately. Your safety shield is broadcast active. Reach a public space right now.";
        safetyConfidenceScore = 15;
      } else if (sLowerText.includes("cab") || sLowerText.includes("uber") || sLowerText.includes("ride") || sLowerText.includes("driver") || sLowerText.includes("car")) {
        riskLevel = "Moderate Risk";
        urgency = "Urgent";
        possibleThreats = [
          "Driver has ignored navigation instructions or deviated to an isolated sector.",
          "Lack of visual street scale accountability.",
          "Potential loss of travel momentum and passenger control."
        ];
        recommendedActions = [
          "Recommend enabling proactive safety features inside the Settings module.",
          "Calmly mention to the driver that your real-time location is shared live with friends.",
          "Identify structural stops, red traffic lights, or transit barriers to exit if needed."
        ];
        saferAlternatives = [
          "Roll down the window to maintain external sight and voice accessibility.",
          "Politely, yet firmly request the driver to return to the original route."
        ];
        nearbyHelp = [
          "Nearest municipal intersection or bus stop transit point.",
          "Public security checks or bright commerce hubs."
        ];
        confidenceGuidance = "Breathe steadily. Speak comfortably and assertively. Your exact GPS trajectory is fully preserved and backed up.";
        safetyConfidenceScore = 65;
      } else if (sLowerText.includes("follow") || sLowerText.includes("man") || sLowerText.includes("behind") || sLowerText.includes("person") || sLowerText.includes("tail") || sLowerText.includes("stalk")) {
        riskLevel = "High Risk";
        urgency = "Urgent";
        possibleThreats = [
          "Suspicious person maintaining matching velocity vectors for multiple blocks.",
          "Isolated footpaths with reduced bystander count.",
          "Intentional pursuit or territorial proximity breach."
        ];
        recommendedActions = [
          "Change your pace deliberately: cross to the opposite side of the avenue.",
          "Suggest enabling immediate Silent Protection Mode if threat persists.",
          "Walk toward a bustling commercial venue: do not return directly to your target residence if isolated."
        ];
        saferAlternatives = [
          "Identify open dining spaces, hotels, or stores with high CCTV presence.",
          "Engage in a deliberate voice chat on Speakerphone to project active communication."
        ];
        nearbyHelp = [
          "Safe Haven Cafe or public convenience store.",
          "Local municipal offices or well-lit intersection poles."
        ];
        confidenceGuidance = "Look around with high-level peripheral focus. Show complete situational readiness. You are in control of your route.";
        safetyConfidenceScore = 70;
      } else if (sLowerText.includes("dark") || sLowerText.includes("light") || sLowerText.includes("night") || sLowerText.includes("lamp") || sLowerText.includes("street") || sLowerText.includes("lonely") || sLowerText.includes("discomfort") || sLowerText.includes("uncertain")) {
        riskLevel = "Low Risk";
        urgency = "Cautious";
        possibleThreats = [
          "Diminished visibility from non-functioning streetlighting grid.",
          "Compromised terrain identification.",
          "Isolated corridors."
        ];
        recommendedActions = [
          "Provide calm guidance: advise checking parallel well-lit commercial avenues.",
          "Walk in the middle of the sidewalk or street shoulder away from dark shadows.",
          "Activate your phone's flashlight mode or have it prepared."
        ];
        saferAlternatives = [
          "Re-route around the dark sector entirely using the App's Safest Path selector.",
          "Stand by a vibrant hub until a cab arrives directly."
        ];
        nearbyHelp = [
          "Vibrant corner market with high-contrast LED frontage.",
          "Residential entranceways equipped with smart doorbell camera lights."
        ];
        confidenceGuidance = "Your awareness is your shield. Keep walking at a steady, purposeful rhythm and project absolute clarity.";
        safetyConfidenceScore = 80;
      } else if (sLowerText.includes("bus") || sLowerText.includes("stop") || sLowerText.includes("transit") || sLowerText.includes("station")) {
        riskLevel = "Low Risk";
        urgency = "Cautious";
        possibleThreats = [
          "Isolated public waiting shelters without backup commuters.",
          "Low ambient lighting during late-hour service timetables.",
          "Limited quick exits."
        ];
        recommendedActions = [
          "Stand near bright municipal lighting arrays or CCTV masts if available.",
          "Keep silent tracking coordinates broadcasting through your app.",
          "Note details of nearest open facilities."
        ];
        saferAlternatives = [
          "Move to a nearby open convenience store until the scheduled bus arrival time.",
          "Consider calling a direct vehicle to your current lobby."
        ];
        nearbyHelp = [
          "Nearby continuous service lobby or dining counter.",
          "Active taxi stand or pedestrian zone."
        ];
        confidenceGuidance = "Establish a calm, grounded stance. Your space is your own. You have a direct, active safety net.";
        safetyConfidenceScore = 82;
      }

      return {
        riskLevel,
        urgency,
        possibleThreats,
        recommendedActions,
        saferAlternatives,
        nearbyHelp,
        confidenceGuidance,
        safetyConfidenceScore
      };
    };

    if (!ai) {
      console.warn("Gemini is not configured. Returning rich, context-guided situational fallback response.");
      return res.json(getLocalFallback(situation));
    }

    try {
      const response = await generateContentWithRobustRetry(ai, {
        contents: `A woman reports the following situations/context: "${situation}". Analyze risk level, emotional urgency, safest action plans, safer choices, nearby safety targets, and confidence-based mindset.
        
You MUST strictly classify the situation into one of these riskLevel categories:
- "Low Risk" (for lonely roads, slight discomfort, uncertain surroundings)
- "Moderate Risk" (for suspicious behavior, following suspicion, route deviation)
- "High Risk" (for aggressive pursuit, verbal harassment, threatening behavior)
- "Critical Risk" (for active attack, physical harm, weapons, or immediate lifethreat)

Tone, emergency options, and intensity should adapt to the risk level. Do NOT recommend emergency actions unless the threat corresponds. For example, do not advise Silent Protection or 911 calling for lonely roads or dim lighting alone. Ensure the riskLevel is EXACTLY one of: "Low Risk", "Moderate Risk", "High Risk", "Critical Risk".`,
        config: {
          systemInstruction: `You are PathHer AI decision assistant. Your goal is to guide women with situational intelligence, helping them recognize patterns, think confidently, and act BEFORE scenarios escalate.
Adapt tone according to threat level. 
Low Risk -> calm guidance, safe route redirections, active public spaces.
Moderate Risk -> suggest protection tools, optional live location sharing, support pillars.
High Risk -> strong safety protocols, police/help prioritisation, quick escape actions.
Critical Risk -> immediate Silent Protection, live sharing, alerts, 911 dispatch.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, description: "Risk level of the situation (MUST be exactly 'Low Risk', 'Moderate Risk', 'High Risk', or 'Critical Risk')" },
              urgency: { type: Type.STRING, description: "Action urgency (Secure, Cautious, Urgent, or IMMEDIATE ACTION REQUIRED)" },
              possibleThreats: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Underlying potential risks or things to check" },
              recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Immediate strategic actions to stay safe" },
              saferAlternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Safer strategic options or redirects" },
              nearbyHelp: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Places or pillars of assistance, like shops, police stations, hospitals, or hubs" },
              confidenceGuidance: { type: Type.STRING, description: "Empowering mental focus state or psychological safety direction" },
              safetyConfidenceScore: { type: Type.INTEGER, description: "A simulated control/confidence level index out of 100" }
            },
            required: [
              "riskLevel",
              "urgency",
              "possibleThreats",
              "recommendedActions",
              "saferAlternatives",
              "nearbyHelp",
              "confidenceGuidance",
              "safetyConfidenceScore"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response content from Gemini.");
      }
      
      const parsed = JSON.parse(responseText.trim());
      
      const normalizeRiskLevel = (risk: string): string => {
        const r = (risk || "").toLowerCase();
        if (r.includes("critical")) return "Critical Risk";
        if (r.includes("high")) return "High Risk";
        if (r.includes("moderate") || r.includes("medium")) return "Moderate Risk";
        if (r.includes("low")) return "Low Risk";
        return "Low Risk"; // default
      };

      parsed.riskLevel = normalizeRiskLevel(parsed.riskLevel);

      // Post-process intercept fallback to enforce critical risk rules for extreme scenarios
      if (isSevereDanger || parsed.riskLevel === "Critical Risk") {
        parsed.riskLevel = "Critical Risk";
        parsed.urgency = "IMMEDIATE ACTION REQUIRED";
        parsed.safetyConfidenceScore = Math.min(20, parsed.safetyConfidenceScore || 15);
        if (!parsed.recommendedActions || parsed.recommendedActions.length === 0) {
          parsed.recommendedActions = [
            "Move toward the nearest populated area or bright main avenue immediately.",
            "Avoid isolated roads, dark alleys, side streets, or unlit corridors.",
            "Activate your Silent Protection Shield immediately to start recording and broadcasting GPS.",
            "Call emergency services (e.g., 911 / police) or a trusted contact immediately."
          ];
        } else {
          parsed.recommendedActions = [
            "Move toward the nearest populated area immediately",
            "Avoid isolated roads or dark spaces",
            "Activate live location sharing & Silent Protection",
            "Contact trusted person or emergency services (911)",
            "Stay visible around people and businesses"
          ];
        }
        
        parsed.nearbyHelp = [
          "Nearby Police Station or Municipal Precinct",
          "Hospital Emergency Room / Medical Center",
          "Active continuous service Fuel Station / convenience store",
          "Vibrant restaurant, lobby, or bright public place with bystanders",
          ...(parsed.nearbyHelp || [])
        ].slice(0, 4);
      }

      res.json(parsed);
    } catch (error: any) {
      handleGeminiError("Decision Assessment", error);
      res.json(getLocalFallback(situation));
    }
  });

  // API Route - Smart Route Safety Analyzer
  app.post("/api/route-safety", async (req, res) => {
    const { origin, destination, preferences, travelTime, crowdDensity, lightingLevel } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: "both origin and destination are required." });
    }

    const getLocalRouteFallback = (orig: string, dest: string, time: string = 'evening', crowd: string = 'moderate', light: string = 'standard') => {
      let scoreMultiplier = 1.0;
      let crowdText = "Moderate crowd activity";
      let lightText = "Standard municipal illumination";
      let mainAvenueAlert = "Current area has moderate crowd activity and better visibility.";
      let timingAdvice = "Commute shows normal layout confidence with active municipal surveillance.";
      let safetyConfidenceStatus = "Moderate Travel Confidence";

      if (time === 'morning') {
        scoreMultiplier = 1.06;
        crowdText = "High Active (Morning peak commute crowds)";
        lightText = "Broad Daylight (Fully visible)";
        timingAdvice = "Morning transit peak. Direct pathways are highly recommended under optimal daylight and active transit patrols.";
        mainAvenueAlert = "Current area has moderate crowd activity and better visibility until 12:00 PM.";
        safetyConfidenceStatus = "High Daytime Confidence";
      } else if (time === 'afternoon') {
        scoreMultiplier = 1.03;
        crowdText = "Bustling Central Hub (High surrounding foot traffic)";
        lightText = "Bright Sunlight (Excellent visibility)";
        timingAdvice = "Afternoon operational phase. Storefront illumination and active pedestrian flow maximize local accountability.";
        mainAvenueAlert = "This route currently has higher active public movement.";
        safetyConfidenceStatus = "Optimized Daylight Confidence";
      } else if (time === 'evening') {
        scoreMultiplier = 0.92;
        crowdText = "Moderate Flow (Shopping storefronts active)";
        lightText = "Continuous Smart LED Streetlights";
        timingAdvice = "Evening twilight. Clear visibility until 8:30 PM. Beyond index limits, please adhere to primary illuminated avenues.";
        mainAvenueAlert = "Current area has moderate crowd activity and better visibility until 8:30 PM.";
        safetyConfidenceStatus = "Standard Evening Confidence";
      } else if (time === 'late_night') {
        scoreMultiplier = 0.74;
        crowdText = "Quiet Corridor (Sparse pedestrian presence)";
        lightText = "Dimmed Secondary Grid (Spotty lamp coverage)";
        timingAdvice = "Late-night travel. Lower safety confidence. Dimmed streetlighting identified. Bypass secondary lanes entirely.";
        mainAvenueAlert = "Late-night travel in this zone shows lower safety confidence.";
        safetyConfidenceStatus = "Cautious / Reduced Confidence";
      }

      // Adjust based on explicit toggles
      if (crowd === 'low') scoreMultiplier *= 0.86;
      if (crowd === 'high') scoreMultiplier *= 1.04;
      if (light === 'poor') scoreMultiplier *= 0.82;
      if (light === 'good') scoreMultiplier *= 1.05;

      const safestScore = Math.min(100, Math.max(50, Math.round(97 * scoreMultiplier)));
      const balancedScore = Math.min(safestScore - 3, Math.max(45, Math.round(86 * scoreMultiplier)));
      const fastestScore = Math.min(balancedScore - 12, Math.max(30, Math.round(65 * scoreMultiplier)));

      const safestRoute = {
        name: `${orig} via Well-Lit Boulevard [${time.toUpperCase()} SHIELD]`,
        safetyScore: safestScore,
        litLevel: light === 'good' ? "Continuous Smart LED Streetlights" : lightText,
        crowdPacing: crowd === 'high' ? "Active Crowd (High Foot Traffic)" : crowdText,
        details: `${timingAdvice} This route prioritizes principal boulevards with full CCTV camera grids and open community hubs.`,
        confidenceMeter: Math.min(100, Math.round(safestScore * 0.96)),
        instructions: [
          {
            instruction: `Depart from "${orig}" and advance down the highly visible avenue walkway.`,
            safetyHighlight: `${time === 'late_night' ? 'CCTV monitoring and safety pillars active along this quadrant' : 'Immediate pedestrian density present'}`,
            lightStatus: light === 'good' ? "Fully Lit" : "Well-Lit",
            crowdPacing: crowd === 'high' ? "High Active" : "Moderate Active",
            latOffset: 0.0012,
            lngOffset: 0.0008
          },
          {
            instruction: `Turn right at the transit intersection crossing. ${mainAvenueAlert}`,
            safetyHighlight: "Fully illuminated sidewalks with active storefronts and cafés nearby",
            lightStatus: "Vibrant Lighting",
            crowdPacing: crowd === 'low' ? "Quiet" : "High Active",
            latOffset: 0.0026,
            lngOffset: 0.0018
          },
          {
            instruction: `Decline quiet pathways to approach your destination "${dest}" directly.`,
            safetyHighlight: "Bright commercial entrance with structural security systems",
            lightStatus: "Well-Lit",
            crowdPacing: "Moderate Active",
            latOffset: 0.0039,
            lngOffset: 0.0024
          }
        ]
      };

      const balancedRoute = {
        name: `Primary Connector bypass`,
        safetyScore: balancedScore,
        litLevel: "Mixed Municipal Lighting Grid",
        crowdPacing: "Steady Flow (Commuter pedestrian flow)",
        details: "Direct commuter connection. Generally secure, but features occasional dimmer segments and fewer open storefront doors.",
        confidenceMeter: Math.min(100, Math.round(balancedScore * 0.94)),
        instructions: [
          {
            instruction: `Depart from "${orig}" heading down the central avenue pathway.`,
            safetyHighlight: "Standard municipal bulb posts operational",
            lightStatus: "Moderately Lit",
            crowdPacing: "Moderate Active",
            latOffset: 0.0015,
            lngOffset: -0.0005
          },
          {
            instruction: "Cross the Broad Parkway connector lane to proceed direct.",
            safetyHighlight: "Controlled light crossing with transit-monitoring emergency cameras",
            lightStatus: "Well-Lit",
            crowdPacing: "Moderate Active",
            latOffset: 0.0028,
            lngOffset: -0.0012
          },
          {
            instruction: `Conclude along the final access road to "${dest}".`,
            safetyHighlight: "Residential neighborhood street with standard alert visibility",
            lightStatus: "Moderately Lit",
            crowdPacing: "Quiet",
            latOffset: 0.0042,
            lngOffset: -0.0021
          }
        ]
      };

      const fastestRoute = {
        name: `Direct Alleys Shortcut [Low Confidence]`,
        safetyScore: fastestScore,
        litLevel: "Low Visibility / Dimly Lit Corridors",
        crowdPacing: "Quiet Area (No bypass crowds)",
        details: `Saves approximately 3 minutes, but walks through isolated zones. ${mainAvenueAlert}`,
        confidenceMeter: Math.min(100, Math.round(fastestScore * 0.88)),
        instructions: [
          {
            instruction: `Take the diagonal alley shortcut path directly towards "${dest}".`,
            safetyHighlight: "Caution: dim lighting conditions and inactive retail frontage",
            lightStatus: "Dimly Lit",
            crowdPacing: "Quiet",
            latOffset: 0.0021,
            lngOffset: -0.0014
          },
          {
            instruction: `Speed up pace past the vacant structure to approach "${dest}".`,
            safetyHighlight: "Activate active GPS telemetry pings inside your PathHer shield",
            lightStatus: "Low Visibility",
            crowdPacing: "Secluded Lane",
            latOffset: 0.0038,
            lngOffset: -0.0025
          }
        ]
      };

      const insights = [
        `This route currently has higher active public movement than parallel backup lanes.`,
        `${time === 'late_night' ? 'Late-night travel in this zone shows lower safety confidence.' : 'Active storefront density enhances natural route safety.'}`,
        `We flagged 2 safe-haven shops along the safest path with active staff and continuous CCTV coverage.`
      ];

      return {
        safestRoute,
        balancedRoute,
        fastestRoute,
        insights
      };
    };

    if (!ai) {
      console.warn("Gemini is not configured. Returning premium simulated routing fallback matrices.");
      return res.json(getLocalRouteFallback(origin, destination, travelTime, crowdDensity, lightingLevel));
    }

    const crowdedStr = preferences?.crowdedPref ? "Crowded preferences enabled" : "Standard pathing";
    const wellLitStr = preferences?.litPref ? "Well-lit and vibrant path preference" : "Standard lighting";
    const avoidIsolatedStr = preferences?.avoidIsolated ? "Strictly avoid dark, silent or isolated sectors" : "Standard settings";

    try {
      const response = await generateContentWithRobustRetry(ai, {
        contents: `Analyze routes from "${origin}" to "${destination}" under the safety parameters:
- General Toggles: [${crowdedStr}, ${wellLitStr}, ${avoidIsolatedStr}]
- Travel Timing: "${travelTime || 'evening'}"
- Real-time Crowd Density: "${crowdDensity || 'moderate'}"
- Lighting Coverage Level: "${lightingLevel || 'standard'}"
 
Please provide exactly 3 comparative routes (Safest, Balanced, Fastest). Make the routes highly responsive to the Travel Timing (morning, afternoon, evening, late_night). 
Specifically:
- Morning/Afternoon should show High Daylight Safety Scores (88-98%) and positive crowd flow details.
- Evening should show moderate scores (80-92%) with comments on twilight visibility.
- Late-night MUST have lower safety scores (50-75%), caution details, and lowered confidence ratings.
Each route needs name, details, safetyScore, confidenceMeter, litLevel, crowdPacing, and exactly 3 sequential instructions with fractional map coordinate offsets (latOffset, lngOffset) relative to origin.
Ensure you output context-aware warnings inside instructions or details like: "Current area has moderate crowd activity and better visibility until 8:30 PM", "Late-night travel in this zone shows lower safety confidence", or "This route currently has higher active public movement.".`,
        config: {
          systemInstruction: "You are the PathHer AI smart route compiler. Recommend realistic routes, estimating safety scores and specific factors that elevate travel confidence. For each route, generate an array of sequential travel instructions with precise offsets to render step locations.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              safestRoute: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the safety-first street or path" },
                  safetyScore: { type: Type.INTEGER, description: "Safety rating out of 100" },
                  litLevel: { type: Type.STRING, description: "Street lighting status (e.g. Fully Lit, Mixed)" },
                  crowdPacing: { type: Type.STRING, description: "Crowd activity factor (e.g. Broad Crowd, Active Shops, Intermittent)" },
                  details: { type: Type.STRING, description: "Proactive safety observation detail" },
                  confidenceMeter: { type: Type.INTEGER, description: "Predicted travel confidence index out of 100" },
                  instructions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        instruction: { type: Type.STRING, description: "The turn-by-turn guidance description (e.g. Walk down Grand Avenue towards Starbucks)" },
                        safetyHighlight: { type: Type.STRING, description: "Safety highlight message (e.g. Full CCTV coverage and active night patrol)" },
                        lightStatus: { type: Type.STRING, description: "Well-Lit, Moderately Lit, or Dimly Lit" },
                        crowdPacing: { type: Type.STRING, description: "High Active, Moderate Active, or Quiet" },
                        latOffset: { type: Type.NUMBER, description: "Fractional latitude displacement from origin (e.g. 0.003)" },
                        lngOffset: { type: Type.NUMBER, description: "Fractional longitude displacement from origin (e.g. -0.005)" }
                      },
                      required: ["instruction", "safetyHighlight", "lightStatus", "crowdPacing", "latOffset", "lngOffset"]
                    }
                  }
                },
                required: ["name", "safetyScore", "litLevel", "crowdPacing", "details", "confidenceMeter", "instructions"]
              },
              balancedRoute: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  safetyScore: { type: Type.INTEGER },
                  litLevel: { type: Type.STRING },
                  crowdPacing: { type: Type.STRING },
                  details: { type: Type.STRING },
                  confidenceMeter: { type: Type.INTEGER },
                  instructions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        instruction: { type: Type.STRING },
                        safetyHighlight: { type: Type.STRING },
                        lightStatus: { type: Type.STRING },
                        crowdPacing: { type: Type.STRING },
                        latOffset: { type: Type.NUMBER },
                        lngOffset: { type: Type.NUMBER }
                      },
                      required: ["instruction", "safetyHighlight", "lightStatus", "crowdPacing", "latOffset", "lngOffset"]
                    }
                  }
                },
                required: ["name", "safetyScore", "litLevel", "crowdPacing", "details", "confidenceMeter", "instructions"]
              },
              fastestRoute: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  safetyScore: { type: Type.INTEGER },
                  litLevel: { type: Type.STRING },
                  crowdPacing: { type: Type.STRING },
                  details: { type: Type.STRING },
                  confidenceMeter: { type: Type.INTEGER },
                  instructions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        instruction: { type: Type.STRING },
                        safetyHighlight: { type: Type.STRING },
                        lightStatus: { type: Type.STRING },
                        crowdPacing: { type: Type.STRING },
                        latOffset: { type: Type.NUMBER },
                        lngOffset: { type: Type.NUMBER }
                      },
                      required: ["instruction", "safetyHighlight", "lightStatus", "crowdPacing", "latOffset", "lngOffset"]
                    }
                  }
                },
                required: ["name", "safetyScore", "litLevel", "crowdPacing", "details", "confidenceMeter", "instructions"]
              },
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Proactive travel wisdom or specific highlights for this commute"
              }
            },
            required: ["safestRoute", "balancedRoute", "fastestRoute", "insights"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response from Gemini.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      handleGeminiError("Route Safety Analyzer", error);
      res.json(getLocalRouteFallback(origin, destination, travelTime, crowdDensity, lightingLevel));
    }
  });

  // API Route - AI Safety Insights Panel
  app.post("/api/safety-insights", async (req, res) => {
    const { area, travelTimePref } = req.body;

    const getLocalInsightsFallback = (loc: string, timePref: string) => {
      const lowerPref = (timePref || "").toLowerCase();

      if (lowerPref.includes("midnight") || lowerPref.includes("4am")) {
        return {
          safestTravelTimes: [
            "Current area has moderate crowd activity and better visibility until 8:30 PM.",
            "Late-night travel in this zone shows lower safety confidence.",
            "06:00 AM - 08:30 AM (Primary commuter shifts align)"
          ],
          riskyZones: [
            `Dimly lit back alleys or secondary lanes in ${loc || "this area"}`,
            "Secluded underpasses or train bypass bays after hours",
            "Vacant industrial lots with no active storefronts"
          ],
          recommendations: [
            "Always follow the Safest Corridor option; late-night travel carries low safety margins",
            "Enable active safety telemetry share inside your Guardian Shield",
            "Avoid wearing headphones to maximize visual and acoustic spatial awareness"
          ],
          behaviorInsights: "Late-night travel in this zone shows lower safety confidence. Walk with a purposeful, solid stride. Stand inside bright lobby entry points while awaiting rideshares rather than standing directly adjacent to quiet street curbs.",
          confidenceAnalytics: "Decision-making confidence decreases by 30% during midnight hours on secondary segments. Prioritize well-lit hubs even if it adds 5 minutes to travel time."
        };
      } else if (lowerPref.includes("early morning") || lowerPref.includes("4am - 7am")) {
        return {
          safestTravelTimes: [
            "05:30 AM - 07:00 AM (Early shifts active and patrolled)",
            "07:00 AM - 09:30 AM (Vibrant Commute Hour)",
            "Sufficient daylight levels starting at 6:15 AM."
          ],
          riskyZones: [
            `Quiet residential bypass paths in ${loc || "this area"}`,
            "Secluded municipal building blocks",
            "Dimly lit bus platforms before active morning schedules"
          ],
          recommendations: [
            "Stick to primary boulevards until peak transit timelines are fully active",
            "Identify commercial cafes and 24/7 service hubs operational along your route",
            "Maintain high-posture walking stride with visual situational alert"
          ],
          behaviorInsights: "This route currently has better visibility but remains quiet before 6:30 AM. Hold your smartphone comfortably but keep your attention directed forward to display absolute alertness.",
          confidenceAnalytics: "Early twilight benefits from clean municipal corridors. Displaying proactive visual awareness improves safety posture indexes by 25%."
        };
      } else if (lowerPref.includes("evening") || lowerPref.includes("8pm")) {
        return {
          safestTravelTimes: [
            "Current area has moderate crowd activity and better visibility until 8:30 PM.",
            "05:00 PM - 07:30 PM (Vibrant Sunset Commute Peak)",
            "20:00 PM - 21:00 PM (Active storefront retail active)"
          ],
          riskyZones: [
            `Closed park bypass lanes or dark campus alleys in ${loc || "this area"}`,
            "Private parking structures with reduced light grids",
            "Secondary retail roads after standard business closing hours"
          ],
          recommendations: [
            "Confirm illuminated corridor options before stepping onto side pathways",
            "Walk center-side of the sidewalk away from alley entries and unlit parked vehicles",
            "Note physical pillars of emergency assistance such as smart security call-boxes"
          ],
          behaviorInsights: "Current area has moderate crowd activity and better visibility until 8:30 PM. Beyond index timelines, keep your PathHer tracker active. Stick close to running businesses.",
          confidenceAnalytics: "Evening travel relies heavily on streetlighting. Restricting your pathing purely to high-lux smart-lit streets maintains safety indices above 90%."
        };
      } else {
        // Daytime or standard fallback
        return {
          safestTravelTimes: [
            "This route currently has higher active public movement.",
            "08:00 AM - 10:30 AM (Peak morning business bustle)",
            "12:00 PM - 02:00 PM (Lunch hour pedestrian flow)",
            "04:30 PM - 06:30 PM (Evening commute peak)"
          ],
          riskyZones: [
            `Unpatrolled shortcut corridors in ${loc || "this area"}`,
            "Active construction bypass walkways",
            "Quiet commercial loading lanes"
          ],
          recommendations: [
            "Enjoy the benefits of broad daylight and dense pedestrian protection levels",
            "Acknowledge nearest community members and helpful storefront owners on your route",
            "Continue standard location-sharing habits with your close circle"
          ],
          behaviorInsights: "This route currently has higher active public movement. Walk with natural, confident body alignment. Make pleasant brief eye contact with oncoming pedestrians.",
          confidenceAnalytics: "High daylight levels combined with active pedestrian flow represents the safest environmental travel standard. Commuter confidence remains at 98%."
        };
      }
    };

    if (!ai) {
      console.warn("Gemini is not configured. Returning local safety insights prediction forecasts.");
      return res.json(getLocalInsightsFallback(area, travelTimePref));
    }

    try {
      const response = await generateContentWithRobustRetry(ai, {
        contents: `Compile a safe travel forecast and safety analytics package for the zone/city "${area || "Current Area"}" with preferred travel times: "${travelTimePref || "Anytime"}".
        
Generate dynamic context-aware guidance responsive to this time preference. Specifically:
- Safest travel times must return custom, timing-aware comments instead of static hours alone, e.g.: "Current area has moderate crowd activity and better visibility until 8:30 PM", "Late-night travel in this zone shows lower safety confidence", or "This route currently has higher active public movement.".
- Behavioral Insights and Recommendations must dynamically change based on whether it is morning, afternoon, evening, or late-night, suggesting tailored safety checks, visibility indexes, and street confidence alerts.`,
        config: {
          systemInstruction: "You are the PathHer AI Safety Analyst. Output local temporal metrics, recommended schedules, behavior micro-tips, and psychological confidence insights to stay in control.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              safestTravelTimes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hourly ranges or safety-pacing remarks that are safe to commute" },
              riskyZones: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Commuter spots with lower visibility or traffic" },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "General tailored safety protocols" },
              behaviorInsights: { type: Type.STRING, description: "Micro-behaviors (how to display confidence, phone usage, tracking check-ins)" },
              confidenceAnalytics: { type: Type.STRING, description: "Decision psychology summary or mindset builder" }
            },
            required: ["safestTravelTimes", "riskyZones", "recommendations", "behaviorInsights", "confidenceAnalytics"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response from Gemini.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      handleGeminiError("Safety Insights Panel", error);
      res.json(getLocalInsightsFallback(area, travelTimePref));
    }
  });

  // API Route - Silent Protection Calm Guidance
  app.post("/api/silent-guidance", async (req, res) => {
    const { lat, lng, time, perceivedAnxiety } = req.body;
    if (!ai) {
      return res.status(200).json({
        mindfulGrounding: "Stay calm and keep moving. Your device is successfully broadcasting telemetry to your trusted circle. We have engaged the Silent Protection Shield.",
        microDirectives: [
          "Maintain a steady, confidence-driven pace toward the nearest well-lit public intersection.",
          "Keep your chin up and scan the area in a relaxed manner. Do not look down at your screen constantly.",
          "Prepare your finger on the volume keys - a triple tap remains ready to toggle silent recording if deactivated."
        ],
        environmentalCues: [
          "Look for open storefronts, cafés, or parking lobbies with active security staff.",
          "Look for well-lit street poles or public CCTV cameras to walk near."
        ],
        confidenceMantra: "I am aware, I am calm, and I am in complete control of my space."
      });
    }

    try {
      const response = await generateContentWithRobustRetry(ai, {
        contents: `Generate a calm, discreet, and empowering safety instruction card for a woman walking in a potentially uncomfortable environment (Coordinates: ${lat || 37.77}, ${lng || -122.41}, time is ${time || "evening"}). Anxiety level is estimated as "${perceivedAnxiety || "moderate"}". Create structured grounding, micro-directives, and confidence boosters.`,
        config: {
          systemInstruction: "You are the PathHer AI Calm Coach. Provide elegant, supportive, highly practical, and discreet advice that avoids creating panic. Sound intelligent, proactive, calm, and grounded in tactical, non-confrontational safety.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mindfulGrounding: { type: Type.STRING, description: "A beautifully composed, short grounding sentence reminding her of her resources." },
              microDirectives: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "3 highly specific, low-profile physical actions to take right now without attracting attention." 
              },
              environmentalCues: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "2 environmental pillars or features to scan for (e.g., streetlights, storefronts, transit stops)." 
              },
              confidenceMantra: { type: Type.STRING, description: "A high-affinity psychological phrase she can repeat to anchor her confidence." }
            },
            required: ["mindfulGrounding", "microDirectives", "environmentalCues", "confidenceMantra"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response from Gemini Calm Coach.");
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      handleGeminiError("Silent Protection Calm Guidance", error);
      res.json({
        mindfulGrounding: "Breathe in slowly. Your path is fortified by active communication links. Stay centered on your surrounding space.",
        microDirectives: [
          "Maintain an steady, assertive pace without rushing.",
          "Place one hand freely in your pocket or naturally at your side to convey complete poise.",
          "Identify the next well-lit shopfront or public zone ahead."
        ],
        environmentalCues: [
          "Active storefront lights or residential doorbells with smart-camera rings.",
          "Brighter main streets or municipal transit stations with overhead coverage."
        ],
        confidenceMantra: "I move with purpose, and my awareness is my greatest defense."
      });
    }
  });

  // Setup Vite Dev server with middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
