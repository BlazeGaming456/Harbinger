import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="max-w-3xl mx-auto px-8 py-32 text-center">
            <h1 className="text-4xl font-semibold mb-4">Know the moment something breaks.</h1>
            <p className="text-zinc-400 mb-8">
                Harbinger monitors your endpoints, detects degredation before full outages, and alerts you the moment it matters.
            </p>
            <Link href="/signup" className="inline-block bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-lg px-6 py-3">
                Get started
            </Link>
        </div>
    );
}