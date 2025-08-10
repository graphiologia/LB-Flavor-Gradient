import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Sparkles, Wand2, RotateCw, History, Trash2, Plus, Stars } from "lucide-react";

// ---------- Flavor helpers ----------
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
  kiwi: "#89d42d",

  // Coffee notes
  almond: "#deb887",
  hazelnut: "#cfa07e",
  walnut: "#b08466",
  peanut: "#d6a77a",
  pistachio: "#93c47d",
  cashew: "#e6c9a8",
  pecan: "#a96f4e",
  macadamia: "#e8d4b0",
  honey: "#ffd166",
  maple: "#bf7f30",
  brown_sugar: "#b66a2e",
  molasses: "#5b371c",
  toffee: "#c68642",
  cane_sugar: "#ffe8b0",
  panela: "#d0994d",
  marshmallow: "#fff1e6",
  cocoa: "#6b3d2e",
  dark_chocolate: "#3e2620",
  milk_chocolate: "#7b4a36",
  cacao_nib: "#4a2e25",
  cinnamon: "#b6652a",
  clove: "#5b2b19",
  cardamom: "#9fb37a",
  nutmeg: "#8b5a2b",
  anise: "#3b2a2f",
  black_pepper: "#333333",
  ginger: "#d08a3a",
  allspice: "#6e4a2f",
  rose: "#ffb6c1",
  hibiscus: "#d81b60",
  chamomile: "#fff2b2",
  honeysuckle: "#f6e27a",
  violet: "#b497ff",
  elderflower: "#eef4d2",
  bergamot: "#ffd27a",
  grapefruit: "#ff7666",
  orange_zest: "#ff8c00",
  red_apple: "#ff6b6b",
  green_apple: "#8bd36a",
  pear: "#c9e19a",
  peach_note: "#ffb48f",
  apricot: "#ffb36b",
  plum: "#8f5a9e",
  cherry_note: "#d4435b",
  blackberry: "#4b2e83",
  raspberry_note: "#e34b78",
  cranberry: "#c2253a",
  grape_note: "#7b5cff",
  raisin: "#5c3b2e",
  date: "#7a4a2e",
  fig: "#7f5b45",
  prune: "#5a3b52",
  papaya: "#ffa25c",
  pineapple_note: "#ffe66d",
  passionfruit_note: "#ffb000",
  guava: "#ff7f8a",
  tamarind: "#7a3d1d",
  sage: "#a3b18a",
  thyme: "#9db17c",
  rosemary: "#8aa07a",
  lemongrass: "#cfe68a",
  earl_grey: "#c9b18f",
  cedar: "#8b5e3c",
  tobacco: "#6a4a3c",
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

// ---------- Noise + fbm for fractal ----------
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
function fbm(noise, x, y, octaves, lacunarity, gain) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) { sum += amp * noise(x * freq, y * freq); freq *= lacunarity; amp *= gain; }
  return sum;
}

