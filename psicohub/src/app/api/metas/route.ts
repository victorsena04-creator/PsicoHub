import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para atualizar ou criar metas financeiras (Meta PJ e Teto PF)
 * para o mês e ano corrente no Firestore (Multi-Tenant).
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
    const { meta_prolabore, meta_despesas, mes: bodyMes, ano: bodyAno } = body;

    const now = new Date();
    const mes = bodyMes ? parseInt(bodyMes, 10) : now.getMonth() + 1;
    const ano = bodyAno ? parseInt(bodyAno, 10) : now.getFullYear();

    // Validar se os valores são numéricos e maiores ou iguais a zero
    const valProlabore = parseFloat(meta_prolabore);
    const valDespesas = parseFloat(meta_despesas);

    if (isNaN(valProlabore) || isNaN(valDespesas)) {
      return NextResponse.json(
        { success: false, error: "Os valores informados para as metas devem ser números válidos." },
        { status: 400 }
      );
    }

    // Verificar se já existe um registro de meta cadastrado para o mês/ano corrente no Firestore
    const metasQuery = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("metas")
      .where("mes", "==", mes)
      .where("ano", "==", ano)
      .get();

    if (!metasQuery.empty) {
      // Atualizar o registro existente no Firestore
      const metaDoc = metasQuery.docs[0];
      await metaDoc.ref.update({
        meta_prolabore: valProlabore,
        meta_despesas: valDespesas
      });
      console.log(`✅ Metas do mês ${mes}/${ano} atualizadas no Firestore: PJ = R$ ${valProlabore}, PF = R$ ${valDespesas}`);
    } else {
      // Inserir um novo registro no Firestore
      const metaRef = firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("metas")
        .doc();

      await metaRef.set({
        id: metaRef.id,
        meta_prolabore: valProlabore,
        meta_despesas: valDespesas,
        mes,
        ano,
        created_at: new Date().toISOString()
      });
      console.log(`✅ Novas metas do mês ${mes}/${ano} criadas no Firestore: PJ = R$ ${valProlabore}, PF = R$ ${valDespesas}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de metas financeiras:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
