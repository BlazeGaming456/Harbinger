import Link from 'next/link';

export default function AuthLayout({ children }) {
    return (
        <main className="auth-shell">
            <div className="auth-noise" aria-hidden="true" />
            <Link href="/" className="auth-brand">
                <span className="brand-symbol">H</span>
                Harbinger
            </Link>
            <div className="auth-content">{children}</div>
            <p className="auth-footer">Precision monitoring for modern systems</p>
        </main>
    );
}