export default function App() {
  // --- Controls ---
  const [flavorsInput, setFlavorsInput] = useState("ube, mango, coconut");
  const [angle, setAngle] = useState(30);

  // smear
  const [smearStrength, setSmearStrength] = useState(0.45);
  const [streakScale, setStreakScale] = useState(160);
  const [seed, setSeed] = useState(7);
  const [quality, setQuality] = useState("fast"); // "fast" | "high"

  // fractal overlay
  const [useFractal, setUseFractal] = useState(true);
  const [fractalIntensity, setFractalIntensity] = useState(0.25);
  const [fractalScale, setFractalScale] = useState(140);
  const [fractalOctaves, setFractalOctaves] = useState(4);

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

  const cssGradient = useMemo(() => {
    const str = stopsWithColors.map(s => `${s.color} ${Math.max(0, Math.min(100, s.pos))}%`).join(", ");
    return `linear-gradient(${angle}deg, ${str})`;
  }, [stopsWithColors, angle]);

  // draw preview
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 900, height: 520 };
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(512, Math.floor(rect.width * dpr));
    const h = Math.max(512, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    // base gradient
    const rad = (angle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w;
    const y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w;
    const y2 = h / 2 + Math.sin(rad) * h;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    stopsWithColors.forEach(s => g.addColorStop(s.pos / 100, s.color));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // smear
    if (smearStrength > 0) {
      const passes = Math.max(4, Math.round(24 * smearStrength));
      const shift = Math.max(1, Math.round((w + h) * 0.0015 * smearStrength));
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < passes; i++) {
        const dx = Math.cos(rad) * shift * (i + 1);
        const dy = Math.sin(rad) * shift * (i + 1);
        ctx.drawImage(canvas, dx, dy);
      }
      ctx.globalAlpha = 1;
    }

    // fractal
    if (useFractal && fractalIntensity > 0) {
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
  }, [stopsWithColors, angle, smearStrength, streakScale, seed, quality, useFractal, fractalIntensity, fractalScale, fractalOctaves]);

  function copyCss() { navigator.clipboard.writeText(cssGradient); }

  function downloadPng() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const out = document.createElement("canvas");
    out.width = Math.floor(exportSize * dpr);
    out.height = Math.floor(exportSize * dpr);
    const ctx = out.getContext("2d", { willReadFrequently: true }); if (!ctx) return;

    const w = out.width, h = out.height;
    const rad = (angle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w, y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w, y2 = h / 2 + Math.sin(rad) * h;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    stopsWithColors.forEach(s => g.addColorStop(s.pos / 100, s.color));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    if (smearStrength > 0) {
      const passes = Math.max(4, Math.round(24 * smearStrength));
      const shift = Math.max(1, Math.round((w + h) * 0.0015 * smearStrength));
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < passes; i++) {
        const dx = Math.cos(rad) * shift * (i + 1);
        const dy = Math.sin(rad) * shift * (i + 1);
        ctx.drawImage(out, dx, dy);
      }
      ctx.globalAlpha = 1;
    }

    if (useFractal && fractalIntensity > 0) {
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

    const a = document.createElement("a");
    a.download = `lb-flavor-gradient-${Date.now()}.png`;
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
      "peach, mango, passionfruit",
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

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src="/lb-logo.png" alt="LB Logo" className="w-12 h-12 rounded-full bg-white/5 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <h1 className="text-2xl font-bold">LB Flavor Gradient</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <section className="lg:col-span-1 space-y-4">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-xl">
              <label className="text-sm text-neutral-300">Type flavor prompts (comma or new line)</label>
              <textarea
                className="w-full rounded-xl bg-neutral-800/70 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[76px]"
                value={flavorsInput}
                onChange={e => setFlavorsInput(e.target.value)}
                placeholder="e.g., ube, mango, coconut"
              />

              {/* Color chips */}
              <div className="flex flex-wrap gap-2">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: c }} title={flavors[i]} />
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
                      <input type="checkbox" checked={autoSortStops} onChange={e => setAutoSortStops(e.target.checked)} />
                      Auto-sort
                    </label>
                    <button
                      onClick={() => {
                        const even = colors.map((_, i) => Math.round((i / Math.max(colors.length - 1, 1)) * 100));
                        setStops(even);
                      }}
                      className="text-[11px] px-2 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400"
                    >
                      Distribute evenly
                    </button>
                  </div>
                </div>
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c }} />
                    <span className="text-xs text-neutral-300 w-28 truncate">{flavors[i] || `Stop ${i + 1}`}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={stops[i] ?? 0}
                      onChange={e => {
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)));
                        setStops(prev => {
                          const base = prev.length ? prev : colors.map((_, j) => Math.round((j / Math.max(colors.length - 1, 1)) * 100));
                          const next = [...base];
                          next[i] = v;
                          return next;
                        });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-neutral-400 w-10 text-right">{stops[i] ?? 0}%</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Angle: {angle}°</label>
                  <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Smear strength: {Math.round(smearStrength * 100)}%</label>
                  <input type="range" min={0} max={100} value={Math.round(smearStrength * 100)} onChange={e => setSmearStrength(parseInt(e.target.value) / 100)} className="w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Fractal intensity: {Math.round(fractalIntensity * 100)}%</label>
                  <input type="range" min={0} max={100} value={Math.round(fractalIntensity * 100)} onChange={e => setFractalIntensity(parseInt(e.target.value) / 100)} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Fractal scale: {fractalScale}px</label>
                  <input type="range" min={60} max={400} value={fractalScale} onChange={e => setFractalScale(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Fractal octaves: {fractalOctaves}</label>
                  <input type="range" min={2} max={7} value={fractalOctaves} onChange={e => setFractalOctaves(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-400">Quality</label>
                  <button onClick={() => setQuality(q => q === "fast" ? "high" : "fast")} className="px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400">{quality.toUpperCase()}</button>
                  <button onClick={() => setSeed(s => s + 1)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-neutral-700 bg-neutral-800 hover:border-fuchsia-400"><RotateCw className="w-3 h-3" /> New seed</button>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400">Export size</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={exportSize} onChange={e => setExportSize(parseInt(e.target.value))}>
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
                <button onClick={copyCss} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-amber-400"><Copy className="w-4 h-4" /> Copy CSS</button>
                <button onClick={downloadPng} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400"><Download className="w-4 h-4" /> Download PNG</button>
                <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-fuchsia-400"><Sparkles className="w-4 h-4" /> Surprise me</button>
                <button onClick={saveCurrentToHistory} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-amber-400"><Plus className="w-4 h-4" /> Save to history</button>
              </div>

              <p className="text-xs text-neutral-400 pt-2">Tip: Try coffee notes like “bergamot, jasmine, honey”, “raspberry, cacao nib, hazelnut”, or “grapefruit, caramel, almond”.</p>
            </div>
          </section>

          {/* Single preview (canvas only) */}
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="p-3 text-sm text-neutral-300 flex items-center gap-2 bg-neutral-900/60 border-b border-neutral-800"><Wand2 className="w-4 h-4" /> Canvas preview (exports exactly)</div>
              <div className="h-72 md:h-96 bg-neutral-900 flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* History grid */}
            <div className="rounded-2xl border border-neutral-800 overflow-hidden mt-4">
              <div className="p-3 text-sm text-neutral-300 bg-neutral-900/60 border-b border-neutral-800 flex items-center gap-2"><History className="w-4 h-4"/> Palette history</div>
              <div className="p-3 flex flex-wrap gap-2">
                <button onClick={saveCurrentToHistory} className="text-xs px-2 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-amber-400 flex items-center gap-1"><Plus className="w-3 h-3"/> Save current</button>
                <button onClick={() => setHistory([])} className="text-xs px-2 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:border-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Clear</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3">
                {history.length === 0 && <div className="text-xs text-neutral-400 col-span-full">No saved palettes yet.</div>}
                {history.map((p, i) => (
                  <button key={i} onClick={() => setFlavorsInput(p)} className="group rounded-xl overflow-hidden border border-neutral-800 hover:border-amber-400 transition-colors" title={p}>
                    <div className="h-12" style={{ backgroundImage: makePreviewGradient(p) }} />
                    <div className="p-2 text-[11px] text-neutral-300 text-left truncate">{p}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function makePreviewGradient(preset) {
  const cols = preset.split(/,|\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 5).map(flavorToColor);
  const stops = cols.map((c, i) => `${c} ${(i / Math.max(cols.length - 1, 1)) * 100}%`).join(", ");
  return `linear-gradient(90deg, ${stops})`;
}
