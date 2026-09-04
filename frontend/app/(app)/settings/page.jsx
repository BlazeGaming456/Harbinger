'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Webhook, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import client from '@/lib/client';
import { useAuth } from '@/context/AuthContext';

const fade = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Multi-channel alert state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [alertTarget, setAlertTarget] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertSaveMessage, setAlertSaveMessage] = useState(null);

  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    client
      .get('/users/me')
      .then(({ data }) => {
        if (data) {
          setEmailEnabled(data.email_alerts_enabled ?? true);
          setWebhookEnabled(data.webhook_alerts_enabled ?? false);
          setAlertTarget(data.alert_target || data.email || '');
          setWebhookUrl(data.webhook_url || '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveAlerts(e) {
    e.preventDefault();
    setSavingAlerts(true);
    setAlertSaveMessage(null);
    try {
      const { data } = await client.patch('/users/me', {
        email_alerts_enabled: emailEnabled,
        webhook_alerts_enabled: webhookEnabled,
        alert_target: alertTarget,
        webhook_url: webhookUrl,
      });
      if (data) {
        setEmailEnabled(data.email_alerts_enabled);
        setWebhookEnabled(data.webhook_alerts_enabled);
        setAlertTarget(data.alert_target || '');
        setWebhookUrl(data.webhook_url || '');
        setAlertSaveMessage({
          type: 'success',
          text: 'Alert destinations updated successfully!'
        });
      }
    } catch {
      setAlertSaveMessage({
        type: 'error',
        text: 'Failed to update alert preferences. Please check inputs and try again.'
      });
    } finally {
      setSavingAlerts(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await client.delete('/users/me');
      await logout();
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
    <motion.div
      className="app-page settings-page"
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      <motion.header className="page-header" variants={fade}>
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">
          Manage your account profile and incident notification destinations.
        </p>
      </motion.header>

      {/* Account Info Card */}
      <motion.div className="card app-panel settings-card" variants={fade}>
        <div className="flex items-center justify-between">
          <div>
            <p className="stat-label">Account Email</p>
            <p className="settings-email font-mono font-medium">{user?.email ?? '—'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            <ShieldCheck size={14} /> Active
          </div>
        </div>
      </motion.div>

      {/* Multi-Channel Alert Destinations Card */}
      <motion.div className="card app-panel settings-card" variants={fade}>
        <div className="settings-section-header">
          <h2 className="settings-section-title">Alert Destinations</h2>
          <p className="settings-section-desc">
            Choose where Harbinger delivers instant incident notifications when an endpoint degrades. You can activate multiple alert channels simultaneously.
          </p>
        </div>

        <form onSubmit={handleSaveAlerts}>
          <div className="alert-channels-group">
            {/* Channel 1: Email Notifications */}
            <div className={`alert-channel-card ${emailEnabled ? 'active' : ''}`}>
              <div
                className="alert-channel-header"
                onClick={() => setEmailEnabled((prev) => !prev)}
              >
                <div className="alert-channel-info">
                  <div className="alert-channel-icon">
                    <Mail size={19} />
                  </div>
                  <div>
                    <div className="alert-channel-title">Email Delivery</div>
                    <div className="alert-channel-subtitle">Send incident summary emails directly to your inbox</div>
                  </div>
                </div>
                <div className={`channel-switch ${emailEnabled ? 'on' : ''}`}>
                  <div className="channel-switch-handle" />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {emailEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="alert-channel-content">
                      <label className="alert-input-label">Destination Email Address</label>
                      <input
                        type="email"
                        className="input w-full"
                        placeholder={user?.email || 'alerts@example.com'}
                        value={alertTarget}
                        onChange={(e) => setAlertTarget(e.target.value)}
                        required={emailEnabled}
                      />
                      <p className="alert-input-hint">
                        Alert notifications will be sent to this email address whenever an endpoint triggers an incident.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Channel 2: Webhook & Slack Integration */}
            <div className={`alert-channel-card ${webhookEnabled ? 'active' : ''}`}>
              <div
                className="alert-channel-header"
                onClick={() => setWebhookEnabled((prev) => !prev)}
              >
                <div className="alert-channel-info">
                  <div className="alert-channel-icon">
                    <Webhook size={19} />
                  </div>
                  <div>
                    <div className="alert-channel-title">Webhook & Slack Integration</div>
                    <div className="alert-channel-subtitle">Post automated incident payloads to Slack, Discord, or Webhook receivers</div>
                  </div>
                </div>
                <div className={`channel-switch ${webhookEnabled ? 'on' : ''}`}>
                  <div className="channel-switch-handle" />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {webhookEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="alert-channel-content">
                      <label className="alert-input-label">Webhook Endpoint URL</label>
                      <input
                        type="url"
                        className="input w-full mono text-xs"
                        placeholder="https://hooks.slack.com/services/T000/B000/XXXXXX"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        required={webhookEnabled}
                      />
                      <p className="alert-input-hint">
                        Paste a <strong>Slack Incoming Webhook URL</strong> (<code className="mono text-cyan">hooks.slack.com</code>), a <strong>Discord Webhook URL</strong>, or any HTTP POST endpoint.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {alertSaveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`alert-save-feedback ${alertSaveMessage.type}`}
            >
              {alertSaveMessage.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {alertSaveMessage.text}
            </motion.div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingAlerts}
          >
            {savingAlerts ? 'Saving Changes…' : 'Save Alert Channels'}
          </button>
        </form>
      </motion.div>

      {/* Delete Account Card */}
      <motion.div
        className="card danger-zone app-panel settings-danger"
        variants={fade}
      >
        <h2 className="danger-title">Delete Account</h2>
        <p className="page-desc settings-danger-desc">
          Permanently deletes your account, all configured endpoints, probe history, and incident data. This action cannot be undone.
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
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="btn btn-danger"
              >
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
                Type{' '}
                <span className="mono settings-delete-keyword">delete</span> to
                confirm.
              </p>
              <input
                className="input mb-3"
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
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-ghost"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}