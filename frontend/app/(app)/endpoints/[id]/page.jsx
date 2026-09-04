'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import client, { getAccessToken } from '@/lib/client.js';
import LatencyChart from '@/components/LatencyChart.jsx';
import ProbeHistory from '@/components/ProbeHistory.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, parseScore } from '@/lib/score.js';
import { createSocket } from '@/lib/socket.js';

const fade = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 120 } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

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

        //Get initial data through HTTP
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();

        //Get the current JWT
        const accessToken = getAccessToken();

        if (!accessToken) return;

        //Open Websocket connection
        const socket = createSocket(accessToken, (update) => {
            //Only process score updates
            if (update.type !== 'score-update') return;

            //Only process updates for THIS endpoint
            if (update.endpointId !== id) return;

            //Update health state
            setHealth((prev) => ({
                ...prev,
                score: update.score,
                p95_latency_ms: update.p95_latency_ms,
                error_rate: update.error_rate,
                timeout_rate: update.timeout_rate,
                trend: update.trend,
            }));
        });
        
        // Cleanup on unmount
        return () => {
            socket.close();
        };
    }, [ready, authenticated, load, id]);

    //Fallback that uses a slower background pool every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => client.get(`/health/${id}`).then(({ data }) => setHealth(data)), 60000);
        return () => clearInterval(interval);
    }, [id]);

    function statusColor (score, earlyWarning) {
        if (score >= 0.7) return 'bg-red-400';
        if (earlyWarning) return 'bg-amber-400';
        if (score < 0.3) return 'bg-emerald-400';
        return 'bg-zinc-500';
    }

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
        } catch (err) {
            setDeleting(false);
            setConfirmDelete(false);
            setError(err.response?.data?.error || err.message || 'Failed to delete endpoint.');
        }
    }

    if (!ready) return <div className="loading-state"><span className="pulse" /> Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;
    if (!endpoint) return <div className="loading-state"><span className="pulse" /> Loading endpoint…</div>;

    const hasScore = parseScore(health?.score) != null;
    const score = parseScore(health?.score);
    const hasEarlyWarning = health?.incident_type === 'early_warning';
    const healthStatusColor = statusColor(
        score ?? 0,
        hasEarlyWarning
    );

    return (
        <motion.div className="app-page" initial="hidden" animate="show" variants={staggerContainer}>
            <Link href="/endpoints" className="back-link">← Back to endpoints</Link>

            <motion.header className="page-header" variants={fade}>
                <div className="page-header-row endpoint-detail-header">
                    <div className="endpoint-detail-title-wrap">
                        <h1 className="page-title endpoint-detail-url text-gradient">{endpoint.name || endpoint.url}</h1>
                        {endpoint.name && <p className="endpoint-detail-url">{endpoint.url}</p>}
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
            </motion.header>

            {!hasScore && (
                <motion.div variants={fade} className="info-banner">
                    Waiting for probe data. Results appear after the scheduler runs the first check.
                </motion.div>
            )}

            <motion.div variants={fade} className="stat-grid stagger">
                {/* SCORE */}
                <motion.div className="card stat-card stat-card-accent app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Score</p>
                    
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${healthStatusColor}`} />
                        <p className="stat-value">{formatScore(health?.score) ?? '-'}</p>
                    </div>

                    {health?.trend != null && (
                        <p>
                            {health.trend > 0 ? '↑' : health.trend < 0 ? '↓' : '→'}{' '}
                            {Math.abs(Number(health.trend)).toFixed(2)}
                        </p>
                    )}

                    {hasEarlyWarning && (
                        <p className="text-xs text-amber-400 mt-1">
                            Early warning
                        </p>
                    )}

                    {score >= 0.7 && (
                        <p className="text-xs text-red-400 mt-1">
                            Degredation detected
                        </p>
                    )}
                </motion.div>

                {/* P95 */}
                <motion.div className="card stat-card stat-card-green app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">p95 latency</p>
                    <p className="stat-value">{health?.p95_latency_ms ?? '—'}<span className="stat-unit"> ms</span></p>
                </motion.div>

                {/* ERROR RATE */}
                <motion.div className="card stat-card stat-card-amber app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Error rate</p>
                    <p className="stat-value degraded">{hasScore ? `${(Number(health.error_rate ?? 0) * 100).toFixed(0)}%` : '—'}</p>
                </motion.div>
            </motion.div>

            <motion.div variants={fade} className="detail-grid">
                <LatencyChart probes={probes} />
                <ProbeHistory probes={probes} />
            </motion.div>
        </motion.div>
    );
}