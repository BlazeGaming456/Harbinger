'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function LatencyChart({ probes }) {
  if (!probes.length) {
    return (
      <div className="card chart-wrap app-panel-interactive">
        <p className="card-heading">Response time</p>
        <p className="chart-empty">No probe results yet.</p>
      </div>
    );
  }

  const data = probes.map((p) => ({
    time: new Date(p.probed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: p.response_time_ms,
  }));

  return (
    <div className="card chart-wrap app-panel-interactive">
      <p className="card-heading">Response time (ms)</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 211, 238, 0.08)" vertical={false} />
          <XAxis dataKey="time" stroke="#5c5c6e" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#5c5c6e" fontSize={11} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#0a0a12', border: '1px solid rgba(34, 211, 238, 0.25)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#9494a8' }}
            itemStyle={{ color: '#22d3ee' }}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22d3ee', stroke: '#a78bfa', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
