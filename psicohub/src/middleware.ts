import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const sessionCookie = request.cookies.get("psicohub_session");

  if (sessionCookie && sessionCookie.value) {
    try {
      let rawValue = sessionCookie.value;
      if (rawValue.startsWith("%") || rawValue.includes("%22") || rawValue.includes("%7B")) {
        rawValue = decodeURIComponent(rawValue);
      }
      const data = JSON.parse(rawValue);

      // Se o consultorioId no cookie do navegador for diferente de "desperte-psique", força a correção do cookie via Set-Cookie no cabeçalho HTTP
      if (!data.consultorioId || data.consultorioId !== "desperte-psique") {
        data.consultorioId = "desperte-psique";
        const newCookieValue = JSON.stringify(data);

        response.cookies.set("psicohub_session", newCookieValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/"
        });
      }
    } catch (e) {
      // Se o cookie estiver corrompido ou ilegível, injeta a sessão limpa apontando para "desperte-psique"
      const defaultSession = JSON.stringify({
        uid: "default-user",
        email: "victorsena04@gmail.com",
        consultorioId: "desperte-psique",
        role: "principal"
      });
      response.cookies.set("psicohub_session", defaultSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
