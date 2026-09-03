'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '@/lib/client.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, statusClass, statusLabel } from '@/lib/score.js';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';

const fade = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 120 } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

function HealthBar({ endpoints }) {
    const total = endpoints.length || 1;
    const healthy = endpoints.filter((e) => statusClass(e.score) === 'healthy').length;
    const degraded = endpoints.filter((e) => statusClass(e.score) === 'degraded').length;
    const down = endpoints.filter((e) => statusClass(e.score) === 'down').length;
    const pending = endpoints.filter((e) => statusClass(e.score) === 'pending').length;

    const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

    return (
        <motion.div variants={fade} className="health-bar app-panel">
            <p className="page-desc" style={{ margin: 0 }}>Fleet health — {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</p>
            <div className="health-bar-track">
                {healthy > 0 && <motion.div initial={{ width: 0 }} animate={{ width: pct(healthy) }} transition={{ duration: 0.8, ease: "easeOut" }} className="health-bar-seg healthy" />}
                {degraded > 0 && <motion.div initial={{ width: 0 }} animate={{ width: pct(degraded) }} transition={{ duration: 0.8, ease: "easeOut" }} className="health-bar-seg degraded" />}
                {down > 0 && <motion.div initial={{ width: 0 }} animate={{ width: pct(down) }} transition={{ duration: 0.8, ease: "easeOut" }} className="health-bar-seg down" />}
                {pending > 0 && <motion.div initial={{ width: 0 }} animate={{ width: pct(pending) }} transition={{ duration: 0.8, ease: "easeOut" }} className="health-bar-seg pending" />}
            </div>
            <div className="health-bar-legend">
                <span><span className="legend-dot" style={{ background: 'var(--healthy)' }} /> Healthy {healthy}</span>
                <span><span className="legend-dot" style={{ background: 'var(--degraded)' }} /> Degraded {degraded}</span>
                <span><span className="legend-dot" style={{ background: 'var(--down)' }} /> Down {down}</span>
                {pending > 0 && <span><span className="legend-dot" style={{ background: 'var(--subtle)' }} /> Pending {pending}</span>}
            </div>
        </motion.div>
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [ready, authenticated, load]);

    if (!ready) return <div className="loading-state"><span className="pulse" /> Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;
    if (error) return <div className="empty-state">{error}</div>;

    const healthy = endpoints.filter((e) => statusClass(e.score) === 'healthy').length;
    const degraded = endpoints.filter((e) => statusClass(e.score) === 'degraded').length;
    const down = endpoints.filter((e) => statusClass(e.score) === 'down').length;

    return (
        <motion.div className="app-page" initial="hidden" animate="show" variants={staggerContainer}>
            <motion.header className="page-header" variants={fade}>
                <h1 className="page-title">Overview</h1>
                <p className="page-desc">Live snapshot of everything you&apos;re monitoring.</p>
            </motion.header>

            {endpoints.length > 0 && <HealthBar endpoints={endpoints} />}

            <motion.div className="stat-grid stagger" variants={fade}>
                <motion.div className="card stat-card stat-card-accent app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Total</p>
                    <p className="stat-value accent">{endpoints.length}</p>
                </motion.div>
                <motion.div className="card stat-card stat-card-green app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Healthy</p>
                    <p className="stat-value healthy">{healthy}</p>
                </motion.div>
                <motion.div className="card stat-card stat-card-amber app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Degraded</p>
                    <p className="stat-value degraded">{degraded}</p>
                </motion.div>
                <motion.div className="card stat-card stat-card-rose app-panel-interactive" whileHover={{ y: -4 }}>
                    <p className="stat-label">Down</p>
                    <p className="stat-value down">{down}</p>
                </motion.div>
            </motion.div>

            <motion.div className="dashboard-grid" variants={fade}>
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
                                        <span className="endpoint-row-url">{ep.name || ep.url}</span>
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
            </motion.div>
        </motion.div>
    );
}
