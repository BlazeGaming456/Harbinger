import { NextResponse } from 'next/server';

export function middleware(request) {
    const refreshToken = request.cookies.get('refresh_token');
    const path = request.nextUrl.pathname;
    const isAuthPage = path === '/login' || path === '/signup';
    const isProtected = path.startsWith('/dashboard') || path.startsWith('/endpoints') || path.startsWith('/settings');

    if (!refreshToken && isProtected) return NextResponse.redirect(new URL('/login', request.url));
    if (refreshToken && isAuthPage) return NextResponse.redirect(new URL('/dashboard', request.url));

    return NextResponse.next();
}

//Tells Next.js which routes to run this middleware on
export const config = { matcher: ['/dashboard/:path*', '/endpoints/:path*', '/settings/:path*', '/login', 'signup'] };