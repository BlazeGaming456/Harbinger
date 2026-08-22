import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from '@/context/AuthContext.js'
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: "Harbinger",
  description: "Real-time dashboard for your API endpoints!",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
    >
      <body className={`${inter.variable} ${mono.variable} bg-zinc-950 text-zinc-100`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
