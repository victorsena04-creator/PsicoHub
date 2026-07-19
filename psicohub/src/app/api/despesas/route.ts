import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para cadastrar uma nova despesa manual no Firestore (Multi-Tenant).
 * Suporta despesas em conta corrente e compras no cartão de crédito com cálculo de fatura.
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
      descricao,
      valor,
      data,
      categoria,
      tipo_conta,
      meio_pagamento,
      cartao_id,
    } = body;

    // Validações básicas
    if (!descricao || !valor || !data || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Descrição, valor, data e tipo de conta (PF/PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    let faturaMes: number | null = null;
    let faturaAno: number | null = null;

    // Se o pagamento for via cartão de crédito, calculamos o mês/ano da fatura correspondente
    if (meio_pagamento === "cartao_credito" && cartao_id) {
      // Buscar as regras do cartão de crédito cadastrado no Firestore
      const cartaoDoc = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("cartoes_credito")
        .doc(cartao_id)
        .get();

      const cartao = cartaoDoc.data();

      if (!cartaoDoc.exists || !cartao) {
        return NextResponse.json(
          { success: false, error: "Cartão de crédito selecionado não encontrado." },
          { status: 404 }
        );
      }

      const dataGasto = new Date(data + "T12:00:00");
      let mes = dataGasto.getMonth() + 1; // 1-12
      let ano = dataGasto.getFullYear();

      // Se o dia do gasto for maior que o dia de fechamento do cartão,
      // a compra cai na fatura do mês seguinte.
      if (dataGasto.getDate() > cartao.dia_fechamento) {
        mes += 1;
        if (mes > 12) {
          mes = 1;
          ano += 1;
        }
      }

      faturaMes = mes;
      faturaAno = ano;
    }

    // Inserir no Firestore
    const despesaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("despesas")
      .doc();

    await despesaRef.set({
      id: despesaRef.id,
      descricao,
      valor: parseFloat(valor),
      data,
      categoria: categoria || "outros",
      origem: "manual",
      tipo_conta,
      meio_pagamento: meio_pagamento || "conta_corrente",
      cartao_id: cartao_id || null,
      fatura_mes: faturaMes,
      fatura_ano: faturaAno,
      created_at: new Date().toISOString()
    });

    console.log(`✅ Despesa "${descricao}" de R$ ${valor} registrada no Firestore.`);
    return NextResponse.json({ success: true, id: despesaRef.id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de despesa:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

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
    const { despesaId, campo, valor, atualizarTodasPorNome } = body;

    if (!despesaId || !campo || !valor) {
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

    // Se o campo for categoria, valida se está dentro das permitidas
    if (campo === "categoria") {
      const categoriasValidas = ['aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros'];
      if (!categoriasValidas.includes(valor)) {
        return NextResponse.json(
          { success: false, error: "Categoria inválida." },
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

    if (atualizarTodasPorNome) {
      // Buscar a descrição da despesa atual para saber qual nome atualizar
      const despesaRef = firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("despesas")
        .doc(despesaId);

      const despesaDoc = await despesaRef.get();
      const despesa = despesaDoc.data();
      
      if (!despesaDoc.exists || !despesa) {
        return NextResponse.json(
          { success: false, error: "Despesa não encontrada." },
          { status: 404 }
        );
      }

      // Buscar todas as despesas com a mesma descrição no Firestore
      const despesasSnapshot = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("despesas")
        .where("descricao", "==", despesa.descricao)
        .get();

      const batch = firestore.batch();
      despesasSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { [campo]: valor });
      });
      await batch.commit();

      console.log(`✅ Todas as despesas com descrição "${despesa.descricao}" atualizadas no Firestore: ${campo} -> ${valor}`);
    } else {
      const despesaRef = firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("despesas")
        .doc(despesaId);

      const doc = await despesaRef.get();
      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: "Despesa não encontrada." },
          { status: 404 }
        );
      }

      await despesaRef.update({
        [campo]: valor
      });

      console.log(`✅ Despesa ${despesaId} atualizada inline no Firestore: ${campo} -> ${valor}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de despesa (PUT):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
