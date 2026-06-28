import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para cadastrar uma nova despesa manual (saída de caixa) no SQLite local.
 * Suporta despesas em conta corrente e compras no cartão de crédito com cálculo de fatura.
 */
export async function POST(request: Request) {
  try {
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

    const id = crypto.randomUUID();
    let faturaMes: number | null = null;
    let faturaAno: number | null = null;

    // Se o pagamento for via cartão de crédito, calculamos o mês/ano da fatura correspondente
    if (meio_pagamento === "cartao_credito" && cartao_id) {
      // Buscar as regras do cartão de crédito cadastrado
      const cartao = db.prepare(
        "SELECT dia_fechamento FROM cartoes_credito WHERE id = ?"
      ).get(cartao_id) as { dia_fechamento: number } | undefined;

      if (!cartao) {
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

    // Inserir no banco de dados SQLite local
    db.prepare(`
      INSERT INTO despesas (id, descricao, valor, data, categoria, origem, tipo_conta, meio_pagamento, cartao_id, fatura_mes, fatura_ano)
      VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?)
    `).run(
      id,
      descricao,
      parseFloat(valor),
      data,
      categoria || "outros",
      tipo_conta,
      meio_pagamento || "conta_corrente",
      cartao_id || null,
      faturaMes,
      faturaAno
    );

    console.log(`✅ Despesa "${descricao}" de R$ ${valor} registrada.`);
    return NextResponse.json({ success: true, id });
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
      const despesa = db.prepare("SELECT descricao FROM despesas WHERE id = ?").get(despesaId) as { descricao: string } | undefined;
      
      if (!despesa) {
        return NextResponse.json(
          { success: false, error: "Despesa não encontrada." },
          { status: 404 }
        );
      }

      db.prepare(`
        UPDATE despesas
        SET ${campo} = ?
        WHERE descricao = ?
      `).run(valor, despesa.descricao);

      console.log(`✅ Todas as despesas com descrição "${despesa.descricao}" atualizadas inline: ${campo} -> ${valor}`);
    } else {
      db.prepare(`
        UPDATE despesas
        SET ${campo} = ?
        WHERE id = ?
      `).run(valor, despesaId);

      console.log(`✅ Despesa ${despesaId} atualizada inline: ${campo} -> ${valor}`);
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
