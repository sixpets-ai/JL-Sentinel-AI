// Pure port of heatmap_generator.generate_heatmap (0.01 grid, mention-weighted centroid, max-normalized weight).
export interface HeatInput { lat: number; lng: number; mentions?: number }
export interface HeatPoint { lat: number; lng: number; weight: number; count: number }

/** Python 3 round(): half to even. */
export function pyRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  const isHalf = Math.abs(v - Math.trunc(v)) === 0.5;
  const out = isHalf ? (r % 2 === 0 ? r : r - 1) : r;
  return out / f;
}

export function generateHeatmap(events: HeatInput[]): HeatPoint[] {
  const cells = new Map<string, { lat: number; lng: number; count: number }>();
  for (const e of events) {
    const m = e.mentions ?? 1;
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng) || !Number.isInteger(m) || m < 1) continue;
    const key = pyRound(e.lat / 0.01) + ":" + pyRound(e.lng / 0.01);
    const c = cells.get(key) ?? { lat: 0, lng: 0, count: 0 };
    c.lat += e.lat * m; c.lng += e.lng * m; c.count += m;
    cells.set(key, c);
  }
  const all = [...cells.values()];
  const max = all.length ? Math.max(...all.map((c) => c.count)) : 1;
  return all.map((c) => ({ lat: c.lat / c.count, lng: c.lng / c.count, weight: pyRound(c.count / max, 4), count: c.count }));
}
