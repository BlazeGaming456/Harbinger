'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import client from '@/lib/client.js';

export default function ResetPasswordPage() {
    const [token] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token') || '');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);
        try {
            const { data } = await client.post('/auth/reset-password', { token, password });
            setMessage(data.message);
            setTimeout(() => router.push('/login'), 900);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to reset your password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="auth-card">
            <div className="auth-kicker">New credentials</div>
            <h1>Choose a new password</h1>
            <p className="auth-description">Use at least eight characters. You&apos;ll be redirected to sign in when done.</p>
            <form onSubmit={handleSubmit} className="auth-form">
                <label className="label">New password<input required minLength={8} type="password" className="input" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                {message && <p className="form-success" role="status">{message}</p>}
                <button type="submit" className="auth-submit" disabled={loading || !token}>{loading ? 'Updating…' : 'Update password'}</button>
            </form>
            <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
        </section>
    );
}