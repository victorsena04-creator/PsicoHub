import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para cadastrar cartões de crédito (PF / PJ) no SQLite local.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, limite, dia_fechamento, dia_vencimento, tipo_conta } = body;

    // Validações básicas
    if (!nome || !dia_fechamento || !dia_vencimento || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Nome do cartão, dia de fechamento, dia de vencimento e conta (PF/PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    // Inserir no SQLite local
    db.prepare(`
      INSERT INTO cartoes_credito (id, nome, limite, dia_fechamento, dia_vencimento, tipo_conta)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nome,
      parseFloat(limite || 0),
      parseInt(dia_fechamento),
      parseInt(dia_vencimento),
      tipo_conta
    );

    console.log(`✅ Cartão de Crédito "${nome}" cadastrado.`);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de cartão de crédito:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cartoes = db.prepare("SELECT * FROM cartoes_credito ORDER BY nome").all();
    return NextResponse.json({ success: true, data: cartoes });
  } catch (error: any) {
    console.error("🚨 Erro na API de consulta de cartões de crédito:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
