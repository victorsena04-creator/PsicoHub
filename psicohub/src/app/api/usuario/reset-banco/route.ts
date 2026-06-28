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
    const { passwordConfirm1, passwordConfirm2 } = body;

    if (!passwordConfirm1 || !passwordConfirm2) {
      return NextResponse.json(
        { success: false, error: "Digite a confirmação de senha nos dois campos." },
        { status: 400 }
      );
    }

    if (passwordConfirm1 !== passwordConfirm2) {
      return NextResponse.json(
        { success: false, error: "As senhas de confirmação não coincidem." },
        { status: 400 }
      );
    }

    // Buscar a senha real do usuário no banco SQLite para validar a autorização
    const user = db.prepare("SELECT password_hash FROM usuarios WHERE id = ?").get(sessionUser.id) as {
      password_hash: string;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Gerar o hash SHA-256 e comparar
    const passwordHash = crypto.createHash("sha256").update(passwordConfirm1).digest("hex");
    if (passwordHash !== user.password_hash) {
      return NextResponse.json(
        { success: false, error: "Senha incorreta. Confirmação negada." },
        { status: 401 }
      );
    }

    // Executar a limpeza de dados em uma transação atômica
    const resetTransaction = db.transaction(() => {
      // 1. Apagar lançamentos e dados de fluxo de caixa
      db.prepare("DELETE FROM recebimentos").run();
      db.prepare("DELETE FROM despesas").run();
      db.prepare("DELETE FROM consultas").run();
      db.prepare("DELETE FROM agenda_base").run();
      db.prepare("DELETE FROM pacientes").run();
      
      // 2. Apagar cartões, regras, metas, dívidas e investimentos
      db.prepare("DELETE FROM cartoes_credito").run();
      db.prepare("DELETE FROM regras_classificacao").run();
      db.prepare("DELETE FROM metas").run();
      db.prepare("DELETE FROM dividas").run();
      db.prepare("DELETE FROM investimentos").run();
    });

    resetTransaction();
    
    console.log(`⚠️ BANCO DE DADOS RESETADO COMPLETAMENTE pelo usuário "${sessionUser.username}".`);
    return NextResponse.json({ success: true, message: "Banco de dados local limpo com sucesso." });

  } catch (error: any) {
    console.error("🚨 Erro ao resetar banco de dados:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
