import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/api/cards/:path*',
    '/dashboard/:path*',
    '/collection/:path*',
    '/add/:path*',
    '/bulk-add/:path*',
    '/admin/:path*',
    '/scout/:path*',
    '/tools/:path*',
    '/marketplace/:path*',
  ],
}
