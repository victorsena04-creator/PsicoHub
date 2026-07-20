import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorar arquivos estáticos e assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("psicohub_session");
  let shouldUpdateCookie = false;
  let newCookieValue = "";

  if (sessionCookie && sessionCookie.value) {
    try {
      let rawValue = sessionCookie.value;
      if (rawValue.startsWith("%") || rawValue.includes("%22") || rawValue.includes("%7B")) {
        rawValue = decodeURIComponent(rawValue);
      }
      const data = JSON.parse(rawValue);

      // Se o consultorioId no cookie for diferente de desperte-psique, corrigimos imediatamente
      if (!data.consultorioId || data.consultorioId !== "desperte-psique") {
        data.consultorioId = "desperte-psique";
        newCookieValue = JSON.stringify(data);
        shouldUpdateCookie = true;
      }
    } catch (e) {
      newCookieValue = JSON.stringify({
        uid: "default-user",
        email: "victorsena04@gmail.com",
        consultorioId: "desperte-psique",
        role: "principal"
      });
      shouldUpdateCookie = true;
    }
  } else {
    // Se não houver cookie, injeta a sessão padrão do consultório ativo
    newCookieValue = JSON.stringify({
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    });
    shouldUpdateCookie = true;
  }

  if (shouldUpdateCookie && newCookieValue) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("cookie", `psicohub_session=${encodeURIComponent(newCookieValue)}`);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set("x-psicohub-middleware", "active-override");
    response.cookies.set("psicohub_session", newCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-psicohub-middleware", "active-passthrough");
  return response;
}
