export class SocketRateLimiter {
  private cursorRate: number;
  private mutationRate: number;
  private cursorTokens: number;
  private mutationTokens: number;
  private cursorLastMs: number;
  private mutationLastMs: number;

  constructor({ cursorPerSec, mutationPerSec }: { cursorPerSec: number; mutationPerSec: number }) {
    this.cursorRate = cursorPerSec;
    this.mutationRate = mutationPerSec;
    this.cursorTokens = cursorPerSec;
    this.mutationTokens = mutationPerSec;
    const now = Date.now();
    this.cursorLastMs = now;
    this.mutationLastMs = now;
  }

  tryCursor(): boolean {
    const now = Date.now();
    const elapsed = (now - this.cursorLastMs) / 1000;
    this.cursorTokens = Math.min(this.cursorRate, this.cursorTokens + elapsed * this.cursorRate);
    this.cursorLastMs = now;
    if (this.cursorTokens < 1) return false;
    this.cursorTokens -= 1;
    return true;
  }

  tryMutation(): boolean {
    const now = Date.now();
    const elapsed = (now - this.mutationLastMs) / 1000;
    this.mutationTokens = Math.min(this.mutationRate, this.mutationTokens + elapsed * this.mutationRate);
    this.mutationLastMs = now;
    if (this.mutationTokens < 1) return false;
    this.mutationTokens -= 1;
    return true;
  }
}
