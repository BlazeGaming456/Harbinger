'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Radio, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';
import Logo from '@/components/Logo.jsx';

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
        <div className="sidebar-top">
          <Link href="/dashboard" className="sidebar-brand">
            <Logo size={26} textClassName="sidebar-brand-text" interactive />
          </Link>

          <nav className="sidebar-nav" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-item${pathname.startsWith(href) ? ' active' : ''}`}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button type="button" onClick={handleLogout} className="sidebar-item sidebar-item-logout">
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Log out</span>
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
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
