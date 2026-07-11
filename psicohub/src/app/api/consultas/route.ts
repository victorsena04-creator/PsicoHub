import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import { criarEventoAgenda, atualizarEventoAgenda } from "@/lib/googleCalendar";

export const dynamic = 'force-dynamic';

// GET: Retornar consultas
export async function GET() {
  try {
    const consultas = db.prepare("SELECT * FROM consultas ORDER BY data_hora").all();
    return NextResponse.json({ success: true, data: consultas });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar agendamentos." },
      { status: 500 }
    );
  }
}

// POST: Criar uma consulta (Novo Agendamento)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paciente_id, data_hora, valor, e_excecao } = body;

    if (!paciente_id || !data_hora) {
      return NextResponse.json(
        { success: false, error: "Paciente e data/hora são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar o valor padrão da consulta do paciente se não foi informado
    let valorCobrado = parseFloat(valor);
    if (isNaN(valorCobrado) || valorCobrado === undefined) {
      const pac = db.prepare("SELECT valor_consulta FROM pacientes WHERE id = ?").get(paciente_id) as {
        valor_consulta: number;
      } | undefined;
      valorCobrado = pac?.valor_consulta || 150.00;
    }

    const id = crypto.randomUUID();

    // Inserir agendamento no banco
    db.prepare(`
      INSERT INTO consultas (id, paciente_id, data_hora, valor, status, e_excecao)
      VALUES (?, ?, ?, ?, 'agendada', ?)
    `).run(
      id,
      paciente_id,
      data_hora.trim(), // Formato "YYYY-MM-DD HH:MM"
      valorCobrado,
      e_excecao ? 1 : 0
    );

    // Buscar dados do paciente para sincronizar com o Google Agenda
    const pacienteObj = db.prepare("SELECT nome FROM pacientes WHERE id = ?").get(paciente_id) as { nome: string } | undefined;
    
    // Tentar criar evento no Google Agenda de forma assíncrona
    if (pacienteObj) {
      try {
        const googleEventId = await criarEventoAgenda({
          paciente_nome: pacienteObj.nome,
          data_hora: data_hora.trim(),
          valor: valorCobrado
        });
        
        if (googleEventId) {
          db.prepare("UPDATE consultas SET google_event_id = ? WHERE id = ?").run(googleEventId, id);
          console.log(`✅ Consulta associada ao evento do Google Agenda: ${googleEventId}`);
        }
      } catch (gErr) {
        console.warn("⚠️ Falha ao criar compromisso no Google Agenda:", gErr);
      }
    }

    console.log(`✅ Consulta cadastrada com sucesso para o paciente ${paciente_id} em ${data_hora}.`);
    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error("🚨 Erro ao criar consulta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao cadastrar agendamento." },
      { status: 500 }
    );
  }
}

// PUT: Atualizar data e hora (Movimentação Drag & Drop)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { consultaId, novaDataHora } = body;

    if (!consultaId || !novaDataHora) {
      return NextResponse.json(
        { success: false, error: "Consulta ID e Nova Data/Hora são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar dados antes de atualizar para atualizar também no Google Agenda
    const consultaAntes = db.prepare(`
      SELECT c.valor, c.status, c.google_event_id, p.nome as paciente_nome
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(consultaId) as { valor: number; status: string; google_event_id: string | null; paciente_nome: string } | undefined;

    // Atualizar no banco SQLite
    db.prepare("UPDATE consultas SET data_hora = ? WHERE id = ?").run(
      novaDataHora.trim(),
      consultaId
    );

    // Se já possuía evento na Google Agenda, atualiza-o
    if (consultaAntes && consultaAntes.google_event_id) {
      try {
        await atualizarEventoAgenda(consultaAntes.google_event_id, {
          paciente_nome: consultaAntes.paciente_nome,
          data_hora: novaDataHora.trim(),
          valor: consultaAntes.valor,
          status: consultaAntes.status
        });
      } catch (gErr) {
        console.warn("⚠️ Falha ao atualizar evento correspondente no Google Agenda:", gErr);
      }
    }

    console.log(`🔄 Consulta ${consultaId} movida para ${novaDataHora}.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Erro ao mover consulta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao reagendar." },
      { status: 500 }
    );
  }
}
