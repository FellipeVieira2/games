import type { AudioService } from '../services/contracts';
export class WebAudioService implements AudioService {
  private context?: AudioContext;
  private interval?: ReturnType<typeof setInterval>;
  private note = 0;
  private tone(frequency: number, duration: number, volume: number): void {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  play(sound: 'tap' | 'reward' | 'upgrade'): void {
    try {
      this.tone(
        sound === 'tap' ? 360 + Math.random() * 80 : sound === 'reward' ? 880 : 660,
        sound === 'tap' ? 0.055 : 0.35,
        sound === 'tap' ? 0.025 : 0.065,
      );
    } catch {
      /* Audio is optional. */
    }
  }
  music(enabled: boolean): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    if (enabled)
      this.interval = setInterval(() => {
        try {
          this.tone([130.81, 164.81, 196, 246.94, 196, 164.81][this.note++ % 6]!, 1.4, 0.025);
        } catch {
          /* Audio is optional. */
        }
      }, 850);
  }
  pause(): void {
    this.music(false);
    void this.context?.suspend();
  }
  dispose(): void {
    this.music(false);
    void this.context?.close();
  }
}
