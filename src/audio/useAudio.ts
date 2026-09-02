import { useCallback, useRef, useState } from "react";

/**
 * The shop, synthesised. No audio files: room tone, clipper motors,
 * scissors, a wall clock, running water and street noise, all through a
 * generated convolution reverb so it sits in a small tiled room.
 *
 * The mix follows you: each room has its own balance, crossfaded over
 * about 1.6s as you cross a threshold.
 */
type Mix = { tone: number; clip: number; water: number; street: number; tick: number; snip: number };

const ROOMS: Mix[] = [
  { tone: 0.26, clip: 0.0, water: 0.0, street: 0.1, tick: 0.16, snip: 0.0 },   // reception
  { tone: 0.22, clip: 0.05, water: 0.0, street: 0.24, tick: 0.3, snip: 0.05 }, // waiting
  { tone: 0.16, clip: 0.3, water: 0.0, street: 0.05, tick: 0.05, snip: 0.26 },// cutting floor
  { tone: 0.16, clip: 0.34, water: 0.0, street: 0.03, tick: 0.03, snip: 0.22 },// capacity
  { tone: 0.14, clip: 0.0, water: 0.3, street: 0.0, tick: 0.0, snip: 0.02 },  // wash
  { tone: 0.18, clip: 0.22, water: 0.0, street: 0.0, tick: 0.06, snip: 0.34 },// one station
  { tone: 0.3, clip: 0.0, water: 0.0, street: 0.02, tick: 0.1, snip: 0.0 },   // back room
  { tone: 0.24, clip: 0.03, water: 0.0, street: 0.3, tick: 0.05, snip: 0.02 },// the way out
];

export function useAudio() {
  const [on, setOn] = useState(false);
  const ref = useRef<any>(null);

  const build = useCallback(() => {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx: AudioContext = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // a small tiled room, as an impulse response
    const conv = ctx.createConvolver();
    const rl = Math.floor(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, rl, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2);
    }
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    conv.connect(wet); wet.connect(master);
    const bus = () => { const g = ctx.createGain(); g.connect(master); g.connect(conv); return g; };

    // brown-ish noise, shared by tone, water, street and the snips
    const nl = ctx.sampleRate * 2;
    const nb = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let lastN = 0;
    for (let j = 0; j < nl; j++) { const w = Math.random() * 2 - 1; lastN = (lastN + 0.02 * w) / 1.02; nd[j] = lastN * 3.2; }
    const noise = () => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(); return s; };

    // room tone: air plus a 50Hz fluorescent hum
    const tone = bus(); tone.gain.value = 0.2;
    const tf = ctx.createBiquadFilter(); tf.type = "lowpass"; tf.frequency.value = 340; tf.Q.value = 0.6;
    noise().connect(tf); tf.connect(tone);
    const mains = ctx.createOscillator(); mains.type = "sine"; mains.frequency.value = 50;
    const mg = ctx.createGain(); mg.gain.value = 0.035;
    mains.connect(mg); mg.connect(tone); mains.start();

    // clippers: two motors slightly apart so they beat, with a tremolo buzz
    const clip = bus(); clip.gain.value = 0;
    const cf = ctx.createBiquadFilter(); cf.type = "bandpass"; cf.frequency.value = 760; cf.Q.value = 3.2;
    cf.connect(clip);
    const cAmp = ctx.createGain(); cAmp.gain.value = 0.5; cAmp.connect(cf);
    (["sawtooth", "square"] as OscillatorType[]).forEach((t, i) => {
      const o = ctx.createOscillator(); o.type = t; o.frequency.value = i ? 113 : 107;
      const g = ctx.createGain(); g.gain.value = i ? 0.22 : 0.3;
      o.connect(g); g.connect(cAmp); o.start();
    });
    const trem = ctx.createOscillator(); trem.frequency.value = 31;
    const tg = ctx.createGain(); tg.gain.value = 0.34;
    trem.connect(tg); tg.connect(cAmp.gain); trem.start();

    // the backwash basin
    const water = bus(); water.gain.value = 0;
    const wf = ctx.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = 1500; wf.Q.value = 0.7;
    const wf2 = ctx.createBiquadFilter(); wf2.type = "highpass"; wf2.frequency.value = 600;
    noise().connect(wf); wf.connect(wf2); wf2.connect(water);
    const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.7;
    const wlg = ctx.createGain(); wlg.gain.value = 420;
    wlfo.connect(wlg); wlg.connect(wf.frequency); wlfo.start();

    // the street through the front windows
    const street = bus(); street.gain.value = 0;
    const sf = ctx.createBiquadFilter(); sf.type = "lowpass"; sf.frequency.value = 900;
    noise().connect(sf); sf.connect(street);

    const TICK = bus(); TICK.gain.value = 0;
    const SNIP = bus(); SNIP.gain.value = 0;

    const tick = (hi: boolean) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = hi ? 2400 : 1750; f.Q.value = 9;
      o.type = "square"; o.frequency.value = hi ? 190 : 150;
      o.connect(f); f.connect(g); g.connect(TICK);
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.9, t0);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.045);
      o.start(t0); o.stop(t0 + 0.06);
    };
    const snip = () => {
      for (let k = 0; k < 2; k++) {
        const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = 5200 + Math.random() * 3200; f.Q.value = 7;
        const g = ctx.createGain();
        s.connect(f); f.connect(g); g.connect(SNIP);
        const t0 = ctx.currentTime + k * 0.055;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
        s.start(t0); s.stop(t0 + 0.07);
      }
    };

    const api = {
      ctx, master, clipTarget: 0, alive: true,
      setRoom(i: number) {
        const m = ROOMS[Math.max(0, Math.min(ROOMS.length - 1, i))];
        const T = ctx.currentTime, S = 1.6;
        tone.gain.setTargetAtTime(m.tone, T, S);
        water.gain.setTargetAtTime(m.water, T, S);
        street.gain.setTargetAtTime(m.street, T, S);
        TICK.gain.setTargetAtTime(m.tick, T, S);
        SNIP.gain.setTargetAtTime(m.snip, T, S);
        api.clipTarget = m.clip;
      },
    };

    let n = 0;
    setInterval(() => { if (api.alive && TICK.gain.value > 0.01) tick(n++ % 2 === 0); }, 1000);
    const loopSnip = () => setTimeout(() => {
      if (api.alive && SNIP.gain.value > 0.01) snip();
      loopSnip();
    }, 2200 + Math.random() * 7000);
    loopSnip();
    // clippers come on and off the way they actually do
    const loopClip = () => setTimeout(() => {
      const t = api.clipTarget > 0.001 && Math.random() < 0.62 ? api.clipTarget : 0;
      clip.gain.setTargetAtTime(t, ctx.currentTime, 0.35);
      loopClip();
    }, 1800 + Math.random() * 4200);
    loopClip();

    return api;
  }, []);

  const toggle = useCallback(() => {
    if (!ref.current) {
      ref.current = build();
      if (!ref.current) return;
      ref.current.setRoom(0);
    }
    const a = ref.current;
    if (a.ctx.state === "suspended") a.ctx.resume();
    const next = !on;
    setOn(next);
    a.master.gain.setTargetAtTime(next ? 0.85 : 0, a.ctx.currentTime, 0.8);
  }, [on, build]);

  const setRoom = useCallback((i: number) => { ref.current?.setRoom(i); }, []);

  return { on, toggle, setRoom };
}
