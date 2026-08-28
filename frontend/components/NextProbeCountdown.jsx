'use client';
import { useEffect, useRef, useState } from 'react';

export default function NextProbeCountdown({ nextProbeAt, onExpire }) {
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [probing, setProbing] = useState(false);
    const firedRef = useRef(false);

    useEffect(() => {
        firedRef.current = false;
        setProbing(false);

        if (!nextProbeAt) return;

        function tick() {
            const diff = Math.ceil((new Date(nextProbeAt).getTime() - Date.now()) / 1000);

            if (diff <= 0) {
                setSecondsLeft(0);
                if (!firedRef.current) {
                    firedRef.current = true;
                    setProbing(true);
                    onExpire?.();
                }
            } else {
                setSecondsLeft(diff);
                setProbing(false);
            }
        }

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [nextProbeAt, onExpire]);

    if (secondsLeft === null) return null;

    if (probing) {
        return <span className="endpoint-meta countdown probing">Probing now…</span>;
    }

    return (
        <span className="endpoint-meta countdown">
            Next probe in {secondsLeft}s
        </span>
    );
}
