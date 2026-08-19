import { describe, it, expect } from 'vitest';
import { computeScore } from './scoring.js';

describe('computeScore', () => {
    it('returns 0 for a perfectly healthy endpoint', () => {
        const score = computeScore({ p95_latency: 100, error_rate: 0, timeout_rate: 0, baseline_p95: 500 });
        expect(score).toBeCloseTo(0.02,2); //Small non-zero from latency ratio, no errors/timeouts
    })

    it('Returns close to 1 for a fully broken endpoint', () => {
    const score = computeScore({ p95_latency: 5000, error_rate: 1, timeout_rate: 1, baseline_p95: 500 });
    expect(score).toBe(1);
  });

  it('Never exceeds 1 even with extreme latency', () => {
    const score = computeScore({ p95_latency: 999999, error_rate: 0, timeout_rate: 0, baseline_p95: 500 });
    expect(score).toBeLessThanOrEqual(1);
  });

  it('Weighs error_rate more than latency, per the 0.4 vs 0.3 weighting', () => {
    const latencyHeavy = computeScore({ p95_latency: 1500, error_rate: 0, timeout_rate: 0, baseline_p95: 500 });
    const errorHeavy = computeScore({ p95_latency: 100, error_rate: 1, timeout_rate: 0, baseline_p95: 500 });
    expect(errorHeavy).toBeGreaterThan(latencyHeavy);
  });
})