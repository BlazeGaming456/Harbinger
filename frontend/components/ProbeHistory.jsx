export default function ProbeHistory({ probes }) {
  const recent = [...probes].reverse().slice(0, 10);

  if (!recent.length) {
    return (
      <div className="card chart-wrap">
        <p className="stat-label">Recent probes</p>
        <p className="chart-empty">No probes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card chart-wrap">
      <p className="stat-label">Recent probes</p>
      <div style={{ marginTop: 12 }}>
        {recent.map((p) => (
          <div key={p.id} className="probe-row">
            <span style={{ color: 'var(--muted)' }}>{new Date(p.probed_at).toLocaleTimeString()}</span>
            <span style={{ color: p.status_code >= 400 || !p.status_code ? 'var(--down)' : 'var(--healthy)' }}>
              {p.status_code ?? p.error_type ?? 'timeout'}
            </span>
            <span style={{ color: 'var(--cyan)' }}>{p.response_time_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
