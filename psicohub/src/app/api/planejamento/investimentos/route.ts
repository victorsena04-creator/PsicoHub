import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para cadastrar um novo ativo de investimento no SQLite local.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_ativo, tipo_investimento, saldo_acumulado, meta_aporte_mensal, tipo_conta } = body;

    // Validações básicas
    if (!nome_ativo || !tipo_investimento) {
      return NextResponse.json(
        { success: false, error: "Nome do ativo e tipo de investimento são obrigatórios." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    // Inserir no SQLite local
    db.prepare(`
      INSERT INTO investimentos (id, nome_ativo, tipo_investimento, saldo_acumulado, meta_aporte_mensal, tipo_conta)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nome_ativo,
      tipo_investimento,
      parseFloat(saldo_acumulado || 0),
      parseFloat(meta_aporte_mensal || 0),
      tipo_conta || "PF"
    );

    console.log(`✅ Investimento em "${nome_ativo}" cadastrado.`);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de investimento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
