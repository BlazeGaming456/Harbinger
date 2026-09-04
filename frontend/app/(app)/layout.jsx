import Sidebar from '@/components/Sidebar.js';

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}