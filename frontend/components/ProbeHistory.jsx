export default function ProbeHistory({ probes }) {
  const recent = [...probes].reverse().slice(0, 10);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-400 text-sm mb-4">Recent probes</p>
      <div className="space-y-2">
        {recent.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm font-mono">
            <span className="text-zinc-500">{new Date(p.probed_at).toLocaleTimeString()}</span>
            <span className={p.status_code >= 400 || !p.status_code ? 'text-red-400' : 'text-emerald-400'}>
              {p.status_code ?? p.error_type ?? 'timeout'}
            </span>
            <span className="text-zinc-400">{p.response_time_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}