'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import client from '@/lib/client.js';

export default function DashboardPage() {
    const [endpoints, setEndpoints] = useState([]);

    useEffect(() => {
        client.get('/endpoints').then(({ data }) => setEndpoints(data.data));
    }, []);

    const total = endpoints.length;
    const healthy = endpoints.filter((e) => (e.score ?? 0) < 0.3).length;
    const degraded = endpoints.filter((e) => (e.score ?? 0) >= 0.3 && (e.score ?? 0) < 0.7).length;
    const down = endpoints.filter((e) => (e.score ?? 0) >= 0.7).length;

    return (
        <div>
            <h1>Overview</h1>
            <div>
                <StatCard label="Total Endpoints" value={total} />
                <StatCard label="Healthy" value={healthy} color="text-emerald-400" />
                <StatCard label="Degraded" value={degraded} color="text-amber-400" />
                <StatCard label="Down" value={down} color="text-red-400" />
            </div>
            <div>
                {endpoints.slice(0,5).map((ep) => (
                    <Link key={ep.id} href={`/endpoints/${ep.id}`}
                        className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm hover:border-zinc-700">
                        <span>{ep.url}</span>
                        <span className="text-zinc-500 font-mono">{ep.score?.toFixed(2) ?? '-'}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value, color = 'text-zinc-100' }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-2xl font-mono ${color}`}>{value}</p>
        </div>
    );
}