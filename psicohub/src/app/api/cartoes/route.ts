import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para gerenciar cartões de crédito (PF / PJ) no Firestore (Multi-Tenant).
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
    const { nome, limite, dia_fechamento, dia_vencimento, tipo_conta } = body;

    // Validações básicas
    if (!nome || !dia_fechamento || !dia_vencimento || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Nome do cartão, dia de fechamento, dia de vencimento e conta (PF/PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    // Inserir no Firestore
    const cartaoRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("cartoes_credito")
      .doc();

    await cartaoRef.set({
      id: cartaoRef.id,
      nome,
      limite: parseFloat(limite || 0),
      dia_fechamento: parseInt(dia_fechamento),
      dia_vencimento: parseInt(dia_vencimento),
      tipo_conta,
      created_at: new Date().toISOString()
    });

    console.log(`✅ Cartão de Crédito "${nome}" cadastrado no Firestore.`);
    return NextResponse.json({ success: true, id: cartaoRef.id });
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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const snapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("cartoes_credito")
      .get();

    const cartoes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Ordenar cartões por nome localmente
    cartoes.sort((a: any, b: any) => {
      const nomeA = a.nome || "";
      const nomeB = b.nome || "";
      return nomeA.localeCompare(nomeB);
    });

    return NextResponse.json({ success: true, data: cartoes });
  } catch (error: any) {
    console.error("🚨 Erro na API de consulta de cartões de crédito:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
