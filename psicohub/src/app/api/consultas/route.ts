import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { criarEventoAgenda, atualizarEventoAgenda } from "@/lib/googleCalendar";

export const dynamic = 'force-dynamic';

// GET: Retornar consultas
export async function GET() {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const snapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("consultas")
      .get();

    const consultas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Ordenar consultas por data_hora localmente
    consultas.sort((a: any, b: any) => {
      const dataA = a.data_hora || "";
      const dataB = b.data_hora || "";
      return dataA.localeCompare(dataB);
    });

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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

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
      const pacienteDoc = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("pacientes")
        .doc(paciente_id)
        .get();

      const pacData = pacienteDoc.data();
      valorCobrado = pacData?.valor_consulta || 150.00;
    }

    // Referência do novo agendamento
    const consultaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("consultas")
      .doc();

    await consultaRef.set({
      id: consultaRef.id,
      paciente_id,
      data_hora: data_hora.trim(), // Formato "YYYY-MM-DD HH:MM"
      valor: valorCobrado,
      status: "agendada",
      e_excecao: e_excecao ? 1 : 0,
      created_at: new Date().toISOString()
    });

    // Buscar dados do paciente para sincronizar com o Google Agenda
    const pacienteDoc = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc(paciente_id)
      .get();
    
    const pacienteData = pacienteDoc.data();

    // Tentar criar evento no Google Agenda de forma assíncrona
    if (pacienteData && pacienteData.nome) {
      try {
        const googleEventId = await criarEventoAgenda(sessao.consultorioId, {
          paciente_nome: pacienteData.nome,
          data_hora: data_hora.trim(),
          valor: valorCobrado
        });
        
        if (googleEventId) {
          await consultaRef.update({ google_event_id: googleEventId });
          console.log(`✅ Consulta associada ao evento do Google Agenda: ${googleEventId}`);
        }
      } catch (gErr) {
        console.warn("⚠️ Falha ao criar compromisso no Google Agenda:", gErr);
      }
    }

    console.log(`✅ Consulta cadastrada com sucesso no Firestore para o paciente ${paciente_id} em ${data_hora}.`);
    return NextResponse.json({ success: true, id: consultaRef.id });

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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { consultaId, novaDataHora } = body;

    if (!consultaId || !novaDataHora) {
      return NextResponse.json(
        { success: false, error: "Consulta ID e Nova Data/Hora são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar dados antes de atualizar para atualizar também no Google Agenda
    const consultaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("consultas")
      .doc(consultaId);

    const consultaDoc = await consultaRef.get();
    const consultaData = consultaDoc.data();

    if (!consultaDoc.exists || !consultaData) {
      return NextResponse.json(
        { success: false, error: "Consulta não encontrada." },
        { status: 404 }
      );
    }

    // Buscar nome do paciente associado
    const pacienteDoc = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc(consultaData.paciente_id)
      .get();
    
    const pacienteData = pacienteDoc.data();

    // Atualizar no Firestore
    await consultaRef.update({
      data_hora: novaDataHora.trim()
    });

    // Se já possuía evento na Google Agenda, atualiza-o
    if (consultaData.google_event_id && pacienteData && pacienteData.nome) {
      try {
        await atualizarEventoAgenda(sessao.consultorioId, consultaData.google_event_id, {
          paciente_nome: pacienteData.nome,
          data_hora: novaDataHora.trim(),
          valor: consultaData.valor,
          status: consultaData.status
        });
      } catch (gErr) {
        console.warn("⚠️ Falha ao atualizar evento correspondente no Google Agenda:", gErr);
      }
    }

    console.log(`🔄 Consulta ${consultaId} movida para ${novaDataHora} no Firestore.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Erro ao mover consulta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao reagendar." },
      { status: 500 }
    );
  }
}
