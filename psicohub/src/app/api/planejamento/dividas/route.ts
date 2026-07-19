import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para cadastrar uma nova dívida no Firestore (Multi-Tenant).
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

    // Inserir no Firestore
    const dividaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("dividas")
      .doc();

    await dividaRef.set({
      id: dividaRef.id,
      credor,
      valor_total: parseFloat(valor_total),
      valor_pago: 0,
      valor_parcela: parseFloat(valor_parcela),
      parcelas_totais: parseInt(parcelas_totais),
      parcelas_pagas: 0,
      destinacao_mensal: 0,
      status: "ativa",
      tipo_conta: tipo_conta || "PF",
      vencimento_proxima_parcela: vencimento_proxima_parcela || null,
      created_at: new Date().toISOString()
    });

    console.log(`✅ Dívida com "${credor}" de R$ ${valor_total} registrada no Firestore.`);
    return NextResponse.json({ success: true, id: dividaRef.id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de dívida:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
