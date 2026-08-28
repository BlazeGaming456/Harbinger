export function parseScore(score) {
  if (score == null || score === '') return null;
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
}

export function formatScore(score, digits = 2) {
  const n = parseScore(score);
  return n == null ? null : n.toFixed(digits);
}

export function statusClass(score) {
  const n = parseScore(score);
  if (n == null) return 'pending';
  if (n < 0.3) return 'healthy';
  if (n < 0.7) return 'degraded';
  return 'down';
}

export function statusLabel(score) {
  const s = statusClass(score);
  return { pending: 'Pending', healthy: 'Healthy', degraded: 'Degraded', down: 'Down' }[s];
}
