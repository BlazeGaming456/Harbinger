'use client';
import { useEffect, useState } from 'react';

export default function NextProbeCountdown({ nextProbeAt }) {
    const [secondsLeft, setSecondsLeft] = useState(null);

    useEffect(() => {
        if (!nextProbeAt) return;

        function tick() {
            const diff = Math.max(0, Math.ceil((new Date(nextProbeAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(diff);
        }

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [nextProbeAt]);

    if (secondsLeft === null) return null;

    return (
        <span className="endpoint-meta countdown">
            Next probe in {secondsLeft}s
        </span>
    );
}
