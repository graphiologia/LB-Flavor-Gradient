import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Sparkles, Wand2, Stars, RotateCw } from "lucide-react";

// --- Flavor helpers --------------------------------------------------------
const FLAVOR_MAP = {
  strawberry: "#ff4f79",
  raspberry: "#d72657",
  cherry: "#d81b60",
  watermelon: "#ff6b81",
  apple: "#5ec16e",
  lime: "#7bd389",
  mint: "#27c3a8",
  matcha: "#7bb661",
  avocado: "#66a564",
  banana: "#ffe066",
  mango: "#ffb703",
  peach: "#ff9e7d",
  orange: "#ff7a00",
  carrot: "#ff8c42",
  lemon: "#ffd166",
  pineapple: "#ffe66d",
  blueberry: "#4f7cff",
  grape: "#7b5cff",
  ube: "#6d4aff",
  taro: "#a08bff",
  lavender: "#b497ff",
  vanilla: "#f4e1c1",
  caramel: "#c68642",
  butterscotch: "#e0a55f",
  chocolate: "#5c3a21",
  mocha: "#7a5230",
  coffee: "#5a3c2e",
  espresso: "#3b2a23",
  milk: "#fff7f0",
  coconut: "#fef9ef",
  bubblegum: "#ff84d8",
  cottoncandy: "#ffa6ff",
  cookiesandcream: "#e8e8ea",
  peppermint: "#82f3d3",
  wintermint: "#9ef7e8",
  milktea: "#c7a17a",
  calamansi: "#c1ff72",
  bukopandan: "#9be077",
  lychee: "#ffd4da",
  dragonfruit: "#ff2d95",
  passionfruit: "#ffb000",
  kiwi: "#89d42d",
};

