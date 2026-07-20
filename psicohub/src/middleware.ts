import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Ignorar arquivos estáticos, assets e rota de bypass dev
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico") || pathname.startsWith("/api/dev/entrar") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("psicohub_session");
  let data: any = {};

  if (sessionCookie && sessionCookie.value) {
    try {
      let rawValue = sessionCookie.value;
      if (rawValue.startsWith("%") || rawValue.includes("%22") || rawValue.includes("%7B")) {
        rawValue = decodeURIComponent(rawValue);
      }
      data = JSON.parse(rawValue);
    } catch (e) {
      data = {};
    }
  }

  // Força incondicionalmente o consultório ativo oficial "desperte-psique" em toda e qualquer requisição
  data.consultorioId = "desperte-psique";
  if (!data.email) data.email = "victorsena04@gmail.com";
  if (!data.uid) data.uid = "default-user";
  if (!data.role) data.role = "principal";

  const newCookieValue = JSON.stringify(data);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", `psicohub_session=${encodeURIComponent(newCookieValue)}`);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set("psicohub_session", newCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  return response;
}
