'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Activity, BarChart3, Bell, Shield, ArrowRight } from 'lucide-react';
import { LogoMark } from '@/components/Logo.jsx';

const FEATURES = [
    { icon: Activity, accent: 'cyan', title: 'Continuous probing', desc: 'Scheduler + workers probe on your interval and record latency, status codes, and errors.' },
    { icon: BarChart3, accent: 'violet', title: 'Health scoring', desc: 'p95 latency, error rate, and timeouts roll into a single degradation score.' },
    { icon: Shield, accent: 'emerald', title: 'Live dashboard', desc: 'Charts and probe history refresh automatically — no manual reload needed.' },
    { icon: Bell, accent: 'rose', title: 'Email alerts', desc: 'When a score crosses the threshold, Harbinger emails you immediately.' },
];

const STEPS = [
    { num: '01', title: 'Add an endpoint', desc: 'Paste any URL and set your check interval.' },
    { num: '02', title: 'Probes run automatically', desc: 'The pipeline stores results and computes health scores.' },
    { num: '03', title: 'Get alerted', desc: 'Watch live data and receive email when something degrades.' },
];

const fade = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: (i = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 120, delay: i * 0.08 } }),
};

export default function HomeContent() {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    
    const y1 = useTransform(scrollYProgress, [0, 1], [0, 250]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -180]);
    const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { damping: 20, stiffness: 100 });
    const smoothY = useSpring(mouseY, { damping: 20, stiffness: 100 });

    const handleMouseMove = (e) => {
        if (typeof window !== 'undefined') {
            mouseX.set((e.clientX / window.innerWidth) - 0.5);
            mouseY.set((e.clientY / window.innerHeight) - 0.5);
        }
    };

    const orb1X = useTransform(smoothX, [-0.5, 0.5], [-120, 120]);
    const orb2X = useTransform(smoothX, [-0.5, 0.5], [150, -150]);
    const rotateX = useTransform(smoothY, [-0.5, 0.5], [15, -15]);
    const rotateY = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);

    return (
        <>
            <section className="hero" ref={heroRef} onMouseMove={handleMouseMove}>
                <div className="hero-grid" aria-hidden="true" />
                <motion.div className="hero-glow" style={{ opacity: glowOpacity }} aria-hidden="true" />
                <div className="hero-orbs" aria-hidden="true">
                    <motion.span className="orb orb-cyan" style={{ y: y1, x: orb1X }} />
                    <motion.span className="orb orb-violet" style={{ y: y2, x: orb2X }} />
                </div>

                <motion.div className="hero-inner" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
                    <motion.div className="hero-logo" variants={fade}>
                        <LogoMark size={52} />
                    </motion.div>
                    <motion.div className="hero-eyebrow" variants={fade}>
                        <span className="pulse" /> Live endpoint intelligence
                    </motion.div>
                    <motion.h1 variants={fade}>
                        Know the moment
                        <br />
                        <span className="text-gradient">something breaks.</span>
                    </motion.h1>
                    <motion.p className="hero-lead" variants={fade}>
                        Harbinger monitors your URLs, detects degradation before outages,
                        and sends email alerts when health scores spike.
                    </motion.p>
                    <motion.div className="hero-actions" variants={fade}>
                        <Link href="/signup" className="btn btn-primary">
                            Start monitoring <ArrowRight size={16} />
                        </Link>
                        <Link href="/login" className="btn btn-secondary">Open dashboard</Link>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="hero-preview"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 100, delay: 0.35 } }}
                    whileHover={{ 
                        scale: 1.02, 
                        boxShadow: '0 32px 90px rgba(34, 211, 238, 0.15)',
                        transition: { duration: 0.4, ease: "easeOut" }
                    }}
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d", transformPerspective: 1000 }}
                >
                    <div className="preview-bar">
                        <span>harbinger / overview</span>
                        <span className="badge badge-live">● live</span>
                    </div>
                    <div className="preview-body">
                        <div className="preview-stats">
                            {[
                                { label: 'Healthy', value: '4', color: 'var(--healthy)' },
                                { label: 'Degraded', value: '1', color: 'var(--degraded)' },
                                { label: 'Down', value: '0', color: 'var(--down)' },
                            ].map((s) => (
                                <motion.div key={s.label} className="preview-stat" whileHover={{ scale: 1.02 }}>
                                    <div className="preview-stat-label">{s.label}</div>
                                    <div className="preview-stat-value" style={{ color: s.color }}>{s.value}</div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="preview-rows">
                            {[
                                ['api.yourapp.com/health', '0.04', 'var(--healthy)'],
                                ['cdn.example.com', '0.12', 'var(--healthy)'],
                                ['payments.service.io', '0.51', 'var(--degraded)'],
                            ].map(([url, score, color]) => (
                                <div key={url} className="preview-row">
                                    <span>{url}</span>
                                    <span className="mono" style={{ color }}>{score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </section>

            <section id="features" className="section">
                <div className="section-inner">
                    <motion.p className="section-label" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>Features</motion.p>
                    <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
                        Built for teams who care about uptime
                    </motion.h2>
                    <motion.p className="section-lead" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
                        Probe scheduling, scoring workers, and alert delivery — wired together out of the box.
                    </motion.p>
                    <div className="feature-grid">
                        {FEATURES.map(({ icon: Icon, accent, title, desc }, i) => (
                            <motion.div
                                key={title}
                                className={`feature-card accent-${accent}`}
                                custom={i}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-40px' }}
                                variants={fade}
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            >
                                <div className={`feature-icon ${accent}`}><Icon size={18} strokeWidth={1.5} /></div>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="section section-steps">
                <div className="section-inner">
                    <motion.p className="section-label" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>How it works</motion.p>
                    <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>Three steps to full visibility</motion.h2>
                    <motion.p className="section-lead section-lead-center" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
                        From URL to live health data and alerts — no agents, no config files.
                    </motion.p>
                    <div className="steps-grid">
                        {STEPS.map(({ num, title, desc }, i) => (
                            <motion.article
                                key={num}
                                className="step-card"
                                custom={i}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-40px' }}
                                variants={fade}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                            >
                                <div className="step-card-top">
                                    <span className="step-card-num">{num}</span>
                                    <span className="step-connector" aria-hidden="true" />
                                </div>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cta-section">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
                    <h2>Start monitoring in <span className="text-gradient">seconds</span></h2>
                    <p>Add your first endpoint and get live health data plus email alerts.</p>
                    <Link href="/signup" className="btn btn-primary">Create free account</Link>
                </motion.div>
            </section>
        </>
    );
}
