import Link from 'next/link';

export default function MarketingLayout({ children }) {
  return (
    <div className="marketing-shell">
      <nav className="marketing-nav">
        <Link href="/" className="brand-mark">
          <span className="brand-symbol">H</span>
          Harbinger
        </Link>
        <div className="nav-actions">
          <Link href="/login" className="nav-link">Log in</Link>
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
