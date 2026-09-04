'use client';
import { getAccessToken } from '@/lib/client.js';

export function createSocket(initialToken, onMessage) {
    if (typeof window === 'undefined') {
        return { close() {} };
    }

    let socket;
    let reconnectDelay = 1000;
    let manuallyClosed = false;

    function connect() {
        if (manuallyClosed) return;

        const token = getAccessToken() || initialToken;
        if (!token) {
            console.warn('WebSocket connection deferred: No access token available');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const wsUrl = apiUrl.replace(/^http/, 'ws');

        try {
            socket = new WebSocket(
                `${wsUrl}/ws?token=${encodeURIComponent(token)}`
            );

            socket.onopen = () => {
                console.log('WebSocket connected');
                reconnectDelay = 1000;
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (error) {
                    console.error('Invalid WebSocket message', error);
                }
            };

            socket.onclose = (event) => {
                if (manuallyClosed) return;

                // 4008 = Auth failure. Stop infinite reconnect loop on unauthenticated token
                if (event.code === 4008 || event.code === 4001) {
                    console.warn('WebSocket closed due to auth failure (code ' + event.code + '). Stopping reconnect.');
                    return;
                }

                console.log(`WebSocket disconnected. Reconnecting in ${reconnectDelay}ms`);

                setTimeout(() => {
                    if (!manuallyClosed) connect();
                }, reconnectDelay);

                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            };

            socket.onerror = (error) => {
                if (manuallyClosed) return;
                console.warn('WebSocket connection notice:', error?.message || 'Connection interrupted');
            };
        } catch (err) {
            console.warn('Failed to establish WebSocket:', err);
        }
    }

    connect();

    return {
        close() {
            manuallyClosed = true;
            if (socket) {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onclose = null;
                socket.onerror = null;
                try {
                    socket.close();
                } catch {}
            }
        }
    };
}