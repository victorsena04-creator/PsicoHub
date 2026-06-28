import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Validar se a sessão atual é do usuário suporte
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("psicohub_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Sessão inexistente." },
        { status: 401 }
      );
    }

    let session: any;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { success: false, error: "Sessão inválida." },
        { status: 401 }
      );
    }

    if (session.role !== "suporte") {
      return NextResponse.json(
        { success: false, error: "Apenas o usuário de Suporte Técnico possui privilégios para esta ação." },
        { status: 403 }
      );
    }

    // 2. Processar a redefinição de senha
    const body = await request.json();
    const { newPassword, targetUsername } = body;

    if (!newPassword || newPassword.trim() === "") {
      return NextResponse.json(
        { success: false, error: "A nova senha é obrigatória." },
        { status: 400 }
      );
    }

    // O alvo padrão de alteração é o usuário 'admin' (principal)
    const usernameParaAlterar = targetUsername || "admin";

    // Hash SHA-256 da nova senha
    const newHash = crypto.createHash("sha256").update(newPassword).digest("hex");

    // Executar o UPDATE no SQLite local
    const result = db.prepare(`
      UPDATE usuarios 
      SET password_hash = ? 
      WHERE username = ? AND role = 'principal'
    `).run(newHash, usernameParaAlterar);

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: `Usuário principal "${usernameParaAlterar}" não localizado para redefinição.` },
        { status: 404 }
      );
    }

    console.log(`🔐 Suporte técnico redefiniu a senha do usuário principal "${usernameParaAlterar}".`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Erro na API de redefinição de senha:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
