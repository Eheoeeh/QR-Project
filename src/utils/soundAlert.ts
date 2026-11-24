// Web Audio API Chime generator (Zero external dependencies, instant and reliable)
class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Lazy initialize when user enables
  }

  public enable(): boolean {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isEnabled = true;
      // Play a short pleasant test chime
      this.playChime();
      return true;
    } catch (e) {
      console.warn('Could not initialize audio context:', e);
      this.isEnabled = false;
      return false;
    }
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public getStatus(): boolean {
    return this.isEnabled;
  }

  /**
   * Plays a 3-tone notification chime for new orders or urgent service calls
   */
  public playChime(urgent: boolean = false): void {
    if (!this.isEnabled || !this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const notes = urgent ? [587.33, 880.0, 1174.66] : [523.25, 659.25, 783.99]; // D5-A5-D6 or C5-E5-G5

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.26);
      });
    } catch (err) {
      console.error('Audio play error:', err);
    }
  }
}

export const soundAlert = new SoundAlertManager();
