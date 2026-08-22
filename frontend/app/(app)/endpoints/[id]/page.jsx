'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import client from '@/lib/client.js';
import LatencyChart from '@/components/LatencyChart.js';
import ProbeHistory from '@/components/ProbeHistory.js';

export default function EndpointDetailPage() {
    const { id } = useParams();
    const [health, setHealth] = useState(null);
    const [probes, setProbes] = useState([]);

    useEffect(() => {
        async function load() {
            const [healthRes, probesRes] = await Promise.all([
                client.get(`/health/${id}`),
                client.get(`/endpoints/${id}/probe`),
            ]);
            setHealth(healthRes.data);
            setProbes(probesRes.data);
        }

        load();

        //The variable stores the counter and the load function is continuosly executed every 10 seconds.
        const interval = setInterval()

        //Interval cleanup after the user has moved to an endpoint with a different id.
        return () => clearInterval(interval);
    }, [id]);

    if (!health) return null

    return (
        <div className="space-y-6">
            <div className="flex items-baseline gap-4">
                <h1 className="text-2xl font-semibold">Endpoint detail</h1>
                <span className="text-zinc-500 text-sm font-mono">{health.source === 'cache' ? 'cached' : 'live'}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Score" value = {health.score?.toFixed(2) ?? '-'} />
                <StatCard label="p95 latency" value={`${health.p95_latency_ms ?? '-'} ms`} />
                <StatCard label="Error rate" value={`((health.error_rate ?? 0) * 100).toFixed(0)%`} />
            </div>

            <LatencyChart probes={probes} />
            <ProbeHistory probes={probes} />
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className="text-2xl font-mono">{value}</p>
        </div>
    );
}