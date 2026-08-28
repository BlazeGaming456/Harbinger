'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo.jsx';



export default function MarketingFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <div className="site-footer-grid">
                    <motion.div
                        className="site-footer-brand-col"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <Link href="/" className="site-footer-brand-link">
                            <Logo size={32} textClassName="site-footer-brand-text" interactive />
                        </Link>
                        <p className="site-footer-tagline">
                            Know the moment something breaks. Continuous endpoint monitoring,
                            health scoring, and email alerts — built for developers.
                        </p>
                        <a
                            href="https://github.com/BlazeGaming456"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="site-footer-social"
                        >
                            GitHub · @BlazeGaming456
                        </a>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        viewport={{ once: true }}
                    >
                        <h4 className="site-footer-heading">Product</h4>
                        <ul className="site-footer-links">
                            <li><Link href="/#features">Features</Link></li>
                            <li><Link href="/#how-it-works">How it works</Link></li>
                            <li><Link href="/signup">Sign up</Link></li>
                            <li><Link href="/login">Log in</Link></li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        viewport={{ once: true }}
                    >
                        <h4 className="site-footer-heading">Connect</h4>
                        <ul className="site-footer-links">
                            <li><a href="https://github.com/BlazeGaming456/Harbinger" target="_blank" rel="noopener noreferrer">Repository</a></li>
                            <li><a href="https://github.com/BlazeGaming456/Harbinger/issues" target="_blank" rel="noopener noreferrer">Report an issue</a></li>
                        </ul>
                    </motion.div>
                </div>

                <motion.div
                    className="site-footer-bottom"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    <p>© {new Date().getFullYear()} Harbinger — built by <a href="https://github.com/BlazeGaming456" target="_blank" rel="noopener noreferrer">BlazeGaming456</a></p>
                </motion.div>
            </div>
        </footer>
    );
}
