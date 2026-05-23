import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Size of the icon
  showText?: boolean; // Whether to show text below
  colorClass?: string; // Optional custom color/text styling classes
}

export function SafeNavLogo({ className = '', size = 80, showText = true, colorClass = 'text-rose-400' }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* SVG Vector Graphic of Three Stylized Female Faces (Line Art matching user's SECURE artwork) */}
      <svg
        viewBox="0 0 400 360"
        width={size}
        height={(size * 360) / 400}
        fill="currentColor"
        className={`transition-all duration-300 ${colorClass}`}
      >
        {/* HAIR STRANDS & FLOWS - CROWNING PATHS */}
        {/* Leftmost sweeping hair arc */}
        <path d="M 68 80 C 40 120 52 180 70 210 C 72 215 70 220 65 220 C 58 220 52 195 50 160 C 48 115 62 85 72 75 C 75 72 70 76 68 80 Z" opacity="0.9" />
        
        {/* Sweeping left hair strand crowning left profile */}
        <path d="M 120 40 C 90 60 70 95 72 135 C 74 175 60 215 52 230 C 50 234 54 235 56 230 C 68 200 80 150 78 110 C 76 75 95 52 115 42 C 120 40 122 38 120 40 Z" />
        
        {/* Symmetrical sweeping right hair strand crowning right profile */}
        <path d="M 280 40 C 310 60 330 95 328 135 C 326 175 340 215 348 230 C 350 234 346 235 344 230 C 332 200 320 150 322 110 C 324 75 305 52 285 42 C 280 40 278 38 280 40 Z" />
        
        {/* Rightmost sweeping hair arc */}
        <path d="M 332 80 C 360 120 348 180 330 210 C 328 215 330 220 335 220 C 342 220 348 195 350 160 C 352 115 338 85 328 75 C 325 72 330 76 332 80 Z" opacity="0.9" />

        {/* Center-left parting hair waves (swoops down to left cheek) */}
        <path d="M 170 30 C 140 45 125 75 120 110 C 115 140 125 180 135 210 C 137 215 130 220 126 215 C 112 180 102 135 106 100 C 110 65 130 40 165 24 C 170 22 172 26 170 30 Z" />
        
        {/* Center-right parting hair waves (swoops down to right cheek) */}
        <path d="M 230 30 C 260 45 275 75 280 110 C 285 140 275 180 265 210 C 263 215 270 220 274 215 C 288 180 298 135 294 100 C 290 65 270 40 235 24 C 230 22 228 26 230 30 Z" />

        {/* Center main crown hair flows (ascending horns/leaves style strands) */}
        <path d="M 200 24 C 185 45 155 75 150 100 C 148 110 152 112 154 106 C 160 85 185 60 200 45 C 215 60 240 85 246 106 C 248 112 252 110 250 100 C 245 75 215 45 200 24 Z" />
        <path d="M 200 45 C 175 65 160 95 158 115 C 156 120 160 120 162 115 C 170 90 190 75 200 65 C 210 75 230 90 238 115 C 240 120 244 120 242 115 C 240 95 225 65 200 45 Z" opacity="0.8" />

        {/* Outer side hair locks sweeping behind ears */}
        <path d="M 85 110 C 80 135 78 165 82 195 C 84 210 90 225 96 235 C 98 238 94 242 90 240 C 80 230 72 205 72 175 C 72 145 78 120 84 105 C 86 100 87 105 85 110 Z" />
        <path d="M 315 110 C 320 135 322 165 318 195 C 316 210 310 225 304 235 C 302 238 306 242 310 240 C 320 230 328 205 328 175 C 328 145 322 120 316 105 C 314 100 313 105 315 110 Z" />

        {/* LEFT PROFILE FACE (Looking Left) */}
        {/* Left Cheek, Nose, Lips, Chin Profile Line */}
        <path d="M 125 102 C 110 112 100 122 92 135 C 91 137 88 135 90 133 C 96 122 108 111 118 103 C 114 116 104 128 92 138 C 76 150 74 158 75 162 C 77 165 84 162 88 160 C 94 158 92 164 88 166 C 81 170 76 172 73 178 C 71 183 75 186 78 185 C 83 184 86 182 89 180 C 85 186 80 190 77 197 C 74 203 76 211 81 214 C 84 216 88 214 90 210 C 92 205 88 208 86 211 C 82 216 80 224 81 230 C 82 236 86 240 92 242 C 94 243 95 240 92 239 C 84 236 80 225 84 216 C 87 210 93 205 95 210 C 98 216 93 226 95 235 C 96 240 102 242 106 242 C 108 242 108 238 106 238 C 100 238 97 228 99 220               C 101 212 105 208 108 205" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        
        {/* Left Profile Closed Eye & Lashes */}
        <path d="M 104 135 C 100 136 94 140 92 145 C 90 148 94 150 96 146 C 98 142 102 139 106 138 Z" />
        <path d="M 94 143 L 90 146 M 92 145 L 88 149 M 97 141 L 94 145" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* RIGHT PROFILE FACE (Looking Right) */}
        {/* Right Cheek, Nose, Lips, Chin Profile Line */}
        <path d="M 275 102 C 290 112 300 122 308 135 C 309 137 312 135 310 133 C 304 122 292 111 282 103 C 286 116 296 128 308 138 C 324 150 326 158 325 162 C 323 165 316 162 312 160 C 306 158 308 164 312 166 C 319 170 324 172 327 178 C 329 183 325 186 322 185 C 317 184 314 182 311 180 C 315 186 320 190 323 197 C 326 203 324 211 319 214 C 316 216 312 214 310 210 C 308 205 312 208 314 211 C 318 216 320 224 319 230 C 318 236 314 240 308 242 C 306 243 305 240 308 239 C 316 236 320 225 316 216 C 313 210 307 205 305 210 C 302 216 307 226 305 235 C 304 240 298 242 294 242 C 292 242 292 238 294 238 C 300 238 303 228 301 220               C 299 212 295 208 292 205" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        
        {/* Right Profile Closed Eye & Lashes */}
        <path d="M 296 135 C 300 136 306 140 308 145 C 310 148 306 150 304 146 C 302 142 298 139 294 138 Z" />
        <path d="M 306 143 L 310 146 M 308 145 L 312 149 M 303 141 L 306 145" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* CENTER PROFILE FACE (Looking Straight Ahead) */}
        {/* Center Eyebrows */}
        <path d="M 172 112 C 182 108 190 112 195 116 M 228 112 C 218 108 210 112 205 116" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Center Closed Eyes with beautiful long lashes */}
        <path d="M 168 126 C 174 130 186 130 192 126" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M 172 128 L 169 133 M 180 129 L 180 135 M 188 128 L 191 133" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

        <path d="M 232 126 C 226 130 214 130 208 126" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M 228 128 L 231 133 M 220 129 L 220 135 M 212 128 L 209 133" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

        {/* Center Nose Outline */}
        <path d="M 200 116 L 200 156 C 198 160 202 162 204 160 C 205 158 203 156 202 156" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* Center Beautiful Symmetrical Lips */}
        {/* Upper lip outline */}
        <path d="M 184 178 C 190 173 197 175 200 178 C 203 175 210 173 216 178 C 210 182 190 182 184 178 Z" />
        {/* Lower lip outline */}
        <path d="M 186 182 C 192 189 208 189 214 182 C 210 184 190 184 186 182 Z" />
        {/* Center separation line */}
        <path d="M 183 179 C 192 178 208 178 217 179" fill="none" stroke="currentColor" strokeWidth="1.5" />

        {/* Center Graceful Chin & Jaw boundary */}
        <path d="M 180 202 C 190 210 210 210 220 202" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* CENTER NECK & CLAVICLE LINES */}
        <path d="M 180 218 C 175 235 158 250 140 255 M 220 218 C 225 235 242 250 260 255" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        
        {/* Symmetrical bust outline base (creates the beautiful neck pedestal) */}
        <path d="M 200 240 L 200 262" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 182 256 C 190 258 210 258 218 256" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* RENDER THE TEXT LABELS */}
      {showText && (
        <div className="mt-4 flex flex-col items-center gap-0.5">
          {/* SECURE - Classic serif display style matching user image */}
          <span className="font-serif text-2xl font-semibold tracking-[0.25em] uppercase text-white leading-none pl-[0.25em]">
            Secure
          </span>
          {/* SafeNav AI - Subtitle block */}
          <span className="text-[10px] font-mono tracking-[0.4em] text-rose-500 uppercase font-bold mt-1.5 pl-[0.4em]">
            SafeNav AI
          </span>
        </div>
      )}
    </div>
  );
}

export function SafeNavIcon({ className = '', size = 32 }: { className?: string; size?: number }) {
  // Just the three-faces icon, no text, ideal as a general button/navbar replace logo icon
  return <SafeNavLogo className={className} size={size} showText={false} />;
}
