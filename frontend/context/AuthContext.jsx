'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import client, { refreshAccessToken, setAccessToken } from '@/lib/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        refreshAccessToken()
            .then(() => {
                setUser({});
                setAuthenticated(true);
            })
            .catch(async () => {
                setAccessToken(null);
                setAuthenticated(false);
                try { await client.post('/auth/logout'); } catch {}
            })
            .finally(() => setReady(true));

        const handleUnauthorized = () => {
            setAccessToken(null);
            setUser(null);
            setAuthenticated(false);
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    async function login(email, password) {
        const { data } = await client.post('/auth/login', { email, password });
        setAccessToken(data.accessToken);
        setUser({ email });
        setAuthenticated(true);
        setReady(true);
    }

    async function logout() {
        await client.post('/auth/logout');
        setAccessToken(null);
        setUser(null);
        setAuthenticated(false);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, ready, authenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
