'use client';
import { useState } from 'react';
import client from '@/lib/client.js';

export default function CreateEndpointModal({ onClose, onCreated }) {
    const [url, setUrl] = useState('');
    const [interval, setInterval_] = useState(60);

    async function handleSubmit(e) {
        e.preventDefault();
        await client.post('/endpoints', { url, interval_seconds: Number(interval)});
        onCreated();
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
                <h2 className="font-medium mb-4">Add endpoint</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" placeholder="Check interval (seconds)" value={interval} onChange={(e) => setInterval_(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"/>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-lg py-2 text-sm">Create</button>
                </form>
            </div>
        </div>
    );
}