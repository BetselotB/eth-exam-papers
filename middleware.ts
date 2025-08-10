import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Skip middleware for auth callback to avoid redirect loops
  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    console.log('Middleware: Skipping auth callback route')
    return res
  }
  
  // Create Supabase client for middleware
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get session from Supabase cookies - check multiple possible cookie names
  const supabaseAccessToken = req.cookies.get('sb-access-token')?.value
  const supabaseRefreshToken = req.cookies.get('sb-refresh-token')?.value
  
  // Also check for the newer cookie format
  const authToken = req.cookies.get('sb-auth-token')?.value
  
  // Check for the standard Supabase cookie format
  const supabaseCookie = req.cookies.get('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/^https?:\/\//, '').replace(/\./g, '_'))?.value
  
  console.log('Middleware: Checking cookies for route:', req.nextUrl.pathname)
  console.log('Middleware: Access token:', !!supabaseAccessToken)
  console.log('Middleware: Auth token:', !!authToken)
  console.log('Middleware: Supabase cookie:', !!supabaseCookie)
  
  let session = null
  
  if (supabaseAccessToken || authToken || supabaseCookie) {
    try {
      const token = supabaseAccessToken || authToken || supabaseCookie
      const { data: { user }, error } = await supabase.auth.getUser(token!)
      if (user && !error) {
        session = { user }
        console.log('Middleware: User authenticated:', user.email)
      } else {
        console.log('Middleware: Token validation failed:', error)
      }
    } catch (error) {
      console.log('Middleware: Token validation error:', error)
    }
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Auth routes that should redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !session) {
    console.log('Middleware: Redirecting to login - no session for protected route')
    // Redirect to login if trying to access protected route without auth
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthRoute && session) {
    console.log('Middleware: Redirecting to dashboard - user already authenticated')
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  console.log('Middleware: Allowing access to:', req.nextUrl.pathname)
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     * - auth callback (explicitly excluded)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api|auth/callback).*)',
  ],
}
