'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Upload, LayoutGrid, Table as TableIcon, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '@/lib/client.js';
import CreateEndpointModal from '@/components/CreateEndpointModal.jsx';
import ImportEndpointsModal from '@/components/ImportEndpointsModal.jsx';
import DeleteEndpointButton from '@/components/DeleteEndpointButton.jsx';
import NextProbeCountdown from '@/components/NextProbeCountdown.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { formatScore, statusClass, statusLabel } from '@/lib/score.js';

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

function EndpointFavicon({ url, name }) {
  const [failed, setFailed] = useState(false);

  function getDomain(urlStr) {
    try {
      const u = new URL(urlStr);
      return u.hostname;
    } catch {
      return (urlStr || '').replace(/^https?:\/\//, '').split('/')[0];
    }
  }

  const host = getDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  const initial = (name || host || 'E').charAt(0).toUpperCase();

  return (
    <div className="endpoint-favicon-box">
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt={host}
          className="endpoint-favicon-img"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="endpoint-favicon-fallback">{initial}</span>
      )}
    </div>
  );
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [error, setError] = useState(null);
  const { ready, authenticated } = useAuth();

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/endpoints');
      setEndpoints(data.data);
      setError(null);
    } catch {
      setError('Could not load endpoints.');
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [ready, authenticated, load]);

  if (!ready)
    return (
      <div className="loading-state">
        <span className="pulse" /> Restoring session…
      </div>
    );
  if (!authenticated)
    return (
      <div className="empty-state">Session expired. Please log in again.</div>
    );

  return (
    <motion.div
      className="app-page"
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      <motion.header className="page-header-row" variants={fade}>
        <div>
          <h1 className="page-title">Endpoints</h1>
          <p className="page-desc">
            {endpoints.length} URL{endpoints.length !== 1 ? 's' : ''} monitored · auto-refreshes every 10s
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> Add endpoint
          </button>
        </div>
      </motion.header>

      {error && (
        <motion.div
          variants={fade}
          className="form-error"
          style={{ marginBottom: 24 }}
        >
          {error}
        </motion.div>
      )}

      {endpoints.length === 0 && !error ? (
        <motion.div variants={fade} className="empty-state app-panel card">
          <p style={{ marginBottom: 16 }}>No endpoints added yet.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-secondary"
          >
            Add your first endpoint
          </button>
        </motion.div>
      ) : (
        <>
          {/* View Switcher Header */}
          <motion.div variants={fade} className="endpoints-toolbar">
            <span className="text-xs text-text-muted font-medium">
              Displaying {endpoints.length} monitored target{endpoints.length !== 1 ? 's' : ''}
            </span>
            <div className="view-switcher">
              <button
                type="button"
                className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={14} /> Cards Grid
              </button>
              <button
                type="button"
                className={`view-switch-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <TableIcon size={14} /> Table
              </button>
            </div>
          </motion.div>

          {/* Grid View Mode */}
          {viewMode === 'grid' ? (
            <motion.div variants={fade} className="endpoints-grid">
              {endpoints.map((ep) => (
                <motion.div
                  key={ep.id}
                  className="endpoint-grid-card"
                  whileHover={{ y: -4 }}
                >
                  <div>
                    {/* Header: Favicon, Name, URL, Status */}
                    <div className="endpoint-grid-header">
                      <div className="endpoint-identity">
                        <EndpointFavicon url={ep.url} name={ep.name} />
                        <div className="endpoint-title-wrap">
                          <Link href={`/endpoints/${ep.id}`}>
                            <h3 className="endpoint-card-title">{ep.name || ep.url}</h3>
                          </Link>
                          <p className="endpoint-card-url-sub">{ep.url}</p>
                        </div>
                      </div>
                      <span className={`status-pill ${statusClass(ep.score)}`}>
                        {statusLabel(ep.score)}
                      </span>
                    </div>

                    {/* Metrics Grid Box */}
                    <div className="endpoint-metrics-grid">
                      <div className="endpoint-metric-box">
                        <span className="endpoint-metric-label">Health Score</span>
                        <span className="endpoint-metric-value">
                          {formatScore(ep.score) ?? '—'}
                        </span>
                      </div>
                      <div className="endpoint-metric-box">
                        <span className="endpoint-metric-label">Interval</span>
                        <span className="endpoint-metric-value">{ep.interval_seconds}s</span>
                      </div>
                      <div className="endpoint-metric-box">
                        <span className="endpoint-metric-label">Next Probe</span>
                        <span className="endpoint-metric-value">
                          <NextProbeCountdown
                            nextProbeAt={ep.next_probe_at}
                            onExpire={load}
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Details Link & Delete Button */}
                  <div className="endpoint-card-footer">
                    <Link href={`/endpoints/${ep.id}`} className="endpoint-view-details-btn">
                      View Analytics <ArrowRight size={14} />
                    </Link>
                    <DeleteEndpointButton id={ep.id} onDeleted={load} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Table View Mode */
            <motion.div
              variants={fade}
              className="endpoint-table-wrap card app-panel"
            >
              <table className="endpoint-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>URL</th>
                    <th>Score</th>
                    <th>Interval</th>
                    <th>Next probe</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep) => (
                    <tr key={ep.id}>
                      <td>
                        <span className={`status-pill ${statusClass(ep.score)}`}>
                          {statusLabel(ep.score)}
                        </span>
                      </td>
                      <td>
                        <Link href={`/endpoints/${ep.id}`}>
                          <span className="table-url">{ep.name || ep.url}</span>
                        </Link>
                      </td>
                      <td className="mono">{formatScore(ep.score) ?? '—'}</td>
                      <td className="mono">{ep.interval_seconds}s</td>
                      <td>
                        <NextProbeCountdown
                          nextProbeAt={ep.next_probe_at}
                          onExpire={load}
                        />
                      </td>
                      <td className="table-actions">
                        <DeleteEndpointButton id={ep.id} onDeleted={load} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}

      <CreateEndpointModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={load}
      />
      <ImportEndpointsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onCreated={load}
      />
    </motion.div>
  );
}
