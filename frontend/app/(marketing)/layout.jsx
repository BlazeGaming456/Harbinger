import Link from 'next/link';

export default function MarketingLayout({ children }) {
    return (
        <div>
            <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
                <span className="font-semibold">Harbinger</span>
                <div className="flex gap-3">
                    <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5">Log in</Link>
                    <Link href="/signup" className="text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-lg px-3 py-1.5">Sign up</Link>
                </div>
            </nav>
            {children}
        </div>
    );
}