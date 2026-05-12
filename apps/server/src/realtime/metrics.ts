const WINDOW = 50;
const samples: number[] = [];

export function recordJoinTiming(totalMs: number): void {
  samples.push(totalMs);
  if (samples.length > WINDOW) samples.shift();
}

export function getJoinMetrics(): {
  count: number;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
} {
  if (samples.length === 0) {
    return { count: 0, avgMs: null, p50Ms: null, p95Ms: null, maxMs: null };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
  return {
    count: sorted.length,
    avgMs: round(avg),
    p50Ms: round(p(0.5)),
    p95Ms: round(p(0.95)),
    maxMs: round(sorted[sorted.length - 1]!),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
