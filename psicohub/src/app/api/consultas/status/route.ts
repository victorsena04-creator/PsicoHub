import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para atualizar o status de uma consulta e gerar automaticamente
 * o lançamento de recebimento financeiro caso ela seja realizada.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consultaId, status } = body;

    if (!consultaId || !status) {
      return NextResponse.json(
        { success: false, error: "Consulta ID e Novo Status são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Buscar dados da consulta e do paciente correspondente
    const consulta = db.prepare(`
      SELECT c.*, p.valor_consulta, p.id as pac_id 
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(consultaId) as { id: string; paciente_id: string; valor: number; data_hora: string; status: string; pac_id: string } | undefined;

    if (!consulta) {
      return NextResponse.json(
        { success: false, error: "Consulta não encontrada no sistema." },
        { status: 404 }
      );
    }

    // Iniciar uma transação do SQLite para garantir consistência de dados
    const updateTransaction = db.transaction(() => {
      // 2. Atualizar o status da consulta
      db.prepare("UPDATE consultas SET status = ? WHERE id = ?").run(status, consultaId);

      // Se a consulta foi marcada como REALIZADA
      if (status === "realizada") {
        // Verificar se já existe um lançamento de recebimento para esta consulta
        const recebimentoExistente = db.prepare(
          "SELECT id FROM recebimentos WHERE consulta_id = ?"
        ).get(consultaId);

        if (!recebimentoExistente) {
          // Data de hoje para vencimento e pagamento
          const hoje = new Date().toISOString().split("T")[0];

          // Criar o lançamento financeiro como PAGO no caixa PJ (Consultório)
          db.prepare(`
            INSERT INTO recebimentos (id, consulta_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, tipo_conta)
            VALUES (?, ?, ?, ?, ?, ?, 'pago', 'Pix', 'PJ')
          `).run(
            crypto.randomUUID(),
            consultaId,
            consulta.pac_id,
            consulta.valor, // Valor acordado com o paciente
            hoje,
            hoje
          );
        } else {
          // Se já existia, garante que o status está como pago
          db.prepare("UPDATE recebimentos SET status = 'pago' WHERE consulta_id = ?").run(consultaId);
        }
      } 
      // Se a consulta foi alterada para outro status que não seja realizada (ex: cancelada, falta)
      else {
        // Se ela foi cancelada ou marcada como falta, podemos remover o recebimento
        // ou mudar para pendente/atrasado. A melhor prática clínica é remover ou deixar pendente
        // de acordo com as regras do consultório. Vamos remover o recebimento correspondente.
        db.prepare("DELETE FROM recebimentos WHERE consulta_id = ?").run(consultaId);
      }
    });

    updateTransaction();

    console.log(`✅ Consulta ${consultaId} atualizada para o status: ${status}.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de status da consulta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
