import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

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
    const { termo_chave, categoria, tipo_conta } = body;

    if (!termo_chave || !categoria || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Termo chave, categoria e tipo de conta (PF/PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    // Gravar regra de classificação no Firestore
    const regraRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("regras_classificacao")
      .doc();

    const novaRegra = {
      id: regraRef.id,
      termo_chave: termo_chave.trim(),
      categoria,
      tipo_conta,
      created_at: new Date().toISOString()
    };

    await regraRef.set(novaRegra);

    console.log(`✅ Nova regra de classificação cadastrada no Firestore: "${termo_chave}" -> ${categoria} (${tipo_conta})`);
    return NextResponse.json({ success: true, id: regraRef.id });

  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de regra de classificação:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
