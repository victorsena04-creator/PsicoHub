import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transacoes } = body; // Array de transações selecionadas para importação

    if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma transação enviada para confirmação." },
        { status: 400 }
      );
    }

    // Usaremos uma transação do SQLite para garantir consistência.
    // Se ocorrer algum erro durante a gravação de qualquer lançamento, tudo será cancelado (rollback).
    const runTransaction = db.transaction(() => {
      for (const t of transacoes) {
        const { data, descricao, valor, categoria, tipo_conta, meio_pagamento, cartao_id, ignorar, status_confronto } = t;

        if (ignorar) {
          // Se foi marcado para ignorar e veio de inconsistência (divergente), o robô aprende a ignorar a descrição
          if (status_confronto === "divergente") {
            try {
              db.prepare(`
                INSERT OR IGNORE INTO termos_ignorar_extrato (id, termo)
                VALUES (?, ?)
              `).run(crypto.randomUUID(), descricao.trim());
              console.log(`🧠 Robô aprendeu a desconsiderar o termo: "${descricao.trim()}"`);
            } catch (err) {
              console.error("Erro ao salvar aprendizado de desconsiderar:", err);
            }
          }
          continue;
        }

        // Converter data de "DD/MM/AAAA" para "YYYY-MM-DD" para salvar no SQLite
        const partes = data.split("/");
        if (partes.length !== 3) {
          throw new Error(`Data em formato inválido: ${data}`);
        }
        const dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;

        const valorNum = parseFloat(valor);
        const id = crypto.randomUUID();

        if (valorNum < 0) {
          // --- É UMA DESPESA (SAÍDA) ---
          const valorAbs = Math.abs(valorNum);
          let faturaMes: number | null = null;
          let faturaAno: number | null = null;

          // Se for cartão de crédito, calcula o vencimento e o mês de fatura correto
          if (meio_pagamento === "cartao_credito" && cartao_id) {
            const cartao = db.prepare(
              "SELECT dia_fechamento FROM cartoes_credito WHERE id = ?"
            ).get(cartao_id) as { dia_fechamento: number } | undefined;

            if (!cartao) {
              throw new Error(`Cartão de crédito selecionado não encontrado.`);
            }

            const dataGasto = new Date(dataFormatada + "T12:00:00");
            let mes = dataGasto.getMonth() + 1;
            let ano = dataGasto.getFullYear();

            // Se o dia da compra ultrapassar o dia de fechamento da fatura,
            // ela passa a vencer no mês seguinte.
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

          db.prepare(`
            INSERT INTO despesas (id, descricao, valor, data, categoria, origem, tipo_conta, meio_pagamento, cartao_id, fatura_mes, fatura_ano)
            VALUES (?, ?, ?, ?, ?, 'importacao', ?, ?, ?, ?, ?)
          `).run(
            id,
            descricao,
            valorAbs,
            dataFormatada,
            categoria || "outros",
            tipo_conta || "PJ",
            meio_pagamento || "conta_corrente",
            cartao_id || null,
            faturaMes,
            faturaAno
          );

        } else {
          // --- É UM RECEBIMENTO (ENTRADA) ---
          // Inferir Pix ou Dinheiro de forma básica pela descrição
          let formaPagamento = "Transferência";
          const descLower = descricao.toLowerCase();
          if (descLower.includes("pix")) {
            formaPagamento = "Pix";
          } else if (descLower.includes("dinheiro") || descLower.includes("deposito")) {
            formaPagamento = "Dinheiro";
          }

          db.prepare(`
            INSERT INTO recebimentos (id, consulta_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, tipo_conta, categoria)
            VALUES (?, NULL, NULL, ?, ?, ?, 'pago', ?, ?, ?)
          `).run(
            id,
            valorNum,
            dataFormatada, // data de vencimento
            dataFormatada, // data de pagamento (se já consta no extrato)
            formaPagamento,
            tipo_conta || "PJ",
            categoria || "outros"
          );
        }
      }
    });

    runTransaction();

    console.log(`✅ ${transacoes.length} lançamentos importados com sucesso do extrato.`);
    return NextResponse.json({ success: true, count: transacoes.length });

  } catch (error: any) {
    console.error("🚨 Erro na API de confirmação de extrato:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
