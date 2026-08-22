'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import client, { setAccessToken } from '@/lib/client';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  async function handleDelete() {
    await client.delete('/users/me');
    setAccessToken(null);
    router.push('/');
  }

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-500 text-xs mb-1">Account email</p>
        <p className="text-sm">{user?.email}</p>
      </div>

      <div className="bg-zinc-900 border border-red-900/50 rounded-xl p-5">
        <h2 className="text-red-400 font-medium mb-1">Delete account</h2>
        <p className="text-zinc-500 text-sm mb-4">
          This permanently deletes your account and every endpoint, probe history, and incident associated with it. This cannot be undone.
        </p>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-sm bg-red-500/10 text-red-400 border border-red-900/50 rounded-lg px-4 py-2 hover:bg-red-500/20">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Type <span className="font-mono text-zinc-200">delete</span> to confirm.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button disabled={confirmText !== 'delete'} onClick={handleDelete}
                className="text-sm bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 rounded-lg px-4 py-2">
                Confirm delete
              </button>
              <button onClick={() => { setConfirming(false); setConfirmText(''); }} className="text-sm text-zinc-400 px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}