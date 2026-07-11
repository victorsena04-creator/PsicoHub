import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import { atualizarEventoAgenda, deletarEventoAgenda } from "@/lib/googleCalendar";

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
      SELECT c.*, p.valor_consulta, p.id as pac_id, p.nome as paciente_nome
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(consultaId) as { id: string; paciente_id: string; valor: number; data_hora: string; status: string; pac_id: string; google_event_id: string | null; paciente_nome: string } | undefined;

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
          // Extrair a data da consulta (YYYY-MM-DD) do campo data_hora ("YYYY-MM-DD HH:MM")
          const dataConsulta = consulta.data_hora.split(" ")[0];

          // Criar o lançamento financeiro como PENDENTE no caixa PJ (Consultório)
          db.prepare(`
            INSERT INTO recebimentos (id, consulta_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, tipo_conta, categoria)
            VALUES (?, ?, ?, ?, ?, NULL, 'pendente', NULL, 'PJ', 'atendimento')
          `).run(
            crypto.randomUUID(),
            consultaId,
            consulta.pac_id,
            consulta.valor, // Valor acordado com o paciente
            dataConsulta
          );
          console.log(`💰 Recebimento pendente gerado para a consulta realizada de ID: ${consultaId}`);
        }
      } 
      // Se a consulta foi alterada para outro status que não seja realizada (ex: cancelada, falta, agendada)
      else {
        // Se ela foi cancelada ou alterada, deletamos apenas se o recebimento ainda estiver pendente ou atrasado.
        // Se o recebimento já estiver PAGO (marcado por conciliação bancária ou manual), não apagamos do histórico financeiro.
        db.prepare("DELETE FROM recebimentos WHERE consulta_id = ? AND status IN ('pendente', 'atrasado')").run(consultaId);
      }
    });

    updateTransaction();

    // Sincronizar alteração de status com o Google Agenda
    if (consulta && consulta.google_event_id) {
      try {
        if (status === "cancelada") {
          await deletarEventoAgenda(consulta.google_event_id);
          // Opcional: remover o google_event_id do SQLite já que ele foi apagado no Google
          db.prepare("UPDATE consultas SET google_event_id = NULL WHERE id = ?").run(consulta.id);
        } else {
          await atualizarEventoAgenda(consulta.google_event_id, {
            paciente_nome: consulta.paciente_nome,
            data_hora: consulta.data_hora,
            valor: consulta.valor,
            status: status
          });
        }
      } catch (gErr) {
        console.warn("⚠️ Falha ao sincronizar alteração de status com o Google Agenda:", gErr);
      }
    }

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
