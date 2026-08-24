'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext.jsx';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="auth-card">
            <div className="auth-kicker">Welcome back</div>
            <h1>Sign in</h1>
            <p className="auth-description">Keep a clear signal on every endpoint you own.</p>
            <form onSubmit={handleSubmit} className="auth-form">
                <label className="label">Email<input required type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                <label className="label">Password<input required type="password" className="input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><span>No account? <Link href="/signup">Create one</Link></span></div>
        </section>
    );
}
