'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import client from '@/lib/client.js';

export default function DeleteEndpointButton({ id, onDeleted, label = 'Delete' }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirming) {
            setConfirming(true);
            setError(null);
            return;
        }

        setLoading(true);
        try {
            await client.delete(`/endpoints/${id}`);
            onDeleted?.();
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Could not delete.');
            setConfirming(false);
        } finally {
            setLoading(false);
        }
    }

    function handleCancel(e) {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(false);
        setError(null);
    }

    if (confirming) {
        return (
            <div className="delete-confirm-inline" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="btn btn-danger-solid btn-sm"
                    onClick={handleClick}
                    disabled={loading}
                >
                    {loading ? 'Deleting…' : 'Confirm'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={loading}>
                    Cancel
                </button>
                {error && <span className="delete-error">{error}</span>}
            </div>
        );
    }

    return (
        <button
            type="button"
            className="btn-icon-danger"
            onClick={handleClick}
            aria-label={`${label} endpoint`}
            title={label}
        >
            <Trash2 size={15} strokeWidth={1.75} />
        </button>
    );
}
