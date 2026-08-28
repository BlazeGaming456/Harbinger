import { formatProbeStatus, formatProbeTime } from '@/lib/probe.js';

export default function ProbeHistory({ probes }) {
    const recent = [...probes].reverse().slice(0, 10);

    if (!recent.length) {
        return (
            <div className="card chart-wrap probe-table-wrap">
                <p className="card-heading">Recent probes</p>
                <p className="chart-empty">No probes recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="card chart-wrap probe-table-wrap">
            <p className="card-heading">Recent probes</p>
            <div className="probe-table-scroll">
                <table className="probe-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Latency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map((p) => {
                            const status = formatProbeStatus(p);
                            return (
                                <tr key={p.id}>
                                    <td className="probe-time">{formatProbeTime(p.probed_at)}</td>
                                    <td>
                                        <span className={`probe-status probe-status-${status.tone}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="probe-latency">
                                        {p.response_time_ms != null ? `${p.response_time_ms} ms` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
