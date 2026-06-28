import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { termo_chave, categoria, tipo_conta } = body;

    if (!termo_chave || !categoria || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Termo chave, categoria e tipo de conta (PF/PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    // Inserir ou substituir a regra de classificação no SQLite.
    // Se o termo_chave já existir no banco, ele atualiza a categoria e o tipo de conta correspondentes.
    db.prepare(`
      INSERT OR REPLACE INTO regras_classificacao (id, termo_chave, categoria, tipo_conta)
      VALUES (?, ?, ?, ?)
    `).run(id, termo_chave.trim(), categoria, tipo_conta);

    console.log(`✅ Nova regra de classificação cadastrada: "${termo_chave}" -> ${categoria} (${tipo_conta})`);
    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de regra de classificação:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
