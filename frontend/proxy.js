import { NextResponse } from 'next/server';

export function proxy() {
    // Refresh cookies live on the API host (Render), not on Vercel.
    // Auth is enforced client-side via AuthContext after /auth/refresh.
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/endpoints/:path*', '/settings/:path*', '/login', '/signup', '/forgot-password', '/reset-password'],
};
