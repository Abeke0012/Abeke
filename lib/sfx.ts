/**
 * Sound-effect placeholder bus.
 *
 * Each cue synthesises a short blip with WebAudio so the interactions have
 * audible feedback today; swap `play()` bodies for real samples later
 * (e.g. `new Audio("/sfx/protocol-on.wav").play()`).
 */

export type SfxCue = "protocolOn" | "protocolOff" | "select" | "execute" | "confirm" | "boot";

const CUES: Record<SfxCue, { freq: number[]; dur: number; type: OscillatorType }> = {
  protocolOn: { freq: [660, 1320], dur: 0.09, type: "square" },
  protocolOff: { freq: [880, 330], dur: 0.09, type: "square" },
  select: { freq: [520, 780], dur: 0.07, type: "triangle" },
  execute: { freq: [220, 880], dur: 0.25, type: "sawtooth" },
  confirm: { freq: [990, 1480], dur: 0.18, type: "square" },
  boot: { freq: [110, 440], dur: 0.3, type: "triangle" },
};

let ctx: AudioContext | null = null;

export function playSfx(cue: SfxCue, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const { freq, dur, type } = CUES[cue];
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq[0], t);
    osc.frequency.exponentialRampToValueAtTime(freq[1], t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // Audio is decorative; ignore autoplay or support failures.
  }
}
