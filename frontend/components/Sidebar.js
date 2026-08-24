'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Radio, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
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
    <>
      <aside className="sidebar">
        <Link href="/dashboard" className="sidebar-brand">
          <span className="sidebar-logo">H</span>
          Harbinger
        </Link>

        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${pathname.startsWith(href) ? ' active' : ''}`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer' }}>
            <LogOut size={16} strokeWidth={1.5} />
            Log out
          </button>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-link${pathname.startsWith(href) ? ' active' : ''}`}
          >
            <Icon size={20} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
