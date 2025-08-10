import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Sparkles, Wand2, RotateCw, History, Trash2, Plus } from "lucide-react";

// ---------- Flavor helpers ----------
const FLAVOR_MAP = {
  strawberry: "#ff4f79", raspberry: "#d72657", cherry: "#d81b60", watermelon: "#ff6b81",
  apple: "#5ec16e", lime: "#7bd389", mint: "#27c3a8", matcha: "#7bb661", avocado: "#66a564",
  banana: "#ffe066", mango: "#ffb703", peach: "#ff9e7d", orange: "#ff7a00", carrot: "#ff8c42",
  lemon: "#ffd166", pineapple: "#ffe66d", blueberry: "#4f7cff", grape: "#7b5cff", ube: "#6d4aff",
  taro: "#a08bff", lavender: "#b497ff", vanilla: "#f4e1c1", caramel: "#c68642", butterscotch: "#e0a55f",
  chocolate: "#5c3a21", mocha: "#7a5230", coffee: "#5a3c2e", espresso: "#3b2a23", milk: "#fff7f0",
  coconut: "#fef9ef", bubblegum: "#ff84d8", cottoncandy: "#ffa6ff", blueberrycheesecake: "#7fa1ff",
  cookiesandcream: "#e8e8ea", peppermint: "#82f3d3", wintermint: "#9ef7e8", milktea: "#c7a17a",
  thai_tea: "#f17c2a", jasmine: "#d9f7e7", butter: "#ffd27f", sea_salt: "#e6f0ff", black_sesame: "#6b6b6b",
  strawberry_milk: "#ffd1e8", blueberry_muffin: "#8aa2ff", calamansi: "#c1ff72", buko_pandan: "#9be077",
  durian: "#e2e964", lychee: "#ffd4da", dragonfruit: "#ff2d95", passionfruit: "#ffb000", kiwi: "#89d42d",

  almond: "#deb887", hazelnut: "#cfa07e", walnut: "#b08466", peanut: "#d6a77a", pistachio: "#93c47d",
  cashew: "#e6c9a8", cocoa: "#6b3d2e", dark_chocolate: "#3e2620", milk_chocolate: "#7b4a36", cacao_nib: "#4a2e25",
  cinnamon: "#b6652a", clove: "#5b2b19", cardamom: "#9fb37a", nutmeg: "#8b5a2b", anise: "#3b2a2f",
  honey: "#ffd166", maple: "#bf7f30", brown_sugar: "#b66a2e", toffee: "#c68642", bergamot: "#ffd27a",
  jasmine_note: "#e8ffe8", grapefruit: "#ff7666", raspberry_note: "#e34b78", hazy_floral: "#d7baff",
};

function normKey(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim(); }
function hashHue(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 360; }
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function flavorToColor(name) {
  const key = normKey(name);
  if (FLAVOR_MAP[key]) return FLAVOR_MAP[key];
  const hue = hashHue(key || "flavor");
  return hslToHex(hue, 68, 68);
}

// ---------- Noise + fbm + curl ----------
function makeNoise(seed) {
  const r = n => { const x = Math.sin(n * 127.1 + seed * 13.7) * 43758.5453; return x - Math.floor(x); };
  const SIZE = 256;
  const grid = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) grid[y * SIZE + x] = r(x * 12.9898 + y * 78.233);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    x = (x % SIZE + SIZE) % SIZE; y = (y % SIZE + SIZE) % SIZE;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = (x0 + 1) % SIZE, y1 = (y0 + 1) % SIZE;
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const v00 = grid[y0 * SIZE + x0], v10 = grid[y0 * SIZE + x1];
    const v01 = grid[y1 * SIZE + x0], v11 = grid[y1 * SIZE + x1];
    return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
  };
}
function fbm(noise, x, y, octaves, lac, gain) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) { sum += amp * noise(x * freq, y * freq); freq *= lac; amp *= gain; }
  return sum;
}
function curl(noise, x, y, scale) {
  const e = 1e-3;
  const n1 = fbm(noise, (x+e)/scale, y/scale, 4, 2.0, 0.5);
  const n2 = fbm(noise, (x-e)/scale, y/scale, 4, 2.0, 0.5);
  const n3 = fbm(noise, x/scale, (y+e)/scale, 4, 2.0, 0.5);
  const n4 = fbm(noise, x/scale, (y-e)/scale, 4, 2.0, 0.5);
  const dx = (n1 - n2) / (2*e);
  const dy = (n3 - n4) / (2*e);
  return { x: dy, y: -dx }; // rotate gradient -> curl-like field
}

