'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import client from '@/lib/client.js';
import LatencyChart from '@/components/LatencyChart.jsx';
import ProbeHistory from '@/components/ProbeHistory.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, parseScore } from '@/lib/score.js';

export default function EndpointDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [endpoint, setEndpoint] = useState(null);
    const [health, setHealth] = useState(null);
    const [probes, setProbes] = useState([]);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { ready, authenticated } = useAuth();

    const load = useCallback(async () => {
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
    }, [id]);

    useEffect(() => {
        if (!ready || !authenticated) return;
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [ready, authenticated, load]);

    async function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setError(null);
            return;
        }
        setDeleting(true);
        try {
            await client.delete(`/endpoints/${id}`);
            router.push('/endpoints');
        } catch {
            setDeleting(false);
            setConfirmDelete(false);
            setError('Failed to delete endpoint.');
        }
    }

    if (!ready) return <div className="loading-state">Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;
    if (!endpoint) return <div className="loading-state">Loading endpoint…</div>;

    const hasScore = parseScore(health?.score) != null;

    return (
        <div className="app-page">
            <Link href="/endpoints" className="back-link">← Back to endpoints</Link>

            <header className="page-header">
                <div className="page-header-row endpoint-detail-header">
                    <div className="endpoint-detail-title-wrap">
                        <h1 className="page-title endpoint-detail-url">{endpoint.url}</h1>
                        <div className="endpoint-detail-meta">
                            <span className="endpoint-meta">Every {endpoint.interval_seconds}s</span>
                            <NextProbeCountdown nextProbeAt={endpoint.next_probe_at} onExpire={load} />
                        </div>
                    </div>
                    <div className="endpoint-detail-actions">
                        {health && <span className="badge badge-live">{health.source === 'cache' ? 'cached' : 'live'}</span>}
                        {confirmDelete ? (
                            <div className="delete-confirm-inline">
                                <button type="button" className="btn btn-danger-solid btn-sm" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? 'Deleting…' : 'Confirm delete'}
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {!hasScore && (
                <div className="info-banner">
                    Waiting for probe data. Results appear after the scheduler runs the first check.
                </div>
            )}

            <div className="stat-grid stagger">
                <div className="card stat-card stat-card-accent app-panel-interactive">
                    <p className="stat-label">Score</p>
                    <p className="stat-value accent">{formatScore(health?.score) ?? '—'}</p>
                </div>
                <div className="card stat-card stat-card-green app-panel-interactive">
                    <p className="stat-label">p95 latency</p>
                    <p className="stat-value">{health?.p95_latency_ms ?? '—'}<span className="stat-unit"> ms</span></p>
                </div>
                <div className="card stat-card stat-card-amber app-panel-interactive">
                    <p className="stat-label">Error rate</p>
                    <p className="stat-value degraded">{hasScore ? `${(Number(health.error_rate ?? 0) * 100).toFixed(0)}%` : '—'}</p>
                </div>
            </div>

            <div className="detail-grid">
                <LatencyChart probes={probes} />
                <ProbeHistory probes={probes} />
            </div>
        </div>
    );
}
