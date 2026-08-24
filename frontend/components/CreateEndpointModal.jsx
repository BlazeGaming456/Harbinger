'use client';
import { useState } from 'react';
import client from '@/lib/client.js';

export default function CreateEndpointModal({ onClose, onCreated }) {
    const [url, setUrl] = useState('');
    const [interval, setInterval_] = useState(60);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await client.post('/endpoints', { url, interval_seconds: Number(interval) });
            onCreated();
            onClose();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not create this endpoint.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add endpoint</h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                    <label className="label">
                        URL
                        <input required type="url" className="input" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
                    </label>
                    <label className="label">
                        Check interval (seconds)
                        <input required min="10" max="86400" type="number" className="input" value={interval} onChange={(e) => setInterval_(e.target.value)} />
                    </label>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                        {loading ? 'Creating…' : 'Create endpoint'}
                    </button>
                </form>
            </div>
        </div>
    );
}