function normKey(s) { return (s||"").toLowerCase().replace(/[^a-z0-9]+/g, "").trim(); }
function hashHue(str) { let h = 0; for (let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return h%360; }
function hslToHex(h,s,l){ s/=100; l/=100; const k=n=>(n+h/30)%12; const a=s*Math.min(l,1-l); const f=n=>l-a*Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1))); const toHex=x=>Math.round(255*x).toString(16).padStart(2,"0"); return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`; }
function flavorToColor(f){ const k=normKey(f); if(FLAVOR_MAP[k]) return FLAVOR_MAP[k]; const hue=hashHue(k); return hslToHex(hue,68,68); }

// --- Tiny value-noise for displacement (fast & dependency-free) -----------
function makeNoise(seed){
  const r = n=>{ const x=Math.sin(n*127.1+seed*13.7)*43758.5453; return x-Math.floor(x); };
  const gridSize = 256;
  const grid = new Float32Array(gridSize*gridSize);
  for(let y=0;y<gridSize;y++) for(let x=0;x<gridSize;x++) grid[y*gridSize+x]=r(x*12.9898+y*78.233);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  return (x,y)=>{
    x = (x%gridSize+gridSize)%gridSize; y=(y%gridSize+gridSize)%gridSize;
    const x0=Math.floor(x), y0=Math.floor(y); const x1=(x0+1)%gridSize, y1=(y0+1)%gridSize;
    const fx=smooth(x-x0), fy=smooth(y-y0);
    const v00=grid[y0*gridSize+x0], v10=grid[y0*gridSize+x1], v01=grid[y1*gridSize+x0], v11=grid[y1*gridSize+x1];
    return lerp(lerp(v00,v10,fx), lerp(v01,v11,fx), fy);
  };
}

const PRESETS = [
  "strawberry, lemon",
  "mango, coconut, banana",
  "blueberry, ube, grape",
  "mint, lime, coconut",
  "caramel, vanilla, coffee",
  "peach, mango, passionfruit",
  "calamansi, buko pandan",
  "orange, chocolate",
  "bubblegum, cotton candy",
];

export default function App() {
  const [flavorsInput, setFlavorsInput] = useState("ube, mango, coconut");
  const [type, setType] = useState("smudge"); // linear | radial | conic | smudge
  const [pattern, setPattern] = useState("none"); // none | stripes | dots | noise
  const [angle, setAngle] = useState(30);
  const [intensity, setIntensity] = useState(0.25);
  const [resolution, setResolution] = useState(1536);
  const [radius, setRadius] = useState(50);

  // Smudge controls
  const [smudgeAmount, setSmudgeAmount] = useState(0.35);
  const [streakScale, setStreakScale] = useState(160);
  const [seed, setSeed] = useState(7);
  const [quality, setQuality] = useState("fast");

  // Per-flavor stop sliders
  const [stops, setStops] = useState([]); // 0..100 per color
  const [autoSortStops, setAutoSortStops] = useState(true);

  const canvasRef = useRef(null);

  const flavors = useMemo(() => flavorsInput.split(/,|\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,8), [flavorsInput]);
  const colors = useMemo(() => { const arr = flavors.map(flavorToColor); if(arr.length===1){ const h=hashHue(flavors[0]); const comp=hslToHex((h+200)%360,68,68); return [arr[0], comp]; } return arr;}, [flavors]);

  useEffect(()=>{ if(!flavors.length) return; const even = flavors.map((_,i)=> Math.round((i/Math.max(flavors.length-1,1))*100)); setStops(even); }, [flavors]);

  const stopsWithColors = useMemo(()=>{ const pairs = colors.map((c,i)=>({ color:c, pos: stops[i] ?? Math.round((i/Math.max(colors.length-1,1))*100) })); if (autoSortStops) pairs.sort((a,b)=>a.pos-b.pos); return pairs; }, [colors, stops, autoSortStops]);

  const cssGradient = useMemo(() => {
    const str = stopsWithColors.map(s=>`${s.color} ${Math.max(0,Math.min(100,s.pos))}%`).join(", ");
    if (type === "linear" || type === "smudge") return `linear-gradient(${angle}deg, ${str})`;
    if (type === "radial") return `radial-gradient(circle ${radius}% at 50% 50%, ${str})`;
    return `conic-gradient(from ${angle}deg at 50% 50%, ${str})`;
  }, [stopsWithColors, type, angle, radius]);

  // keep canvas crisp on high-DPI and responsive to container size
  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return; const parent = canvas.parentElement; if(!parent) return;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.max(512, Math.floor(rect.width * dpr));
      canvas.height = Math.max(512, Math.floor(rect.height * dpr));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Drawing -------------------------------------------------------------
  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return; const ctx = canvas.getContext("2d"); if(!ctx) return;
    const w = canvas.width, h = canvas.height;

    const paintLinear = () => {
      const rad = (angle*Math.PI)/180; const x1=w/2-Math.cos(rad)*w; const y1=h/2-Math.sin(rad)*h; const x2=w/2+Math.cos(rad)*w; const y2=h/2+Math.sin(rad)*h; const g=ctx.createLinearGradient(x1,y1,x2,y2); stopsWithColors.forEach(s=>g.addColorStop(s.pos/100, s.color)); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    };

    if (type === "linear") {
      paintLinear();
    } else if (type === "radial") {
      const maxR=Math.max(w,h)*(radius/50); const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,maxR); stopsWithColors.forEach(s=>g.addColorStop(s.pos/100, s.color)); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    } else if (type === "conic") {
      const cx=w/2, cy=h/2; const start=(angle*Math.PI)/180; const n=Math.max(128, stopsWithColors.length*48);
      const palette = stopsWithColors.slice().sort((a,b)=>a.pos-b.pos);
      const pick = (tPct)=>{ if(palette.length===1) return palette[0].color; for(let i=1;i<palette.length;i++){ if(tPct<=palette[i].pos){ const a=palette[i-1], b=palette[i]; const span=Math.max(1,b.pos-a.pos); const t=Math.max(0,Math.min(1,(tPct-a.pos)/span)); const lerp=(ca,cb)=>{ const pa=parseInt(ca.slice(1),16), pb=parseInt(cb.slice(1),16); const ra=(pa>>16)&255, ga=(pa>>8)&255, ba=pa&255; const rb=(pb>>16)&255, gb=(pb>>8)&255, bb=pb&255; const r=Math.round(ra+(rb-ra)*t), g=Math.round(ga+(gb-ga)*t), b_=Math.round(ba+(bb-ba)*t); return `rgb(${r},${g},${b_})`; }; return lerp(a.color,b.color); } } return palette[palette.length-1].color; };
      for (let i=0;i<n;i++){ const t0=(i/n)*Math.PI*2+start; const t1=((i+1)/n)*Math.PI*2+start; const pct=(i/(n-1))*100; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,Math.hypot(w,h), t0,t1); ctx.closePath(); ctx.fillStyle=pick(pct); ctx.fill(); }
    } else if (type === "smudge") {
      paintLinear();
      const src = ctx.getImageData(0,0,w,h);
      const out = ctx.createImageData(w,h);
      const data = src.data; const odata = out.data;
      const rad = (angle*Math.PI)/180; const ux=Math.cos(rad), uy=Math.sin(rad);
      const px=Math.round(quality==="fast"?2:1);
      const disp = makeNoise(seed);
      const maxDisp = smudgeAmount * Math.max(w,h) * 0.06;
      const stripeScale = streakScale;
      const vx = -uy, vy = ux; 
      for (let y=0;y<h;y+=px){
        for (let x=0;x<w;x+=px){
          const nBase = disp(x/stripeScale*1.2, y/stripeScale*1.2);
          const nAlong = disp((x*ux + y*uy)/ (stripeScale*2), (x*vx + y*vy)/(stripeScale*2));
          const signed = (nBase*1.2 + nAlong*0.5) - 0.85;
          const mag = Math.max(-1, Math.min(1, signed)) * maxDisp;
          const wobble = disp(y/32, x/32) - 0.5;
          const dx = ux * mag + vx * mag * 0.15 * wobble;
          const dy = uy * mag + vy * mag * 0.15 * wobble;
          let sx = Math.max(0, Math.min(w-1, Math.floor(x + dx)));
          let sy = Math.max(0, Math.min(h-1, Math.floor(y + dy)));
          const si = (sy*w + sx) * 4;
          for (let oy=0; oy<px; oy++){
            for (let ox=0; ox<px; ox++){
              const di = ((y+oy)*w + (x+ox)) * 4; 
              odata[di]   = data[si];
              odata[di+1] = data[si+1];
              odata[di+2] = data[si+2];
              odata[di+3] = 255;
            }
          }
        }
      }
      ctx.putImageData(out,0,0);
    }

    if (pattern !== "none") {
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
      if (pattern === "stripes") { const stripeSize=Math.max(8, Math.floor(Math.min(w,h)/40)); ctx.translate(w/2,h/2); ctx.rotate((Math.PI/180)*angle); ctx.translate(-w/2,-h/2); ctx.fillStyle="#ffffff"; for (let x=-w; x<w*2; x+=stripeSize*2) ctx.fillRect(x,-h, stripeSize, h*3); }
      else if (pattern === "dots") { const gap=Math.max(10, Math.floor(Math.min(w,h)/30)); const r=gap/6; ctx.fillStyle="#ffffff"; for (let yy=0;yy<h+gap;yy+=gap){ for(let xx=((yy/gap)%2?gap/2:0); xx<w+gap; xx+=gap){ ctx.beginPath(); ctx.arc(xx,yy,r,0,Math.PI*2); ctx.fill(); } } }
      else if (pattern === "noise") { const img=ctx.getImageData(0,0,w,h); const d=img.data; for(let i=0;i<d.length;i+=4){ const n=(Math.random()*255)|0; d[i]=(d[i]*0.9+n*0.1)|0; d[i+1]=(d[i+1]*0.9+n*0.1)|0; d[i+2]=(d[i+2]*0.9+n*0.1)|0; } ctx.putImageData(img,0,0); }
      ctx.restore();
    }
  }, [stopsWithColors, colors, type, angle, radius, pattern, intensity, resolution, smudgeAmount, streakScale, seed, quality]);

  function copyCss(){ navigator.clipboard.writeText(cssGradient); }
  function downloadPng(){ const dpr=Math.min(3, window.devicePixelRatio||1); const out=document.createElement("canvas"); out.width=resolution*dpr; out.height=resolution*dpr; const ctx=out.getContext("2d"); if(!ctx) return; const w=out.width,h=out.height; const rad=(angle*Math.PI)/180; const x1=w/2-Math.cos(rad)*w; const y1=h/2-Math.sin(rad)*h; const x2=w/2+Math.cos(rad)*w; const y2=h/2+Math.sin(rad)*h; const g=ctx.createLinearGradient(x1,y1,x2,y2); stopsWithColors.forEach(s=>g.addColorStop(s.pos/100, s.color)); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); const a=document.createElement("a"); const date=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-"); a.download=`lb-flavor-gradient-${date}.png`; a.href=out.toDataURL("image/png"); a.click(); }
  function surpriseMe(){ const pick=PRESETS[Math.floor(Math.random()*PRESETS.length)]; setFlavorsInput(pick); const types=["linear","radial","conic","smudge"]; setType(types[Math.floor(Math.random()*types.length)]); const pats=["none","stripes","dots","noise"]; setPattern(pats[Math.floor(Math.random()*pats.length)]); setAngle(Math.floor(Math.random()*360)); setSeed(Math.floor(Math.random()*9999)); }

  const previewStyle = { backgroundImage: cssGradient };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Header */}
        <div className="lg:col-span-3 flex items-center gap-3 mb-2">
          <img src="/lb-logo.png" alt="LB Logo" className="w-10 h-10 rounded-full bg-white/5 object-contain" />
          <h1 className="text-2xl font-bold">LB Flavor Gradient — Smudge Edition</h1>
        </div>

        {/* Controls */}
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <label className="text-sm text-neutral-300">Type flavor prompts (comma/new line)</label>
            <textarea className="w-full rounded-xl bg-neutral-800/70 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[76px]" value={flavorsInput} placeholder="e.g., ube, mango, coconut" onChange={(e)=>setFlavorsInput(e.target.value)} />

            {/* Color chips */}
            <div className="flex flex-wrap gap-2">
              {colors.map((c,i)=> (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor:c }} title={flavors[i]} />
                  <span className="text-xs text-neutral-300">{flavors[i] || "auto"}</span>
                </div>
              ))}
            </div>

            {/* Per-flavor stop sliders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-400">Color stops</label>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <input type="checkbox" checked={autoSortStops} onChange={e=>setAutoSortStops(e.target.checked)} />
                    Auto-sort
                  </label>
                  <button onClick={()=>{ const even = colors.map((_,i)=> Math.round((i/Math.max(colors.length-1,1))*100)); setStops(even); }} className="text-[11px] px-2 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400">Distribute evenly</button>
                </div>
              </div>
              {colors.map((c,i)=> (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor:c }} />
                  <span className="text-xs text-neutral-300 w-28 truncate">{flavors[i] || `Stop ${i+1}`}</span>
                  <input type="range" min={0} max={100} value={stops[i] ?? 0} onChange={e=>{ const v=Math.max(0,Math.min(100, parseInt(e.target.value))); setStops(prev=>{ const base = prev.length? prev : colors.map((_,j)=> Math.round((j/Math.max(colors.length-1,1))*100)); const next=[...base]; next[i]=v; return next; }); }} className="w-full" />
                  <span className="text-xs text-neutral-400 w-10 text-right">{stops[i] ?? 0}%</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Gradient type</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={type} onChange={(e)=>setType(e.target.value)}>
                  <option value="smudge">Smudge</option>
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                  <option value="conic">Conic</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Angle: {angle}°</label>
                <input type="range" min={0} max={360} value={angle} onChange={(e)=>setAngle(parseInt(e.target.value))} className="w-full" />
              </div>
            </div>

            {type === "radial" && (
              <div>
                <label className="text-xs text-neutral-400">Radius: {radius}%</label>
                <input type="range" min={10} max={150} value={radius} onChange={(e)=>setRadius(parseInt(e.target.value))} className="w-full" />
              </div>
            )}

            {type === "smudge" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400">Smudge amount: {Math.round(smudgeAmount*100)}%</label>
                  <input type="range" min={0} max={100} value={Math.round(smudgeAmount*100)} onChange={(e)=>setSmudgeAmount(parseInt(e.target.value)/100)} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Streak scale: {streakScale}px</label>
                  <input type="range" min={40} max={400} value={streakScale} onChange={(e)=>setStreakScale(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-400">Quality</label>
                  <button onClick={()=>setQuality(q=>q==="fast"?"high":"fast")} className="px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400">{quality.toUpperCase()}</button>
                  <button onClick={()=>setSeed(s=>s+1)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-fuchsia-400"><RotateCw className="w-3 h-3"/> New seed</button>
                </div>
                <p className="text-[11px] text-neutral-400">Smudge uses a noise-based displacement map to produce paint-like streaks along your chosen angle.</p>
              </div>
            )}

            {pattern !== "none" && (
              <div>
                <label className="text-xs text-neutral-400">Pattern intensity: {Math.round(intensity * 100)}%</label>
                <input type="range" min={0} max={100} value={Math.round(intensity*100)} onChange={(e)=>setIntensity(parseInt(e.target.value)/100)} className="w-full" />
              </div>
            )}

            <div>
              <label className="text-xs text-neutral-400">Export size</label>
              <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={resolution} onChange={(e)=>setResolution(parseInt(e.target.value))}>
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024</option>
                <option value={1536}>1536 × 1536</option>
                <option value={2048}>2048 × 2048</option>
                <option value={3072}>3072 × 3072</option>
                <option value={4096}>4096 × 4096</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">Larger sizes take longer to export.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={copyCss} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-amber-400"><Copy className="w-4 h-4"/> Copy CSS</button>
              <button onClick={downloadPng} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400"><Download className="w-4 h-4"/> Download PNG</button>
              <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-fuchsia-400"><Sparkles className="w-4 h-4"/> Surprise me</button>
            </div>

            <p className="text-xs text-neutral-400 pt-2">Tip: Great combos: “ube, mango, coconut”, “caramel, vanilla, coffee”, “mint, lime, coconut”. Unknown flavors map to pleasant pastels automatically.</p>
          </div>
        </section>

        {/* Preview */}
        <section className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="p-3 text-sm text-neutral-300 flex items-center gap-2 bg-neutral-900/60 border-b border-neutral-800"><Stars className="w-4 h-4"/> Live CSS preview</div>
              <div className="h-64 md:h-80" style={previewStyle} />
              {type === "smudge" && (
                <div className="p-2 text-[11px] text-neutral-400 border-t border-neutral-800">CSS preview shows the base linear gradient. Exported canvas displays the smudged result.</div>
              )}
            </div>
            <div className="rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="p-3 text-sm text-neutral-300 flex items-center gap-2 bg-neutral-900/60 border-b border-neutral-800"><Wand2 className="w-4 h-4"/> Baked canvas (what exports)</div>
              <div className="h-64 md:h-80 bg-neutral-900 flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-3 text-sm text-neutral-300 bg-neutral-900/60 border-b border-neutral-800">Palette</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3">
              {PRESETS.map((p,i)=> (
                <button key={i} onClick={()=>setFlavorsInput(p)} className="group rounded-xl overflow-hidden border border-neutral-800 hover:border-amber-400 transition-colors" title={p}>
                  <div className="h-16" style={{ backgroundImage: makePreviewGradient(p) }} />
                  <div className="p-2 text-xs text-neutral-300 text-left">{p}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function makePreviewGradient(preset){
  const cols = preset.split(/,|\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,5).map(flavorToColor);
  const stops = cols.map((c,i)=>`${c} ${(i/Math.max(cols.length-1,1))*100}%`).join(", ");
  return `linear-gradient(90deg, ${stops})`;
}
