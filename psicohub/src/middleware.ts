import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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

      // Se o consultorioId for diferente de "desperte-psique", forçamos o valor correto
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
    // Se não houver cookie, injeta a sessão padrão apontando para "desperte-psique"
    newCookieValue = JSON.stringify({
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    });
    shouldUpdateCookie = true;
  }

  // Se o cookie precisa ser atualizado:
  if (shouldUpdateCookie && newCookieValue) {
    const requestHeaders = new Headers(request.headers);
    // Atualiza o header de cookie da requisição de entrada para que os Server Components leiam desperte-psique na MESMA requisição
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
