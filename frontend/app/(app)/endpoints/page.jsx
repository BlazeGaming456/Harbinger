'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '@/lib/client.js';
import CreateEndpointModal from '@/components/CreateEndpointModal.jsx';
import DeleteEndpointButton from '@/components/DeleteEndpointButton.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, statusClass, statusLabel } from '@/lib/score.js';

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

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [showModal, setShowModal] = useState(false);
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

    return (
        <motion.div className="app-page" initial="hidden" animate="show" variants={staggerContainer}>
            <motion.header className="page-header-row" variants={fade}>
                <div>
                    <h1 className="page-title">Endpoints</h1>
                    <p className="page-desc">{endpoints.length} URL{endpoints.length !== 1 ? 's' : ''} monitored · refreshes every 10s</p>
                </div>
                <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
                    <Plus size={16} /> Add endpoint
                </button>
            </motion.header>

            {error && <motion.div variants={fade} className="form-error" style={{ marginBottom: 24 }}>{error}</motion.div>}

            {endpoints.length === 0 && !error ? (
                <motion.div variants={fade} className="empty-state app-panel card">
                    <p style={{ marginBottom: 16 }}>No endpoints yet.</p>
                    <button type="button" onClick={() => setShowModal(true)} className="btn btn-secondary">Add your first endpoint</button>
                </motion.div>
            ) : (
                <>
                    <motion.div variants={fade} className="endpoint-table-wrap card app-panel">
                        <table className="endpoint-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>URL</th>
                                    <th>Score</th>
                                    <th>Interval</th>
                                    <th>Next probe</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {endpoints.map((ep) => (
                                    <tr key={ep.id}>
                                        <td><span className={`status-pill ${statusClass(ep.score)}`}>{statusLabel(ep.score)}</span></td>
                                        <td><Link href={`/endpoints/${ep.id}`}><span className="table-url">{ep.name || ep.url}</span></Link></td>
                                        <td className="mono">{formatScore(ep.score) ?? '—'}</td>
                                        <td className="mono">{ep.interval_seconds}s</td>
                                        <td><NextProbeCountdown nextProbeAt={ep.next_probe_at} onExpire={load} /></td>
                                        <td className="table-actions">
                                            <DeleteEndpointButton id={ep.id} onDeleted={load} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>

                    <motion.div variants={fade} className="endpoint-cards-mobile stagger">
                        {endpoints.map((ep) => (
                            <motion.div key={ep.id} className="card endpoint-card-mobile app-panel-interactive" whileHover={{ y: -2 }}>
                                <Link href={`/endpoints/${ep.id}`} className="endpoint-card-link">
                                    <div className="endpoint-card-header">
                                        <span className={`status-dot ${statusClass(ep.score)}`} />
                                        <span className="endpoint-card-url">{ep.name || ep.url}</span>
                                        <span className={`status-pill ${statusClass(ep.score)}`}>{statusLabel(ep.score)}</span>
                                    </div>
                                    <span className="endpoint-meta">Every {ep.interval_seconds}s · score {formatScore(ep.score) ?? 'pending'}</span>
                                    <NextProbeCountdown nextProbeAt={ep.next_probe_at} onExpire={load} />
                                </Link>
                                <div className="endpoint-card-actions">
                                    <DeleteEndpointButton id={ep.id} onDeleted={load} />
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}

            <CreateEndpointModal open={showModal} onClose={() => setShowModal(false)} onCreated={load} />
        </motion.div>
    );
}
