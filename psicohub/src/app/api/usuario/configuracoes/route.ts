import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("psicohub_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    let sessionUser: { id: string; username: string; role: string };
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const cleaned = decoded.startsWith('"') && decoded.endsWith('"') 
        ? decoded.slice(1, -1) 
        : decoded;
      sessionUser = JSON.parse(cleaned);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Sessão inválida." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username && !password) {
      return NextResponse.json(
        { success: false, error: "Forneça pelo menos o novo usuário ou a nova senha." },
        { status: 400 }
      );
    }

    // 1. Verificar se o nome de usuário novo já existe (se for alterado)
    if (username && username.trim() !== sessionUser.username) {
      const existingUser = db.prepare("SELECT id FROM usuarios WHERE username = ?").get(username.trim());
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "Este nome de usuário já está em uso." },
          { status: 400 }
        );
      }
    }

    // Iniciar atualização
    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push("username = ?");
      params.push(username.trim());
    }

    if (password) {
      const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
      updates.push("password_hash = ?");
      params.push(passwordHash);
    }

    params.push(sessionUser.id);

    db.prepare(`
      UPDATE usuarios 
      SET ${updates.join(", ")} 
      WHERE id = ?
    `).run(...params);

    // Buscar dados atualizados para atualizar a sessão
    const updatedUser = db.prepare("SELECT username, role FROM usuarios WHERE id = ?").get(sessionUser.id) as {
      username: string;
      role: string;
    };

    // Atualizar os cookies da sessão local
    cookieStore.set("psicohub_session", JSON.stringify({
      id: sessionUser.id,
      username: updatedUser.username,
      role: updatedUser.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    cookieStore.set("psicohub_user_info", JSON.stringify({
      username: updatedUser.username,
      role: updatedUser.role
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    console.log(`✅ Configurações do usuário "${updatedUser.username}" atualizadas.`);
    return NextResponse.json({ success: true, username: updatedUser.username });

  } catch (error: any) {
    console.error("🚨 Erro ao atualizar configurações de usuário:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
