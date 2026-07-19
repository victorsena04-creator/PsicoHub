import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API para cadastrar um lançamento financeiro manual avulso no Firestore (Multi-Tenant).
 * Trata entradas (recebimentos pagos) e saídas (despesas em conta corrente ou cartão).
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
      tipo_lancamento, // "entrada" ou "saida"
      descricao, 
      valor, 
      data, 
      categoria, 
      tipo_conta,
      meio_pagamento, // para despesas
      cartao_id       // para despesas
    } = body;

    if (!tipo_lancamento || !descricao || !valor || !data || !tipo_conta) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios ausentes." },
        { status: 400 }
      );
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json(
        { success: false, error: "O valor deve ser um número maior que zero." },
        { status: 400 }
      );
    }

    if (tipo_lancamento === "entrada") {
      // 1. Cadastrar na subcoleção de Recebimentos
      // Como é lançamento manual avulso de receita, assume-se que já está pago
      const recebimentoRef = firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("recebimentos")
        .doc();

      await recebimentoRef.set({
        id: recebimentoRef.id,
        consulta_id: null,
        paciente_id: null,
        valor: valorNum,
        data_vencimento: data.trim(), // data de vencimento
        data_pagamento: data.trim(), // data de pagamento
        status: "pago",
        forma_pagamento: "Pix",
        tipo_conta: tipo_conta.trim(),
        categoria: categoria || "outros",
        created_at: new Date().toISOString()
      });

      console.log(`✅ Receita de R$ ${valorNum} cadastrada manualmente no Firestore.`);
      return NextResponse.json({ success: true, id: recebimentoRef.id });
    } else {
      // 2. Cadastrar na subcoleção de Despesas
      let faturaMes: number | null = null;
      let faturaAno: number | null = null;

      if (meio_pagamento === "cartao_credito" && cartao_id) {
        // Buscar o cartão do Firestore
        const cartaoDoc = await firestore
          .collection("consultorios")
          .doc(sessao.consultorioId)
          .collection("cartoes_credito")
          .doc(cartao_id)
          .get();

        const cartao = cartaoDoc.data();

        if (cartaoDoc.exists && cartao) {
          const dataGasto = new Date(data + "T12:00:00");
          let mes = dataGasto.getMonth() + 1; // 1-indexed
          let ano = dataGasto.getFullYear();

          // Se a data do gasto for maior ou igual ao dia de fechamento, cai na fatura do mês seguinte
          if (dataGasto.getDate() >= cartao.dia_fechamento) {
            mes += 1;
            if (mes > 12) {
              mes = 1;
              ano += 1;
            }
          }
          faturaMes = mes;
          faturaAno = ano;
        }
      }

      const despesaRef = firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("despesas")
        .doc();

      await despesaRef.set({
        id: despesaRef.id,
        descricao: descricao.trim(),
        valor: valorNum,
        data: data.trim(),
        categoria: categoria || "outros",
        origem: "manual",
        tipo_conta: tipo_conta.trim(),
        meio_pagamento: meio_pagamento || "conta_corrente",
        cartao_id: (meio_pagamento === "cartao_credito" && cartao_id) ? cartao_id : null,
        fatura_mes: faturaMes,
        fatura_ano: faturaAno,
        created_at: new Date().toISOString()
      });

      console.log(`✅ Despesa de R$ ${valorNum} cadastrada manualmente no Firestore.`);
      return NextResponse.json({ success: true, id: despesaRef.id });
    }

  } catch (error: any) {
    console.error("🚨 Erro na API de Lançamento Financeiro Manual:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
