'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import client from '@/lib/client.js';

export default function CreateEndpointModal({ open, onClose, onCreated }) {
    const [url, setUrl] = useState('');
    const [interval, setInterval_] = useState(60);
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await client.post('/endpoints', { url, name: name || undefined, interval_seconds: Number(interval) });
            setUrl('');
            setName('');
            setInterval_(60);
            onCreated();
            onClose();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not create this endpoint.');
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (loading) return;
        setUrl('');
        setName('');
        setInterval_(60);
        setError(null);
        onClose();
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                >
                    <motion.div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-endpoint-title"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2 id="add-endpoint-title" className="modal-title">Add endpoint</h2>
                            <button type="button" className="btn-icon-ghost" onClick={handleClose} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <label className="label">
                                Name
                                <input
                                    className="input"
                                    placeholder="Name (optional, e.g. Payments API)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </label>
                            <label className="label">
                                URL
                                <input
                                    required
                                    type="url"
                                    className="input"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    autoFocus
                                />
                            </label>
                            <label className="label">
                                Check interval (seconds)
                                <input
                                    required
                                    min="10"
                                    max="86400"
                                    type="number"
                                    className="input"
                                    value={interval}
                                    onChange={(e) => setInterval_(e.target.value)}
                                />
                            </label>
                            {error && <p className="form-error" role="alert">{error}</p>}
                            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                                {loading ? 'Creating…' : 'Create endpoint'}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
