import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para cadastrar um novo ativo de investimento no Firestore (Multi-Tenant).
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
    const { nome_ativo, tipo_investimento, saldo_acumulado, meta_aporte_mensal, tipo_conta } = body;

    // Validações básicas
    if (!nome_ativo || !tipo_investimento) {
      return NextResponse.json(
        { success: false, error: "Nome do ativo e tipo de investimento são obrigatórios." },
        { status: 400 }
      );
    }

    // Inserir no Firestore
    const investimentoRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("investimentos")
      .doc();

    await investimentoRef.set({
      id: investimentoRef.id,
      nome_ativo,
      tipo_investimento,
      saldo_acumulado: parseFloat(saldo_acumulado || 0),
      meta_aporte_mensal: parseFloat(meta_aporte_mensal || 0),
      tipo_conta: tipo_conta || "PF",
      created_at: new Date().toISOString()
    });

    console.log(`✅ Investimento em "${nome_ativo}" cadastrado no Firestore.`);
    return NextResponse.json({ success: true, id: investimentoRef.id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de investimento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
