import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar usuário no SQLite local
    const user = db.prepare("SELECT * FROM usuarios WHERE username = ?").get(username.trim()) as {
      id: string;
      username: string;
      password_hash: string;
      role: "principal" | "suporte";
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // Validar contra o hash SHA-256 gerado localmente
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (passwordHash !== user.password_hash) {
      return NextResponse.json(
        { success: false, error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // Gravar o cookie HTTP-Only no navegador
    const cookieStore = cookies();
    cookieStore.set("psicohub_session", JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // Mantém logado por 7 dias
      path: "/"
    });

    // Gravar cookie complementar acessível pelo JavaScript do frontend (não é httpOnly)
    cookieStore.set("psicohub_user_info", JSON.stringify({
      username: user.username,
      role: user.role
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    console.log(`🔑 Usuário "${username}" logado com sucesso (Perfil: ${user.role}).`);
    return NextResponse.json({ success: true, role: user.role, username: user.username });

  } catch (error: any) {
    console.error("🚨 Erro na API de login:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
