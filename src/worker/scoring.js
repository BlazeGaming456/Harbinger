export function computeScore({ p95_latency, error_rate, timeout_rate, baseline_p95 }) {
    const latencyScore = Math.min(p95_latency/(baseline_p95*3), 1);
    const score = (latencyScore*0.3) + (error_rate*0.4) + (timeout_rate*0.3);
    return Math.min(score,1);
}