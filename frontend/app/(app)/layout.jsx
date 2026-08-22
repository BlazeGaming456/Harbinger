import Sidebar from '@/components/Sidebar.js';

export default function AppLayout({ children }) {
    return (
        <div className="flex">
            <Sidebar/>
            <main className="flex-1 p-8">{children}</main>
        </div>
    );
}