import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Tentamos capturar o cookie de sessão. 
  // No Firebase/Next, os nomes mais comuns são 'session', '__session' ou 'token'
  const session = request.cookies.get('session') || request.cookies.get('__session');

  const { pathname } = request.nextUrl;

  // 1. PROTEÇÃO ABSOLUTA: Se tentar entrar em /admin sem cookie de sessão
  if (pathname.startsWith('/admin')) {
    if (!session) {
      // O redirecionamento ocorre no servidor, antes da página carregar.
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. EVITAR LOGIN DESNECESSÁRIO: Se já está logado, não precisa ver a tela de login
  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

// O matcher garante que o middleware não rode em arquivos de imagem, css ou api,
// economizando processamento e focando apenas nas rotas que você quer proteger.
export const config = {
  matcher: [
    '/admin/:path*', 
    '/login'
  ],
}