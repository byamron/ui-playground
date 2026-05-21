// Programmatic arcade SFX via the Web Audio API — no audio files to load,
// no asset weight. Enabled is opt-in (off by default, toggled in DevPanel).

type Ctx = AudioContext;

class ArcadeAudio {
  private ctx?: Ctx;
  enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensureCtx();
  }

  private ensureCtx(): Ctx | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    // Browsers suspend the AudioContext until a user gesture. The toggle
    // click is itself a gesture, so resume is safe to call here.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  // Short metallic click — coin edge meeting the slot lip.
  click() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2400, t0);
    osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.05);
    gain.gain.setValueAtTime(0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.07);
  }

  // Lower thunk — coin settling into the cabinet's belly.
  thunk() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.18);
    gain.gain.setValueAtTime(0.22, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.24);
  }

  // CRT power-on whoosh — quick rising sawtooth into a brief settle.
  whoosh() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(2200, t0 + 0.1);
    osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.32);
    gain.gain.setValueAtTime(0.08, t0);
    gain.gain.linearRampToValueAtTime(0.04, t0 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.36);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.38);
  }

  // Soft descending sweep for cabinet power-down (reset choreography).
  powerDown() {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.22);
    gain.gain.setValueAtTime(0.06, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.27);
  }
}

export const arcadeAudio = new ArcadeAudio();
