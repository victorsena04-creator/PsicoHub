import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
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

    const id = crypto.randomUUID();

    if (tipo_lancamento === "entrada") {
      // 1. Cadastrar na tabela de Recebimentos
      // Como é lançamento manual avulso de receita, assume-se que já está pago
      db.prepare(`
        INSERT INTO recebimentos (id, consulta_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, tipo_conta)
        VALUES (?, NULL, NULL, ?, ?, ?, 'pago', 'Pix', ?)
      `).run(
        id,
        valorNum,
        data.trim(), // data de vencimento
        data.trim(), // data de pagamento
        tipo_conta.trim()
      );
      console.log(`✅ Receita de R$ ${valorNum} cadastrada manualmente.`);
    } else {
      // 2. Cadastrar na tabela de Despesas
      // Se for cartão de crédito, calcula fatura mes e fatura ano
      let faturaMes: number | null = null;
      let faturaAno: number | null = null;

      if (meio_pagamento === "cartao_credito" && cartao_id) {
        const cartao = db.prepare("SELECT * FROM cartoes_credito WHERE id = ?").get(cartao_id) as {
          dia_fechamento: number;
          dia_vencimento: number;
        } | undefined;

        if (cartao) {
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

      db.prepare(`
        INSERT INTO despesas (id, descricao, valor, data, categoria, origem, tipo_conta, meio_pagamento, cartao_id, fatura_mes, fatura_ano)
        VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?)
      `).run(
        id,
        descricao.trim(),
        valorNum,
        data.trim(),
        categoria || "outros",
        tipo_conta.trim(),
        meio_pagamento || "conta_corrente",
        (meio_pagamento === "cartao_credito" && cartao_id) ? cartao_id : null,
        faturaMes,
        faturaAno
      );
      console.log(`✅ Despesa de R$ ${valorNum} cadastrada manualmente.`);
    }

    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error("🚨 Erro na API de Lançamento Financeiro Manual:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
