import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from '@/context/AuthContext.jsx'
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: "Harbinger",
  description: "Real-time dashboard for your API endpoints!",
  icons: {
    icon: "/Logo.ico",
    shortcut: "/Logo.ico",
    apple: "/Logo.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
    >
      <body className={`${inter.variable} ${mono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
