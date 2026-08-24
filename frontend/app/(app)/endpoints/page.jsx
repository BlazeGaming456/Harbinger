'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import client from '@/lib/client.js';
import CreateEndpointModal from '@/components/CreateEndpointModal.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { statusClass } from '@/lib/score.js';

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);
    const { ready, authenticated } = useAuth();

    async function load() {
        try {
            const { data } = await client.get('/endpoints');
            setEndpoints(data.data);
            setError(null);
        } catch {
            setError('Could not load endpoints.');
        }
    }

    useEffect(() => {
        if (!ready || !authenticated) return;
        load();
    }, [ready, authenticated]);

    if (!ready) return <div className="loading-state">Restoring session…</div>;
    if (!authenticated) return <div className="empty-state">Session expired. Please log in again.</div>;

    return (
        <div>
            <header className="page-header-row">
                <div>
                    <h1 className="page-title">Endpoints</h1>
                    <p className="page-desc">All URLs you&apos;re actively monitoring.</p>
                </div>
                <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
                    <Plus size={16} /> Add endpoint
                </button>
            </header>

            {error && <div className="form-error" style={{ marginBottom: 24 }}>{error}</div>}

            <div className="feature-grid stagger">
                {endpoints.map((ep) => (
                    <Link key={ep.id} href={`/endpoints/${ep.id}`} className="card card-hover endpoint-card">
                        <div className="endpoint-card-header">
                            <span className={`status-dot ${statusClass(ep.score)}`} />
                            <span className="endpoint-card-url">{ep.url}</span>
                        </div>
                        <span className="endpoint-meta">Every {ep.interval_seconds}s</span>
                        <NextProbeCountdown nextProbeAt={ep.next_probe_at} />
                    </Link>
                ))}
            </div>

            {endpoints.length === 0 && !error && (
                <div className="empty-state">
                    <p style={{ marginBottom: 16 }}>No endpoints yet.</p>
                    <button type="button" onClick={() => setShowModal(true)} className="btn btn-secondary">Add your first endpoint</button>
                </div>
            )}

            {showModal && <CreateEndpointModal onClose={() => setShowModal(false)} onCreated={load} />}
        </div>
    );
}
