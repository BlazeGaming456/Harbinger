'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Radio, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.js';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/endpoints', label: 'Endpoints', icon: Radio },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();
    const router = useRouter();

    async function handleLogout() {
        await logout();
        router.push('/');
    }

    return (
        <aside className="w-56 min-h-screen border-r border-zinc-800 flex flex-col p-4">
            <div className="font-semibold px-2 mb-8">
                Harbinger
            </div>
            <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    
                    return (
                        <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
                            <Icon size={16}/> {label}
                        </Link>
                    );
                })}
            </nav>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200">
                <LogOut size={16}/> Log out
            </button>
        </aside>
    );
}