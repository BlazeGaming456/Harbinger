'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo.jsx';

export default function MarketingNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    return (
        <header className={`site-nav${scrolled ? ' scrolled' : ''}`}>
            <div className="site-nav-inner">
                <Link href="/" className="site-nav-brand">
                    <Logo size={42} interactive />
                </Link>

                <button
                    type="button"
                    className="site-nav-toggle"
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                >
                    <span /><span /><span />
                </button>

                <nav className={`site-nav-links${menuOpen ? ' open' : ''}`}>
                    <Link href="/#features" onClick={() => setMenuOpen(false)}>Features</Link>
                    <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
                    <Link href="/login" className="site-nav-link-muted" onClick={() => setMenuOpen(false)}>Log in</Link>
                    <Link href="/signup" className="btn btn-nav site-nav-cta" onClick={() => setMenuOpen(false)}>
                        Get started
                    </Link>
                </nav>
            </div>
        </header>
    );
}
