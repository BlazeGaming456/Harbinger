import MarketingNavbar from '@/components/marketing/Navbar.jsx';
import MarketingFooter from '@/components/marketing/Footer.jsx';

export default function MarketingLayout({ children }) {
    return (
        <div className="marketing-shell">
            <MarketingNavbar />
            {children}
            <MarketingFooter />
        </div>
    );
}
