"use client";
let enabled = true;
export function setSoundEnabled(v: boolean) { enabled = v; try { localStorage.setItem("rt_sound", v ? "1" : "0"); } catch {} }
export function isSoundEnabled() { try { return localStorage.getItem("rt_sound") !== "0"; } catch { return enabled; } }
export function playTone(freq = 440, dur = 0.08, type: OscillatorType = "sine", vol = 0.08) {
  try {
    if (!isSoundEnabled()) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
    o.onended = () => ctx.close().catch(() => {});
  } catch {}
}
export const sfx = {
  click: () => playTone(600, 0.06, "square", 0.04),
  move: () => playTone(520, 0.09, "sine", 0.09),
  win: () => { playTone(523, 0.12); setTimeout(() => playTone(659, 0.12), 110); setTimeout(() => playTone(784, 0.2), 220); },
  lose: () => { playTone(330, 0.15, "sawtooth", 0.05); setTimeout(() => playTone(220, 0.25, "sawtooth", 0.05), 140); },
  coin: () => { playTone(988, 0.08, "square", 0.05); setTimeout(() => playTone(1319, 0.15, "square", 0.05), 90); },
  error: () => playTone(180, 0.2, "sawtooth", 0.06),
};
