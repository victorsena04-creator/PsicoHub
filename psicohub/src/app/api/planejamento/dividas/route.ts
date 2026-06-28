import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para cadastrar uma nova dívida no SQLite local.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      credor,
      valor_total,
      valor_parcela,
      parcelas_totais,
      tipo_conta,
      vencimento_proxima_parcela,
    } = body;

    // Validações básicas
    if (!credor || !valor_total || !valor_parcela || !parcelas_totais) {
      return NextResponse.json(
        { success: false, error: "Credor, valor total, valor da parcela e total de parcelas são obrigatórios." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    // Inserir no SQLite local
    db.prepare(`
      INSERT INTO dividas (id, credor, valor_total, valor_pago, valor_parcela, parcelas_totais, parcelas_pagas, destinacao_mensal, status, tipo_conta, vencimento_proxima_parcela)
      VALUES (?, ?, ?, 0, ?, ?, 0, 0, 'ativa', ?, ?)
    `).run(
      id,
      credor,
      parseFloat(valor_total),
      parseFloat(valor_parcela),
      parseInt(parcelas_totais),
      tipo_conta || "PF",
      vencimento_proxima_parcela || null
    );

    console.log(`✅ Dívida com "${credor}" de R$ ${valor_total} registrada.`);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de dívida:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
