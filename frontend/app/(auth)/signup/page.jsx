'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import client from '@/lib/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await client.post('/auth/signup', { email, password });
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Could not create account — email may already be in use.');
    }
  }

  return (
    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8">
      <h1 className="text-xl font-semibold mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-lg py-2 text-sm">Sign up</button>
      </form>
      <p className="text-zinc-500 text-sm mt-4">
        Already have an account? <Link href="/login" className="text-emerald-400">Log in</Link>
      </p>
    </div>
  );
}