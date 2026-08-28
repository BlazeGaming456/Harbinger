'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import client, { setAccessToken } from '@/lib/client';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await client.delete('/users/me');
      setAccessToken(null);
      router.push('/');
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setConfirmText('');
  }

  return (
    <div className="app-page settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Manage your account.</p>
      </header>

      <div className="card app-panel settings-card">
        <p className="stat-label">Account email</p>
        <p className="settings-email">{user?.email ?? '—'}</p>
      </div>

      <div className="card danger-zone app-panel settings-danger">
        <h2 className="danger-title">Delete account</h2>
        <p className="page-desc settings-danger-desc">
          Permanently deletes your account, all endpoints, probe history, and incidents. This cannot be undone.
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {!confirming ? (
            <motion.div
              key="trigger"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger">
                Delete my account
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              className="settings-delete-confirm"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="settings-delete-hint">
                Type <span className="mono settings-delete-keyword">delete</span> to confirm.
              </p>
              <input
                className="input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                autoFocus
              />
              <div className="settings-delete-actions">
                <button
                  type="button"
                  disabled={confirmText !== 'delete' || deleting}
                  onClick={handleDelete}
                  className="btn btn-danger-solid"
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button type="button" onClick={handleCancel} className="btn btn-ghost" disabled={deleting}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
