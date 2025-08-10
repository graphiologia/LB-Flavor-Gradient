import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Sparkles, Wand2, RotateCw } from "lucide-react";

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
  chocolate: "#5c3a21",
  mocha: "#7a5230",
  coffee: "#5a3c2e",
  espresso: "#3b2a23",
  milk: "#fff7f0",
  coconut: "#fef9ef",
  bubblegum: "#ff84d8",
  cottoncandy: "#ffa6ff",
  blueberrycheesecake: "#7fa1ff",
  cookiesandcream: "#e8e8ea",
  peppermint: "#82f3d3",
  wintermint: "#9ef7e8",
  milktea: "#c7a17a",
  thai_tea: "#f17c2a",
  jasmine: "#d9f7e7",
  butter: "#ffd27f",
  sea_salt: "#e6f0ff",
  black_sesame: "#6b6b6b",
  strawberry_milk: "#ffd1e8",
  blueberry_muffin: "#8aa2ff",
  calamansi: "#c1ff72",
  buko_pandan: "#9be077",
  durian: "#e2e964",
  lychee: "#ffd4da",
  dragonfruit: "#ff2d95",
  passionfruit: "#ffb000",
  kiwi: "#89d42d"
};

function normKey(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }
function hashHue(str){ let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return h%360; }
function hslToHex(h,s,l){ s/=100; l/=100; const k=n=>(n+h/30)%12; const a=s*Math.min(l,1-l); const f=n=>l-a*Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1))); const toHex=x=>Math.round(255*x).toString(16).padStart(2,'0'); return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`; }
function flavorToColor(f){ const k=normKey(f); if(FLAVOR_MAP[k]) return FLAVOR_MAP[k]; const hue=hashHue(k); return hslToHex(hue,68,68); }

// --- Noise util for smudge -------------------------------------------------
function makeNoise(seed){
  const r = n=>{ const x=Math.sin(n*127.1+seed*13.7)*43758.5453; return x-Math.floor(x); };
  const SIZE = 256;
  const grid = new Float32Array(SIZE*SIZE);
  for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) grid[y*SIZE+x]=r(x*12.9898 + y*78.233);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  return (x,y)=>{
    x=(x%SIZE+SIZE)%SIZE; y=(y%SIZE+SIZE)%SIZE;
    const x0=Math.floor(x), y0=Math.floor(y); const x1=(x0+1)%SIZE, y1=(y0+1)%SIZE;
    const fx=smooth(x-x0), fy=smooth(y-y0);
    const v00=grid[y0*SIZE+x0], v10=grid[y0*SIZE+x1], v01=grid[y1*SIZE+x0], v11=grid[y1*SIZE+x1];
    return lerp(lerp(v00,v10,fx), lerp(v01,v11,fx), fy);
  };
}

// --- Component -------------------------------------------------------------
export default function App(){
  const [flavorsInput, setFlavorsInput] = useState("ube, mango, coconut");
  const [gradientType, setGradientType] = useState("linear"); // linear | radial | conic
  const [effect, setEffect] = useState("smudge"); // none | smear(smudge) | fractal? keep smudge for now
  const [angle, setAngle] = useState(30);
  const [radius, setRadius] = useState(50);
  const [exportSize, setExportSize] = useState(()=>{
    try { return parseInt(localStorage.getItem('lb_export_size') || '1536',10);} catch { return 1536;}
  });
  useEffect(()=>{ try{ localStorage.setItem('lb_export_size', String(exportSize)); }catch{} }, [exportSize]);

  // Smudge controls
  const [smudgeAmount, setSmudgeAmount] = useState(0.35);
  const [streakScale, setStreakScale] = useState(160);
  const [seed, setSeed] = useState(7);
  const [quality, setQuality] = useState("fast"); // fast | high

  const canvasRef = useRef(null);

  const flavors = useMemo(()=> (
    flavorsInput.split(/,|\\r?\\n/).map(s=>s.trim()).filter(Boolean).slice(0,8)
  ), [flavorsInput]);

  const colors = useMemo(()=>{
    const arr = flavors.map(flavorToColor);
    if(arr.length===1){ const h=hashHue(flavors[0]); arr.push(hslToHex((h+200)%360,68,68)); }
    return arr.length?arr:["#ff7a00","#ffe066"];
  }, [flavors]);

  // drawing util
  function paintBaseGradient(ctx,w,h){
    const rad=(angle*Math.PI)/180;
    if(gradientType==='linear'){
      const x1=w/2-Math.cos(rad)*w, y1=h/2-Math.sin(rad)*h;
      const x2=w/2+Math.cos(rad)*w, y2=h/2+Math.sin(rad)*h;
      const g=ctx.createLinearGradient(x1,y1,x2,y2);
      colors.forEach((c,i)=>g.addColorStop(i/Math.max(colors.length-1,1), c));
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    }else if(gradientType==='radial'){
      const maxR=Math.max(w,h)*(radius/50);
      const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,maxR);
      colors.forEach((c,i)=>g.addColorStop(i/Math.max(colors.length-1,1), c));
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    }else{ // conic approx
      const cx=w/2, cy=h/2; const start=rad; const n=Math.max(128, colors.length*48);
      for(let i=0;i<n;i++){
        const t0=(i/n)*Math.PI*2+start, t1=((i+1)/n)*Math.PI*2+start;
        const idx=Math.min(colors.length-1, Math.floor((i/(n-1))*colors.length));
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,Math.hypot(w,h), t0,t1); ctx.closePath();
        ctx.fillStyle=colors[idx]; ctx.fill();
      }
    }
  }

  function applySmudge(ctx,canvas){
    const w=canvas.width, h=canvas.height;
    const rad=(angle*Math.PI)/180, ux=Math.cos(rad), uy=Math.sin(rad);
    const px = quality==='fast'?2:1;
    const disp = makeNoise(seed);
    const maxDisp = smudgeAmount * Math.max(w,h) * 0.06;
    const vx=-uy, vy=ux;
    const src = ctx.getImageData(0,0,w,h);
    const out = ctx.createImageData(w,h);
    const data=src.data, odata=out.data;
    for(let y=0;y<h;y+=px){
      for(let x=0;x<w;x+=px){
        const nBase = disp(x/streakScale*1.2, y/streakScale*1.2);
        const nAlong = disp((x*ux+y*uy)/(streakScale*2), (x*vx+y*vy)/(streakScale*2));
        const signed = (nBase*1.2 + nAlong*0.5) - 0.85;
        const mag = Math.max(-1, Math.min(1, signed)) * maxDisp;
        const wobble = disp(y/32, x/32) - 0.5;
        const dx = ux*mag + vx*mag*0.15*wobble;
        const dy = uy*mag + vy*mag*0.15*wobble;
        let sx=Math.max(0, Math.min(w-1, Math.floor(x+dx)));
        let sy=Math.max(0, Math.min(h-1, Math.floor(y+dy)));
        const si=(sy*w+sx)*4;
        for(let oy=0; oy<px; oy++){
          for(let ox=0; ox<px; ox++){
            const di=((y+oy)*w + (x+ox))*4;
            odata[di]=data[si]; odata[di+1]=data[si+1]; odata[di+2]=data[si+2]; odata[di+3]=255;
          }
        }
      }
    }
    ctx.putImageData(out,0,0);
  }

  // Render loop for single preview canvas
  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if(!ctx) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.max(512, Math.floor(rect.width * dpr));
      const h = Math.max(400, Math.floor(rect.height * dpr * 0.6));
      if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
      // repaint
      ctx.clearRect(0,0,canvas.width,canvas.height);
      paintBaseGradient(ctx, canvas.width, canvas.height);
      if (effect === 'smudge') applySmudge(ctx, canvas);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [colors, gradientType, effect, angle, radius, smudgeAmount, streakScale, seed, quality]);

  function copyCss(){
    const stops = colors.map((c,i)=>`${c} ${(i/Math.max(colors.length-1,1))*100}%`).join(", ");
    const css = gradientType==='linear'
      ? `linear-gradient(${angle}deg, ${stops})`
      : gradientType==='radial'
        ? `radial-gradient(circle ${radius}% at 50% 50%, ${stops})`
        : `conic-gradient(from ${angle}deg at 50% 50%, ${stops})`;
    navigator.clipboard.writeText(css);
  }

  function downloadPng(){
    const out = document.createElement('canvas');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    out.width = Math.floor(exportSize * dpr);
    out.height = Math.floor(exportSize * dpr);
    const ctx = out.getContext('2d', { willReadFrequently: true }); if(!ctx) return;
    paintBaseGradient(ctx, out.width, out.height);
    if (effect === 'smudge') applySmudge(ctx, out);
    const a = document.createElement('a');
    a.download = `lokal-brew-visualizer-${Date.now()}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
  }

  // presets
  const PRESETS = [
    "ube, mango, coconut",
    "caramel, vanilla, coffee",
    "mint, lime, coconut",
    "strawberry, lemon",
    "blueberry, ube, grape",
    "peach, mango, passionfruit"
  ];
  function surpriseMe(){
    const pick = PRESETS[Math.floor(Math.random()*PRESETS.length)];
    setFlavorsInput(pick);
    setSeed(Math.floor(Math.random()*9999));
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img src="/lb-logo.png" alt="LB" className="w-12 h-12 rounded-full bg-white/5 object-contain" onError={(e)=>{e.currentTarget.src='/lb-logo.svg'}} />
          <div>
            <h1 className="text-2xl font-extrabold">Lokal Brew Coffee Flavor Visualizer</h1>
            <p className="text-sm text-neutral-400">Type flavors, tweak, and export. Preview matches the download.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <section className="order-2 lg:order-1 lg:col-span-1 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-4">
            <label className="text-sm text-neutral-300">Flavor prompts (comma or new line)</label>
            <textarea className="w-full rounded-xl bg-neutral-800/70 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[76px]" value={flavorsInput} onChange={e=>setFlavorsInput(e.target.value)} placeholder="e.g., ube, mango, coconut" />
            
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {colors.map((c,i)=> (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor:c }} title={flavors[i]} />
                  <span className="text-xs text-neutral-300">{flavors[i] || "auto"}</span>
                </div>
              ))}
            </div>

            {/* Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Gradient style</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={gradientType} onChange={e=>setGradientType(e.target.value)}>
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                  <option value="conic">Conic</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Effect</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={effect} onChange={e=>setEffect(e.target.value)}>
                  <option value="none">None</option>
                  <option value="smudge">Smudge (paint-like)</option>
                </select>
              </div>
            </div>

            {/* Angle / Radius */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Angle: {angle}°</label>
                <input type="range" min={0} max={360} value={angle} onChange={e=>setAngle(parseInt(e.target.value))} className="w-full" />
              </div>
              {gradientType==='radial' && (
                <div>
                  <label className="text-xs text-neutral-400">Radius: {radius}%</label>
                  <input type="range" min={10} max={150} value={radius} onChange={e=>setRadius(parseInt(e.target.value))} className="w-full" />
                </div>
              )}
            </div>

            {/* Smudge controls when active */}
            {effect==='smudge' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400">Smudge amount: {Math.round(smudgeAmount*100)}%</label>
                  <input type="range" min={0} max={100} value={Math.round(smudgeAmount*100)} onChange={e=>setSmudgeAmount(parseInt(e.target.value)/100)} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Streak scale: {streakScale}px</label>
                  <input type="range" min={40} max={400} value={streakScale} onChange={e=>setStreakScale(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-400">Quality</label>
                  <button onClick={()=>setQuality(q=>q==='fast'?'high':'fast')} className="px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400">{quality.toUpperCase()}</button>
                  <button onClick={()=>setSeed(s=>s+1)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-fuchsia-400"><RotateCw className="w-3 h-3" /> New seed</button>
                </div>
              </div>
            )}

            {/* Export */}
            <div>
              <label className="text-xs text-neutral-400">Export size</label>
              <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={exportSize} onChange={e=>setExportSize(parseInt(e.target.value))}>
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024</option>
                <option value={1536}>1536 × 1536</option>
                <option value={2048}>2048 × 2048</option>
                <option value={3072}>3072 × 3072</option>
                <option value={4096}>4096 × 4096</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">Larger sizes may take longer to export.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={copyCss} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-amber-400"><Copy className="w-4 h-4" /> Copy CSS</button>
              <button onClick={downloadPng} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400"><Download className="w-4 h-4" /> Download PNG</button>
              <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-fuchsia-400"><Sparkles className="w-4 h-4" /> Surprise me</button>
            </div>
          </section>

          {/* Single baked preview (exports exactly) */}
          <section className="order-1 lg:order-2 lg:col-span-2 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-3 text-sm text-neutral-300 flex items-center gap-2 bg-neutral-900/60 border-b border-neutral-800">
              <Wand2 className="w-4 h-4" /> Preview (matches the downloaded PNG)
            </div>
            <div className="h-72 md:h-[28rem] bg-neutral-900 flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
