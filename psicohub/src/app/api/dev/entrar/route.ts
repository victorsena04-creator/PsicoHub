import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = cookies();
  
  const sessionData = {
    uid: "dev-victor-123",
    email: "victorsena04@gmail.com",
    consultorioId: "desperte-psique",
    role: "principal"
  };

  cookieStore.set("psicohub_session", JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  cookieStore.set("psicohub_user_info", JSON.stringify({
    email: "victorsena04@gmail.com",
    role: "principal",
    isDev: true
  }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  const url = new URL(request.url);
  const target = url.searchParams.get("target") || "/financeiro";
  return NextResponse.redirect(new URL(target, request.url));
}
