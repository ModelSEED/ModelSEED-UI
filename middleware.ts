import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Redirect legacy /run/* routes to /plant
    if (pathname === '/run' || pathname.startsWith('/run/')) {
        return NextResponse.redirect(new URL('/plant', request.url));
    }

    // Redirect /biochem/:chem to /biochem/compounds (for now, could add search later)
    if (pathname.match(/^\/biochem\/[^\/]+$/) && !pathname.includes('/compounds') && !pathname.includes('/reactions')) {
        return NextResponse.redirect(new URL('/biochem/compounds', request.url));
    }

    // Redirect /model-editor to /my-models
    if (pathname === '/model-editor' || pathname === '/model-editor/') {
        return NextResponse.redirect(new URL('/my-models', request.url));
    }

    // Redirect /plant-annotations to /genomes/Annotations
    if (pathname === '/plant-annotations' || pathname === '/plant-annotations/') {
        return NextResponse.redirect(new URL('/genomes/Annotations', request.url));
    }

    // Redirect legacy /maps routes to /compare (or could create a maps page)
    if (pathname === '/maps' || pathname.startsWith('/maps/')) {
        return NextResponse.redirect(new URL('/compare', request.url));
    }

    // Redirect utility routes to appropriate pages
    if (pathname === '/user-status') {
        // Could redirect to a user profile page or home
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect /proto (prototype) to home
    if (pathname === '/proto') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/run/:path*',
        '/biochem/:path*',
        '/model-editor/:path*',
        '/plant-annotations/:path*',
        '/maps/:path*',
        '/user-status',
        '/proto',
    ],
};
