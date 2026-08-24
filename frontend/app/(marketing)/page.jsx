import Link from 'next/link';
import { Activity, BarChart3, Bell, Shield } from 'lucide-react';

const FEATURES = [
  {
    icon: Activity,
    accent: 'cyan',
    title: 'Continuous probing',
    desc: 'A scheduler enqueues checks on your interval. Workers probe each URL and record status, latency, and errors.',
  },
  {
    icon: BarChart3,
    accent: 'violet',
    title: 'Health scoring',
    desc: 'Scores combine p95 latency, error rate, and timeouts so you spot degradation before a full outage.',
  },
  {
    icon: Shield,
    accent: 'emerald',
    title: 'Real-time dashboard',
    desc: 'Live charts, probe history, and per-endpoint stats — refreshed automatically every 10 seconds.',
  },
  {
    icon: Bell,
    accent: 'rose',
    title: 'Incident detection',
    desc: 'When scores cross thresholds, Harbinger opens incidents and can alert you the moment something breaks.',
  },
];

const STEPS = [
  { num: '01', title: 'Add an endpoint', desc: 'Paste any URL — API, website, or service. Set how often you want it checked.' },
  { num: '02', title: 'Probes run automatically', desc: 'The scheduler and worker pipeline handle checks, store results, and compute scores.' },
  { num: '03', title: 'Watch health in real time', desc: 'Your dashboard shows status, latency trends, and a countdown to the next probe.' },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="pulse" aria-hidden="true" />
            Uptime monitoring
          </div>
          <h1>
            Know the moment
            <br />
            <span className="text-gradient">something breaks.</span>
          </h1>
          <p className="hero-lead">
            Harbinger monitors your endpoints, detects degradation before full outages,
            and gives you a clear signal when it matters.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary">Get started free</Link>
            <Link href="/login" className="btn btn-secondary">Open dashboard</Link>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="preview-bar">
            <span>harbinger / overview</span>
            <span className="badge badge-live">● live</span>
          </div>
          <div className="preview-body">
            <div className="preview-stats">
              <div className="preview-stat">
                <div className="preview-stat-label">Healthy</div>
                <div className="preview-stat-value" style={{ color: 'var(--healthy)' }}>4</div>
              </div>
              <div className="preview-stat">
                <div className="preview-stat-label">Degraded</div>
                <div className="preview-stat-value" style={{ color: 'var(--degraded)' }}>1</div>
              </div>
              <div className="preview-stat">
                <div className="preview-stat-label">Down</div>
                <div className="preview-stat-value" style={{ color: 'var(--down)' }}>0</div>
              </div>
            </div>
            <div className="preview-rows">
              <div className="preview-row">
                <span>api.yourapp.com/health</span>
                <span className="mono" style={{ color: 'var(--healthy)' }}>0.04</span>
              </div>
              <div className="preview-row">
                <span>cdn.example.com</span>
                <span className="mono" style={{ color: 'var(--healthy)' }}>0.12</span>
              </div>
              <div className="preview-row">
                <span>payments.service.io</span>
                <span className="mono" style={{ color: 'var(--degraded)' }}>0.51</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <p className="section-label">Features</p>
          <h2>Everything you need to stay ahead of outages</h2>
          <p className="section-lead">
            Built for developers who want reliable monitoring without the complexity of enterprise tooling.
          </p>
          <div className="feature-grid stagger">
            {FEATURES.map(({ icon: Icon, accent, title, desc }) => (
              <div key={title} className={`feature-card accent-${accent}`}>
                <div className={`feature-icon ${accent}`}><Icon size={18} strokeWidth={1.5} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <p className="section-label">How it works</p>
          <h2>Up and running in minutes</h2>
          <p className="section-lead">No agents to install. Just add a URL and Harbinger handles the rest.</p>
          <div className="steps stagger">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="step">
                <div className="step-num">{num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Start monitoring in <span className="text-gradient">seconds</span></h2>
        <p>Create a free account, add your first endpoint, and see live health data immediately.</p>
        <Link href="/signup" className="btn btn-primary">Create your account</Link>
      </section>

      <footer className="marketing-footer">Harbinger — precision monitoring for modern systems</footer>
    </>
  );
}
