'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import client from '@/lib/client.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, statusClass, statusLabel } from '@/lib/score.js';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';

function HealthBar({ endpoints }) {
    const total = endpoints.length || 1;
    const healthy = endpoints.filter((e) => statusClass(e.score) === 'healthy').length;
    const degraded = endpoints.filter((e) => statusClass(e.score) === 'degraded').length;
    const down = endpoints.filter((e) => statusClass(e.score) === 'down').length;
    const pending = endpoints.filter((e) => statusClass(e.score) === 'pending').length;

    const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

    return (
        <div className="health-bar app-panel">
            <p className="page-desc" style={{ margin: 0 }}>Fleet health — {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</p>
            <div className="health-bar-track">
                {healthy > 0 && <div className="health-bar-seg healthy" style={{ width: pct(healthy) }} />}
                {degraded > 0 && <div className="health-bar-seg degraded" style={{ width: pct(degraded) }} />}
                {down > 0 && <div className="health-bar-seg down" style={{ width: pct(down) }} />}
                {pending > 0 && <div className="health-bar-seg pending" style={{ width: pct(pending) }} />}
            </div>
            <div className="health-bar-legend">
                <span><span className="legend-dot" style={{ background: 'var(--healthy)' }} /> Healthy {healthy}</span>
                <span><span className="legend-dot" style={{ background: 'var(--degraded)' }} /> Degraded {degraded}</span>
                <span><span className="legend-dot" style={{ background: 'var(--down)' }} /> Down {down}</span>
                {pending > 0 && <span><span className="legend-dot" style={{ background: 'var(--subtle)' }} /> Pending {pending}</span>}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [error, setError] = useState(null);
    const { ready, authenticated } = useAuth();

    const load = useCallback(async () => {
        try {
            const { data } = await client.get('/endpoints');
            setEndpoints(data.data);
            setError(null);
        } catch {
            setError('Could not load endpoints.');
        }
    }, []);

    useEffect(() => {
        if (!ready || !authenticated) return;
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [ready, authenticated, load]);

    if (!ready) return <div className="loading-state">Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;

    const healthy = endpoints.filter((e) => statusClass(e.score) === 'healthy').length;
    const degraded = endpoints.filter((e) => statusClass(e.score) === 'degraded').length;
    const down = endpoints.filter((e) => statusClass(e.score) === 'down').length;

    return (
        <div className="app-page">
            <header className="page-header">
                <h1 className="page-title">Overview</h1>
                <p className="page-desc">Live snapshot of everything you&apos;re monitoring.</p>
            </header>

            {endpoints.length > 0 && <HealthBar endpoints={endpoints} />}

            <div className="stat-grid stagger">
                <div className="card stat-card stat-card-accent app-panel-interactive">
                    <p className="stat-label">Total</p>
                    <p className="stat-value accent">{endpoints.length}</p>
                </div>
                <div className="card stat-card stat-card-green app-panel-interactive">
                    <p className="stat-label">Healthy</p>
                    <p className="stat-value healthy">{healthy}</p>
                </div>
                <div className="card stat-card stat-card-amber app-panel-interactive">
                    <p className="stat-label">Degraded</p>
                    <p className="stat-value degraded">{degraded}</p>
                </div>
                <div className="card stat-card stat-card-rose app-panel-interactive">
                    <p className="stat-label">Down</p>
                    <p className="stat-value down">{down}</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div>
                    <div className="section-header">
                        <p className="section-label" style={{ margin: 0 }}>Recent endpoints</p>
                        <Link href="/endpoints" className="link-accent">View all →</Link>
                    </div>
                    <div className="card card-list app-panel">
                        {endpoints.slice(0, 6).map((ep) => (
                            <Link key={ep.id} href={`/endpoints/${ep.id}`} className="endpoint-row">
                                <span className="endpoint-row-info">
                                    <span className={`status-dot ${statusClass(ep.score)}`} />
                                    <span>
                                        <span className="endpoint-row-url">{ep.url}</span>
                                        <NextProbeCountdown nextProbeAt={ep.next_probe_at} onExpire={load} />
                                    </span>
                                </span>
                                <span className={`status-pill ${statusClass(ep.score)}`}>{statusLabel(ep.score)}</span>
                            </Link>
                        ))}
                        {endpoints.length === 0 && (
                            <p className="empty-state" style={{ padding: '32px 16px' }}>No endpoints yet.</p>
                        )}
                    </div>
                </div>

                <div className="quick-panel app-panel-interactive">
                    <h3>Quick start</h3>
                    <p>Add a URL and Harbinger will probe it on your schedule. You&apos;ll get an email if health degrades.</p>
                    <Link href="/endpoints" className="btn btn-primary" style={{ width: '100%' }}>
                        <Plus size={16} /> Add endpoint
                    </Link>
                </div>
            </div>
        </div>
    );
}
