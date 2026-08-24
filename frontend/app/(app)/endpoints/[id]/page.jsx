'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import client from '@/lib/client.js';
import LatencyChart from '@/components/LatencyChart.jsx';
import ProbeHistory from '@/components/ProbeHistory.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, parseScore } from '@/lib/score.js';

export default function EndpointDetailPage() {
    const { id } = useParams();
    const [endpoint, setEndpoint] = useState(null);
    const [health, setHealth] = useState(null);
    const [probes, setProbes] = useState([]);
    const [error, setError] = useState(null);
    const { ready, authenticated } = useAuth();

    useEffect(() => {
        if (!ready || !authenticated) return;

        async function load() {
            try {
                const [endpointRes, healthRes, probesRes] = await Promise.all([
                    client.get(`/endpoints/${id}`),
                    client.get(`/health/${id}`),
                    client.get(`/endpoints/${id}/probes`),
                ]);
                setEndpoint(endpointRes.data);
                setHealth(healthRes.data);
                setProbes(probesRes.data);
                setError(null);
            } catch {
                setError('Could not load endpoint data.');
            }
        }

        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [id, ready, authenticated]);

    if (!ready) return <div className="loading-state">Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;
    if (!endpoint) return <div className="loading-state">Loading endpoint…</div>;

    const hasScore = parseScore(health?.score) != null;

    return (
        <div>
            <Link href="/endpoints" className="link-accent" style={{ display: 'inline-block', marginBottom: 20 }}>← Back to endpoints</Link>

            <header className="page-header">
                <div className="page-header-row" style={{ marginBottom: 0 }}>
                    <div style={{ minWidth: 0 }}>
                        <h1 className="page-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{endpoint.url}</h1>
                        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                            <span className="endpoint-meta">Every {endpoint.interval_seconds}s</span>
                            <NextProbeCountdown nextProbeAt={endpoint.next_probe_at} />
                        </div>
                    </div>
                    {health && <span className="badge badge-live">{health.source === 'cache' ? 'cached' : 'live'}</span>}
                </div>
            </header>

            {!hasScore && (
                <div className="info-banner">
                    Waiting for probe data. Results appear after the scheduler runs the first check.
                </div>
            )}

            <div className="stat-grid stagger">
                <div className="card stat-card stat-card-accent">
                    <p className="stat-label">Score</p>
                    <p className="stat-value accent">{formatScore(health?.score) ?? '—'}</p>
                </div>
                <div className="card stat-card stat-card-green">
                    <p className="stat-label">p95 latency</p>
                    <p className="stat-value">{health?.p95_latency_ms ?? '—'}<span style={{ fontSize: 14, opacity: 0.5 }}> ms</span></p>
                </div>
                <div className="card stat-card stat-card-amber">
                    <p className="stat-label">Error rate</p>
                    <p className="stat-value degraded">{hasScore ? `${(Number(health.error_rate ?? 0) * 100).toFixed(0)}%` : '—'}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                <LatencyChart probes={probes} />
                <ProbeHistory probes={probes} />
            </div>
        </div>
    );
}
