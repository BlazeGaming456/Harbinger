'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import client from '@/lib/client.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, statusClass } from '@/lib/score.js';

export default function DashboardPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [error, setError] = useState(null);
    const { ready, authenticated } = useAuth();

    useEffect(() => {
        if (!ready || !authenticated) return;
        client.get('/endpoints')
            .then(({ data }) => setEndpoints(data.data))
            .catch(() => setError('Could not load endpoints.'));
    }, [ready, authenticated]);

    if (!ready) return <div className="loading-state">Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;

    const healthy = endpoints.filter((e) => statusClass(e.score) === 'healthy').length;
    const degraded = endpoints.filter((e) => statusClass(e.score) === 'degraded').length;
    const down = endpoints.filter((e) => statusClass(e.score) === 'down').length;
    const pending = endpoints.filter((e) => statusClass(e.score) === 'pending').length;

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Overview</h1>
                <p className="page-desc">A snapshot of all your monitored endpoints.</p>
            </header>

            <div className="stat-grid stagger">
                <div className="card stat-card stat-card-accent">
                    <p className="stat-label">Total</p>
                    <p className="stat-value accent">{endpoints.length}</p>
                </div>
                <div className="card stat-card stat-card-green">
                    <p className="stat-label">Healthy</p>
                    <p className="stat-value healthy">{healthy}</p>
                </div>
                <div className="card stat-card stat-card-amber">
                    <p className="stat-label">Degraded</p>
                    <p className="stat-value degraded">{degraded}</p>
                </div>
                <div className="card stat-card stat-card-rose">
                    <p className="stat-label">Down</p>
                    <p className="stat-value down">{down}</p>
                </div>
            </div>

            {pending > 0 && (
                <div className="notice-banner">
                    {pending} endpoint{pending !== 1 ? 's' : ''} waiting for first probe.
                </div>
            )}

            <div>
                <div className="section-header">
                    <p className="section-label" style={{ margin: 0 }}>Recent endpoints</p>
                    <Link href="/endpoints" className="link-accent">View all →</Link>
                </div>
                <div className="card card-list">
                    {endpoints.slice(0, 5).map((ep) => (
                        <Link key={ep.id} href={`/endpoints/${ep.id}`} className="endpoint-row">
                            <span className="endpoint-row-info">
                                <span className={`status-dot ${statusClass(ep.score)}`} />
                                <span className="endpoint-row-url">{ep.url}</span>
                            </span>
                            <span className="endpoint-row-score">{formatScore(ep.score) ?? 'pending'}</span>
                        </Link>
                    ))}
                    {endpoints.length === 0 && (
                        <p className="empty-state" style={{ padding: '32px 16px' }}>No endpoints yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
