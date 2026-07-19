import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para resetar todos os dados do consultório ativo (multi-tenant) no Firestore.
 * Exige a digitação do e-mail do usuário logado como confirmação de segurança.
 */
export async function POST(request: Request) {
  try {
    const sessao = obterSessao();

    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { emailConfirmacao } = body;

    if (!emailConfirmacao) {
      return NextResponse.json(
        { success: false, error: "Digite seu e-mail para confirmar a deleção permanente." },
        { status: 400 }
      );
    }

    if (emailConfirmacao.trim().toLowerCase() !== sessao.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "O e-mail digitado não corresponde ao seu e-mail de sessão." },
        { status: 400 }
      );
    }

    // Coleções do consultório que serão limpas de forma isolada
    const subcolecoes = [
      "pacientes",
      "agenda_base",
      "consultas",
      "recebimentos",
      "cartoes_credito",
      "despesas",
      "regras_classificacao",
      "metas",
      "dividas",
      "investimentos",
      "termos_ignorar_extrato"
    ];

    console.log(`⚠️ [RESET] Iniciando reset de dados do consultório "${sessao.consultorioId}" solicitado por "${sessao.email}".`);

    const batch = firestore.batch();
    let totalDeletado = 0;

    for (const col of subcolecoes) {
      const snapshot = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection(col)
        .get();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeletado++;
      });
    }

    if (totalDeletado > 0) {
      await batch.commit();
    }

    console.log(`✅ [RESET] Reset concluído com sucesso. ${totalDeletado} documentos deletados.`);
    return NextResponse.json({
      success: true,
      message: `Todos os dados do seu consultório foram apagados com sucesso (${totalDeletado} registros limpos).`
    });

  } catch (error: any) {
    console.error("🚨 Erro ao resetar dados do consultório no Firestore:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor ao resetar dados." },
      { status: 500 }
    );
  }
}
