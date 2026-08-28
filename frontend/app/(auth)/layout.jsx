import Link from 'next/link';
import Logo from '@/components/Logo.jsx';

export default function AuthLayout({ children }) {
    return (
        <div className="auth-shell-wrap">
            <main className="auth-shell">
                <div className="auth-noise" aria-hidden="true" />
                <Link href="/" className="auth-brand">
                    <Logo size={30} interactive />
                </Link>
                <div className="auth-content">{children}</div>
            </main>
        </div>
    );
}
