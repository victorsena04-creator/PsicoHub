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
    const { transacoes } = body; // Array de transações selecionadas para importação

    if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma transação enviada para confirmação." },
        { status: 400 }
      );
    }

    // Buscar cartões de crédito do consultório para calculo de fatura caso necessário
    const cartoesSnapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("cartoes_credito")
      .get();
    
    const cartoesMap = new Map(cartoesSnapshot.docs.map(doc => [doc.id, doc.data() as any]));

    const batch = firestore.batch();

    for (const t of transacoes) {
      const { data, descricao, valor, categoria, tipo_conta, meio_pagamento, cartao_id, ignorar, status_confronto } = t;

      if (ignorar) {
        // Se foi marcado para ignorar, salva o aprendizado no Firestore
        if (status_confronto === "divergente" || status_confronto === "sucesso") {
          const termoRef = firestore
            .collection("consultorios")
            .doc(sessao.consultorioId)
            .collection("termos_ignorar")
            .doc();

          batch.set(termoRef, {
            id: termoRef.id,
            termo: descricao.trim(),
            created_at: new Date().toISOString()
          });
          console.log(`🧠 Robô aprendeu a desconsiderar o termo no Firestore: "${descricao.trim()}"`);
        }
        continue;
      }

      // Converter data de "DD/MM/AAAA" para "YYYY-MM-DD"
      let dataFormatada = data;
      if (data.includes("/")) {
        const partes = data.split("/");
        if (partes.length === 3) {
          dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }

      const valorNum = parseFloat(valor);

      if (valorNum < 0) {
        // --- É UMA DESPESA (SAÍDA) ---
        const valorAbs = Math.abs(valorNum);
        let faturaMes: number | null = null;
        let faturaAno: number | null = null;

        // Se for cartão de crédito, calcula vencimento e fatura
        if (meio_pagamento === "cartao_credito" && cartao_id) {
          const cartao = cartoesMap.get(cartao_id);

          if (cartao && cartao.dia_fechamento) {
            const dataGasto = new Date(dataFormatada + "T12:00:00");
            let mes = dataGasto.getMonth() + 1;
            let ano = dataGasto.getFullYear();

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
        }

        const despesaRef = firestore
          .collection("consultorios")
          .doc(sessao.consultorioId)
          .collection("despesas")
          .doc();

        batch.set(despesaRef, {
          id: despesaRef.id,
          descricao,
          valor: valorAbs,
          data: dataFormatada,
          categoria: categoria || "outros",
          origem: "importacao",
          tipo_conta: tipo_conta || "PJ",
          meio_pagamento: meio_pagamento || "conta_corrente",
          cartao_id: cartao_id || null,
          fatura_mes: faturaMes,
          fatura_ano: faturaAno,
          created_at: new Date().toISOString()
        });

      } else {
        // --- É UM RECEBIMENTO (ENTRADA) ---
        let formaPagamento = "Transferência";
        const descLower = (descricao || "").toLowerCase();
        if (descLower.includes("pix")) {
          formaPagamento = "Pix";
        } else if (descLower.includes("dinheiro") || descLower.includes("deposito")) {
          formaPagamento = "Dinheiro";
        }

        const recebimentoRef = firestore
          .collection("consultorios")
          .doc(sessao.consultorioId)
          .collection("recebimentos")
          .doc();

        batch.set(recebimentoRef, {
          id: recebimentoRef.id,
          consulta_id: null,
          paciente_id: null,
          valor: valorNum,
          data_vencimento: dataFormatada,
          data_pagamento: dataFormatada,
          status: "pago",
          forma_pagamento: formaPagamento,
          tipo_conta: tipo_conta || "PJ",
          categoria: categoria || "outros",
          created_at: new Date().toISOString()
        });
      }
    }

    await batch.commit();

    console.log(`✅ ${transacoes.length} lançamentos importados com sucesso do extrato para o Firestore.`);
    return NextResponse.json({ success: true, count: transacoes.length });

  } catch (error: any) {
    console.error("🚨 Erro na API de confirmação de extrato:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