export default function App() {
  // --- Controls ---
  const [flavorsInput, setFlavorsInput] = useState("ube, mango, coconut");
  const [gradientType, setGradientType] = useState("linear"); // linear | radial | conic
  const [effect, setEffect] = useState("none"); // none | smear | fractal | swirl | both
  const [angle, setAngle] = useState(30);
  const [radius, setRadius] = useState(50);

  // smear
  const [smearStrength, setSmearStrength] = useState(0.45);
  const [streakScale, setStreakScale] = useState(160);
  const [seed, setSeed] = useState(7);
  const [quality, setQuality] = useState("fast");

  // fractal
  const [fractalIntensity, setFractalIntensity] = useState(0.25);
  const [fractalScale, setFractalScale] = useState(140);
  const [fractalOctaves, setFractalOctaves] = useState(4);

  // swirl
  const [swirlStrength, setSwirlStrength] = useState(0.8);
  const [flowScale, setFlowScale] = useState(120);
  const [swirlIters, setSwirlIters] = useState(20);
  const [swirlSharpness, setSwirlSharpness] = useState(0.85);

  // export size (remember last choice)
  const [exportSize, setExportSize] = useState(() => {
    try { return parseInt(localStorage.getItem("lb_export_size") || "1536", 10); } catch { return 1536; }
  });
  useEffect(() => { try { localStorage.setItem("lb_export_size", String(exportSize)); } catch {} }, [exportSize]);

  // per-flavor stops
  const [stops, setStops] = useState([]);
  const [autoSortStops, setAutoSortStops] = useState(true);

  // history
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("paletteHistory") || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("paletteHistory", JSON.stringify(history.slice(0, 20))); } catch {} }, [history]);

  const canvasRef = useRef(null);

  const flavors = useMemo(() => (
    flavorsInput.split(/,|\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 8)
  ), [flavorsInput]);

  const colors = useMemo(() => {
    const arr = flavors.map(flavorToColor);
    if (arr.length === 1) {
      const h = hashHue(flavors[0]);
      arr.push(hslToHex((h + 200) % 360, 68, 68));
    }
    return arr.length ? arr : ["#ff7a00", "#ffe066"];
  }, [flavors]);

  useEffect(() => {
    if (!flavors.length) return;
    const even = flavors.map((_, i) => Math.round((i / Math.max(flavors.length - 1, 1)) * 100));
    setStops(even);
  }, [flavors]);

  const stopsWithColors = useMemo(() => {
    const pairs = colors.map((c, i) => ({ color: c, pos: stops[i] ?? Math.round((i / Math.max(colors.length - 1, 1)) * 100) }));
    if (autoSortStops) pairs.sort((a, b) => a.pos - b.pos);
    return pairs;
  }, [colors, stops, autoSortStops]);

  // draw gradient for a given ctx & size based on gradientType
  function paintBaseGradient(ctx, w, h) {
    const rad = (angle * Math.PI) / 180;
    if (gradientType === "linear") {
      const x1 = w / 2 - Math.cos(rad) * w, y1 = h / 2 - Math.sin(rad) * h;
      const x2 = w / 2 + Math.cos(rad) * w, y2 = h / 2 + Math.sin(rad) * h;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      stopsWithColors.forEach(s => g.addColorStop(s.pos / 100, s.color));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (gradientType === "radial") {
      const maxR = Math.max(w, h) * (radius / 50);
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, maxR);
      stopsWithColors.forEach(s => g.addColorStop(s.pos / 100, s.color));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else {
      // conic (approximate by wedges with color lerp)
      const cx=w/2, cy=h/2; const start=rad; const n=Math.max(128, stopsWithColors.length*48);
      const palette = stopsWithColors.slice().sort((a,b)=>a.pos-b.pos);
      const lerpRGB = (ca, cb, t) => {
        const pa=parseInt(ca.slice(1),16), pb=parseInt(cb.slice(1),16);
        const ra=(pa>>16)&255, ga=(pa>>8)&255, ba=pa&255;
        const rb=(pb>>16)&255, gb=(pb>>8)&255, bb=pb&255;
        const r=Math.round(ra+(rb-ra)*t), g=Math.round(ga+(gb-ga)*t), b=Math.round(ba+(bb-ba)*t);
        return `rgb(${r},${g},${b})`;
      };
      const pick = (pct) => {
        if (palette.length === 1) return palette[0].color;
        for (let i=1;i<palette.length;i++){
          if (pct <= palette[i].pos){
            const a=palette[i-1], b=palette[i];
            const span = Math.max(1, b.pos - a.pos);
            const t = Math.max(0, Math.min(1, (pct - a.pos) / span));
            return lerpRGB(a.color, b.color, t);
          }
        }
        return palette[palette.length-1].color;
      };
      for (let i=0;i<n;i++){
        const t0=(i/n)*Math.PI*2+start; const t1=((i+1)/n)*Math.PI*2+start;
        const pct=(i/(n-1))*100;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,Math.hypot(w,h), t0,t1); ctx.closePath();
        ctx.fillStyle = pick(pct); ctx.fill();
      }
    }
  }

  // apply effects to the same ctx
  function applyEffects(ctx, canvas) {
    const w = canvas.width, h = canvas.height;
    const doSmear = effect === "smear" || effect === "both";
    const doFractal = effect === "fractal" || effect === "both";
    const doSwirl = effect === "swirl";

    if (doSmear) {
      const rad = (angle * Math.PI) / 180;
      const ux = Math.cos(rad), uy = Math.sin(rad);
      const px = quality === "fast" ? 2 : 1;
      const noise = makeNoise(seed);
      const maxDisp = smearStrength * Math.max(w, h) * 0.06;
      const stripeScale = streakScale;
      const vx = -uy, vy = ux;
      const src = ctx.getImageData(0,0,w,h);
      const out = ctx.createImageData(w,h);
      const data = src.data, odata = out.data;
      for (let y=0;y<h;y+=px){
        for (let x=0;x<w;x+=px){
          const nBase = noise(x/stripeScale*1.2, y/stripeScale*1.2);
          const nAlong = noise((x*ux + y*uy)/(stripeScale*2), (x*vx + y*vy)/(stripeScale*2));
          const signed = (nBase*1.2 + nAlong*0.5) - 0.85;
          const mag = Math.max(-1, Math.min(1, signed)) * maxDisp;
          const wobble = noise(y/32, x/32) - 0.5;
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

    if (doSwirl) {
      const src = ctx.getImageData(0,0,w,h);
      const out = ctx.createImageData(w,h);
      const noise = makeNoise(seed);
      const data=src.data, odata=out.data;
      const step = Math.max(0.5, (1.5 - swirlSharpness)); // smaller -> sharper
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          let fx=x, fy=y;
          for (let i=0;i<swirlIters;i++){
            const v = curl(noise, fx, fy, flowScale);
            fx += v.x * swirlStrength * step;
            fy += v.y * swirlStrength * step;
          }
          const sx = Math.max(0, Math.min(w-1, Math.floor(fx)));
          const sy = Math.max(0, Math.min(h-1, Math.floor(fy)));
          const si=(sy*w+sx)*4, di=(y*w+x)*4;
          odata[di]=data[si]; odata[di+1]=data[si+1]; odata[di+2]=data[si+2]; odata[di+3]=255;
        }
      }
      ctx.putImageData(out,0,0);
    }

    if (doFractal) {
      const noise = makeNoise(seed);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const scale = Math.max(40, fractalScale);
      const oct = Math.max(2, Math.min(7, fractalOctaves));
      const gamma = 1.2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let n = fbm(noise, x / scale, y / scale, oct, 2.0, 0.5);
          n = Math.max(0, Math.min(1, Math.pow(n, gamma)));
          const i = (y * w + x) * 4;
          const v = Math.floor(255 * n * fractalIntensity);
          d[i] = Math.min(255, d[i] + v);
          d[i + 1] = Math.min(255, d[i + 1] + v);
          d[i + 2] = Math.min(255, d[i + 2] + v);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  // draw preview (single preview)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 900, height: 520 };
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(512, Math.floor(rect.width * dpr));
    const h = Math.max(512, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    ctx.clearRect(0, 0, w, h);
    paintBaseGradient(ctx, w, h);
    applyEffects(ctx, canvas);
  }, [stopsWithColors, angle, radius, gradientType, effect, smearStrength, seed, quality, streakScale, fractalIntensity, fractalScale, fractalOctaves, swirlStrength, flowScale, swirlIters, swirlSharpness]);

  function copyCss() {
    const str = stopsWithColors.map(s => `${s.color} ${Math.max(0, Math.min(100, s.pos))}%`).join(", ");
    const css = gradientType === "linear"
      ? `linear-gradient(${angle}deg, ${str})`
      : gradientType === "radial"
        ? `radial-gradient(circle ${radius}% at 50% 50%, ${str})`
        : `conic-gradient(from ${angle}deg at 50% 50%, ${str})`;
    navigator.clipboard.writeText(css);
  }

  function downloadPng() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const out = document.createElement("canvas");
    out.width = Math.floor(exportSize * dpr);
    out.height = Math.floor(exportSize * dpr);
    const ctx = out.getContext("2d", { willReadFrequently: true }); if (!ctx) return;

    paintBaseGradient(ctx, out.width, out.height);
    applyEffects(ctx, out);

    const a = document.createElement("a");
    a.download = `lokal-brew-visualizer-${Date.now()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  }

  function surpriseMe() {
    const PRESETS = [
      "strawberry, lemon",
      "mango, coconut, banana",
      "blueberry, ube, grape",
      "mint, lime, coconut",
      "caramel, vanilla, coffee",
      "bergamot, jasmine, honey",
      "raspberry, cacao nib, hazelnut"
    ];
    const pick = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setFlavorsInput(pick);
    setSeed(Math.floor(Math.random() * 9999));
  }

  const saveCurrentToHistory = () => {
    const val = flavorsInput.trim();
    if (!val) return;
    setHistory(prev => {
      const dedup = prev.filter(v => v !== val);
      return [val, ...dedup].slice(0, 20);
    });
  };

  // UI colors
  const panel = "bg-lb-olive-800/70 border border-lb-olive-600";
  const header = "bg-lb-olive-800/80 border-b border-lb-olive-600";

  return (
    <div className="min-h-screen w-full bg-lb-olive-900 text-lb-olive-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src="/lb-logo.png" onError={(e)=>{e.currentTarget.src='/lb-logo.svg'}} alt="LB Logo" className="w-10 h-10 rounded-full bg-lb-olive-700 object-contain" />
          <h1 className="text-xl md:text-2xl font-semibold">Lokal Brew Coffee Flavor Visualizer</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview first on mobile */}
          <section className="order-1 lg:order-2 lg:col-span-2 space-y-4">
            <div className={`rounded-2xl overflow-hidden ${panel}`}>
              <div className={`p-3 text-sm flex items-center gap-2 ${header}`}>
                <Wand2 className="w-4 h-4" /> Preview (exports exactly)
              </div>
              <div className="h-72 md:h-96 bg-lb-olive-900 flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* History */}
            <div className={`rounded-2xl overflow-hidden ${panel}`}>
              <div className={`p-3 text-sm ${header} flex items-center gap-2`}>
                <History className="w-4 h-4"/> Palette history
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                <button onClick={saveCurrentToHistory} className="text-xs px-2 py-1 rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-lb-accent flex items-center gap-1"><Plus className="w-3 h-3"/> Save current</button>
                <button onClick={() => setHistory([])} className="text-xs px-2 py-1 rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Clear</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3">
                {history.length === 0 && <div className="text-xs text-lb-olive-300 col-span-full">No saved palettes yet.</div>}
                {history.map((p, i) => (
                  <button key={i} onClick={() => setFlavorsInput(p)} className="group rounded-xl overflow-hidden border border-lb-olive-700 hover:border-lb-accent transition-colors" title={p}>
                    <div className="h-12" style={{ backgroundImage: `linear-gradient(90deg, ${p.split(/,|\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,5).map(flavorToColor).map((c,i,arr)=>`${c} ${(i/Math.max(arr.length-1,1))*100}%`).join(", ")})` }} />
                    <div className="p-2 text-[11px] text-lb-olive-100 text-left truncate">{p}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Controls second on mobile */}
          <section className="order-2 lg:order-1 lg:col-span-1 space-y-4">
            <div className={`rounded-2xl p-4 space-y-4 shadow-xl ${panel}`}>
              <label className="text-sm">Type flavor prompts (comma or new line)</label>
              <textarea
                className="w-full rounded-xl bg-lb-olive-800/70 border border-lb-olive-600 p-3 focus:outline-none focus:ring-2 focus:ring-lb-accent min-h-[76px]"
                value={flavorsInput}
                onChange={e => setFlavorsInput(e.target.value)}
                placeholder="e.g., ube, mango, coconut"
              />

              {/* Color chips */}
              <div className="flex flex-wrap gap-2">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: c }} title={flavors[i]} />
                    <span className="text-xs">{flavors[i] || "auto"}</span>
                  </div>
                ))}
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-lb-olive-300">Gradient style</label>
                  <select className="w-full bg-lb-olive-800/70 border border-lb-olive-600 rounded-xl p-2" value={gradientType} onChange={e => setGradientType(e.target.value)}>
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                    <option value="conic">Conic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-lb-olive-300">Effect</label>
                  <select className="w-full bg-lb-olive-800/70 border border-lb-olive-600 rounded-xl p-2" value={effect} onChange={e => setEffect(e.target.value)}>
                    <option value="none">None</option>
                    <option value="smear">Smear</option>
                    <option value="fractal">Fractal</option>
                    <option value="swirl">Liquid swirl</option>
                    <option value="both">Smear + Fractal</option>
                  </select>
                </div>
              </div>

              {/* Angle / Radius */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-lb-olive-300">Angle: {angle}°</label>
                  <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(parseInt(e.target.value))} className="w-full" />
                </div>
                {gradientType === "radial" && (
                  <div>
                    <label className="text-xs text-lb-olive-300">Radius: {radius}%</label>
                    <input type="range" min={10} max={150} value={radius} onChange={e => setRadius(parseInt(e.target.value))} className="w-full" />
                  </div>
                )}
              </div>

              {/* Per-flavor stop sliders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-lb-olive-300">Color stops</label>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-lb-olive-300 flex items-center gap-1">
                      <input type="checkbox" checked={autoSortStops} onChange={e => setAutoSortStops(e.target.checked)} />
                      Auto-sort
                    </label>
                    <button
                      onClick={() => {
                        const even = colors.map((_, i) => Math.round((i / Math.max(colors.length - 1, 1)) * 100));
                        setStops(even);
                      }}
                      className="text-[11px] px-2 py-1 rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-lb-accent"
                    >
                      Distribute evenly
                    </button>
                  </div>
                </div>
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c }} />
                    <span className="text-xs w-28 truncate">{flavors[i] || `Stop ${i + 1}`}</span>
                    <input
                      type="range" min={0} max={100} value={stops[i] ?? 0}
                      onChange={e => {
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)));
                        setStops(prev => {
                          const base = prev.length ? prev : colors.map((_, j) => Math.round((j / Math.max(colors.length - 1, 1)) * 100));
                          const next = [...base]; next[i] = v; return next;
                        });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs w-10 text-right">{stops[i] ?? 0}%</span>
                  </div>
                ))}
              </div>

              {/* Effect controls */}
              {["smear","both"].includes(effect) && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-lb-olive-300">Smear strength: {Math.round(smearStrength * 100)}%</label>
                    <input type="range" min={0} max={100} value={Math.round(smearStrength * 100)} onChange={e => setSmearStrength(parseInt(e.target.value) / 100)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Streak scale: {streakScale}px</label>
                    <input type="range" min={40} max={400} value={streakScale} onChange={e => setStreakScale(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-lb-olive-300">Quality</label>
                    <button onClick={() => setQuality(q => q === "fast" ? "high" : "fast")} className="px-2 py-1 text-xs rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-lb-accent">{quality.toUpperCase()}</button>
                    <button onClick={() => setSeed(s => s + 1)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-lb-accent"><RotateCw className="w-3 h-3" /> New seed</button>
                  </div>
                </div>
              )}
              {["fractal","both"].includes(effect) && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-lb-olive-300">Fractal intensity: {Math.round(fractalIntensity * 100)}%</label>
                    <input type="range" min={0} max={100} value={Math.round(fractalIntensity * 100)} onChange={e => setFractalIntensity(parseInt(e.target.value) / 100)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Fractal scale: {fractalScale}px</label>
                    <input type="range" min={60} max={400} value={fractalScale} onChange={e => setFractalScale(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Fractal octaves: {fractalOctaves}</label>
                    <input type="range" min={2} max={7} value={fractalOctaves} onChange={e => setFractalOctaves(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              )}
              {effect === "swirl" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-lb-olive-300">Swirl strength: {Math.round(swirlStrength * 100)}%</label>
                    <input type="range" min={10} max={200} value={Math.round(swirlStrength*100)} onChange={e => setSwirlStrength(parseInt(e.target.value)/100)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Flow scale: {flowScale}px</label>
                    <input type="range" min={60} max={300} value={flowScale} onChange={e => setFlowScale(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Iterations: {swirlIters}</label>
                    <input type="range" min={4} max={40} value={swirlIters} onChange={e => setSwirlIters(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-lb-olive-300">Sharpness: {Math.round(swirlSharpness*100)}%</label>
                    <input type="range" min={50} max={100} value={Math.round(swirlSharpness*100)} onChange={e => setSwirlSharpness(parseInt(e.target.value)/100)} className="w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-lb-olive-300">Seed</label>
                    <button onClick={() => setSeed(s => s + 1)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-lb-olive-600 bg-lb-olive-800 hover:border-lb-accent"><RotateCw className="w-3 h-3" /> New seed</button>
                  </div>
                </div>
              )}

              {/* Export */}
              <div>
                <label className="text-xs text-lb-olive-300">Export size</label>
                <select className="w-full bg-lb-olive-800/70 border border-lb-olive-600 rounded-xl p-2" value={exportSize} onChange={e => setExportSize(parseInt(e.target.value))}>
                  <option value={512}>512 × 512</option>
                  <option value={1024}>1024 × 1024</option>
                  <option value={1536}>1536 × 1536</option>
                  <option value={2048}>2048 × 2048</option>
                  <option value={3072}>3072 × 3072</option>
                  <option value={4096}>4096 × 4096</option>
                </select>
                <p className="text-[11px] text-lb-olive-300 mt-1">Larger sizes take longer to export.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={copyCss} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lb-olive-800 border border-lb-olive-600 hover:border-lb-accent"><Copy className="w-4 h-4" /> Copy CSS</button>
                <button onClick={downloadPng} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lb-olive-500 text-lb-olive-900 font-semibold hover:bg-lb-olive-400"><Download className="w-4 h-4" /> Download PNG</button>
                <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lb-olive-800 border border-lb-olive-600 hover:border-lb-accent"><Sparkles className="w-4 h-4" /> Surprise me</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
