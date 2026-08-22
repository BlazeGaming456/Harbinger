'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import client from '@/lib/client.js';
import CreateEndpointModal from '@/components/CreateEndpointModal.js';

function statusColor(score) {
    if (score == null) return 'bg-zinc-600';
    if (score < 0.3) return 'bg-emerald-400';
    if (score < 0.7) return 'bg-amber-400';
    return 'bg-red-400';
}

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [showModal, setShowModal] = useState(false);

    async function load() {
        const { data } = await client.get('/endpoints');
        setEndpoints(data.data);
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-semibold">Endpoints</h1>
                <button onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add endpoint
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {endpoints.map((ep) => (
                    <Link key={ep.id} href={`/endpoints/${ep.id}`}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${statusColor(ep.score)}`} />
                            <span className="font-medium truncate">{ep.url}</span>
                        </div>
                        <p className="text-zinc-500 text-xs font-mono">Checks every {ep.interval_seconds}s</p>
                    </Link>
                ))}
            </div>

            {endpoints.length === 0 && (
                <div className="text-center text-zinc-600 mt-20">
                    No endpoints yet - add your first one.
                </div>
            )}

            {showModal && <CreateEndpointModal onClose={() => setShowModal(false)} onCreated={load} />}
        </div>
    );
}