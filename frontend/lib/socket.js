'use client';

export function createSocket(accessToken, onMessage) {
    let socket;
    let reconnectDelay = 1000;
    let manuallyClosed = false;

    function connect() {
        if (manuallyClosed) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const wsUrl = apiUrl.replace(/^http/, 'ws');

        socket = new WebSocket(
            `${wsUrl}/ws?token=${encodeURIComponent(accessToken)}`
        );

        socket.onopen = () => {
            console.log('WebSocket connected');

            //Connection worked, so reset backoff
            reconnectDelay = 1000;
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                onMessage(data);
            } catch (error) {
                console.error(
                    `Invalid WebSocket message`,
                    error
                );
            }
        };

        socket.onclose = () => {
            if (manuallyClosed) return;

            console.log(`WebSocket disconnected. Reconnecting in ${reconnectDelay}ms`);

            setTimeout(connect, reconnectDelay);

            reconnectDelay = Math.min(
                reconnectDelay*2,
                30000
            );
        };

        socket.onerror = (error) => {
            console.error(
                'WebSocket error',
                error
            );
        };
    }

    connect();

    return {
        close() {
            manuallyClosed = true;

            if (socket) {
                socket.close();
            }
        }
    };
}