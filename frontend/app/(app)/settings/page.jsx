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
    <div style={{ maxWidth: 520 }}>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Manage your account.</p>
      </header>

      <div className="card" style={{ marginBottom: 20, padding: '20px 22px' }}>
        <p className="stat-label">Account email</p>
        <p style={{ fontSize: 14, margin: 0 }}>{user?.email ?? '—'}</p>
      </div>

      <div className="card danger-zone" style={{ padding: '20px 22px' }}>
        <h2 className="danger-title">Delete account</h2>
        <p className="page-desc" style={{ marginBottom: 20 }}>
          Permanently deletes your account, all endpoints, probe history, and incidents. This cannot be undone.
        </p>

        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger">
            Delete my account
          </button>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Type <span className="mono" style={{ color: 'var(--rose)' }}>delete</span> to confirm.
            </p>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="delete" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" disabled={confirmText !== 'delete'} onClick={handleDelete} className="btn btn-danger-solid">
                Confirm delete
              </button>
              <button type="button" onClick={() => { setConfirming(false); setConfirmText(''); }} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
