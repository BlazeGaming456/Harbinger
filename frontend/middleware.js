import { NextResponse } from 'next/server';

export function middleware(request) {
    const refreshToken = request.cookies.get('refreshToken');
    const path = request.nextUrl.pathname;
    const isAuthPage = path === '/login' || path === '/signup' || path === '/forgot-password' || path === '/reset-password';
    const isProtected = path.startsWith('/dashboard') || path.startsWith('/endpoints') || path.startsWith('/settings');

    if (!refreshToken && isProtected) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    if (refreshToken && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/endpoints/:path*', '/settings/:path*', '/login', '/signup', '/forgot-password', '/reset-password'],
};
