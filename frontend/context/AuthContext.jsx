'use client';
import { createContext, useContext, useState } from 'react';
import client, { setAccessToken } from '@/lib/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    async function login(email, password) {
        const { data } = await client.post('/auth/login', { email, password });
        setAccessToken(data.accessToken);
        setUser({ email });
    }

    async function logout() {
        await client.post('/auth/logout');
        setAccessToken(null);
        setUser(null);
    }

    return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);