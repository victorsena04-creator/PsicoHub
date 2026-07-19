import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para atualizar inline dados de um recebimento (categoria e tipo_conta) no Firestore (Multi-Tenant).
 */
export async function PUT(request: Request) {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recebimentoId, campo, valor } = body;

    if (!recebimentoId || !campo || !valor) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios ausentes." },
        { status: 400 }
      );
    }

    if (campo !== "categoria" && campo !== "tipo_conta") {
      return NextResponse.json(
        { success: false, error: "Campo inválido para atualização." },
        { status: 400 }
      );
    }

    // Se o campo for categoria, valida se está dentro das permitidas para receitas
    if (campo === "categoria") {
      const categoriasValidas = ['atendimento', 'supervisao', 'palestra', 'outros'];
      if (!categoriasValidas.includes(valor)) {
        return NextResponse.json(
          { success: false, error: "Categoria de receita inválida." },
          { status: 400 }
        );
      }
    }

    // Se o campo for tipo_conta, valida se é PF ou PJ
    if (campo === "tipo_conta") {
      if (valor !== "PF" && valor !== "PJ") {
        return NextResponse.json(
          { success: false, error: "Tipo de conta inválido. Deve ser PF ou PJ." },
          { status: 400 }
        );
      }
    }

    // Executa a atualização no Firestore
    const recebimentoRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("recebimentos")
      .doc(recebimentoId);

    const doc = await recebimentoRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Recebimento não encontrado." },
        { status: 404 }
      );
    }

    await recebimentoRef.update({
      [campo]: valor
    });

    console.log(`✅ Recebimento ${recebimentoId} atualizado inline no Firestore: ${campo} -> ${valor}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de recebimento (PUT):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
