import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * API para liquidar (pagar) um recebimento pendente ou atrasado.
 * Ao marcar como pago, registramos a data do pagamento como hoje e mudamos
 * o status de 'pendente/atrasado' para 'pago'.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "O ID do recebimento é obrigatório." },
        { status: 400 }
      );
    }

    // Obter a data atual formatada como YYYY-MM-DD
    const hoje = new Date().toISOString().split("T")[0];

    // Executar a query SQL para atualizar o status e data do recebimento
    const result = db.prepare(`
      UPDATE recebimentos 
      SET status = 'pago', data_pagamento = ?
      WHERE id = ?
    `).run(hoje, id);

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: "Recebimento não encontrado." },
        { status: 404 }
      );
    }

    console.log(`✅ Recebimento ${id} liquidado com sucesso em: ${hoje}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de liquidação de recebimento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
