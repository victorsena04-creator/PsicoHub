import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

/**
 * API para liquidar (pagar) um recebimento pendente ou atrasado no Firestore (Multi-Tenant).
 * Ao marcar como pago, registramos a data do pagamento como hoje e mudamos
 * o status de 'pendente/atrasado' para 'pago'.
 */
export async function POST(request: Request) {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

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

    // Atualizar no Firestore
    const recebimentoRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("recebimentos")
      .doc(id);

    const doc = await recebimentoRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Recebimento não encontrado." },
        { status: 404 }
      );
    }

    await recebimentoRef.update({
      status: "pago",
      data_pagamento: hoje
    });

    console.log(`✅ Recebimento ${id} liquidado com sucesso no Firestore em: ${hoje}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de liquidação de recebimento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
