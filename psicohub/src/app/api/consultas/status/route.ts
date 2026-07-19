import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { atualizarEventoAgenda, deletarEventoAgenda } from "@/lib/googleCalendar";

/**
 * API para atualizar o status de uma consulta no Firestore e gerar automaticamente
 * o lançamento de recebimento financeiro caso ela seja realizada (Multi-Tenant).
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
    const { consultaId, status } = body;

    if (!consultaId || !status) {
      return NextResponse.json(
        { success: false, error: "Consulta ID e Novo Status são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Buscar dados da consulta no Firestore
    const consultaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("consultas")
      .doc(consultaId);

    const consultaDoc = await consultaRef.get();
    const consultaData = consultaDoc.data();

    if (!consultaDoc.exists || !consultaData) {
      return NextResponse.json(
        { success: false, error: "Consulta não encontrada no sistema." },
        { status: 404 }
      );
    }

    // Buscar dados do paciente
    const pacienteDoc = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc(consultaData.paciente_id)
      .get();
    
    const pacienteData = pacienteDoc.data();
    if (!pacienteDoc.exists || !pacienteData) {
      return NextResponse.json(
        { success: false, error: "Paciente não encontrado." },
        { status: 404 }
      );
    }

    // 2. Atualizar o status da consulta
    await consultaRef.update({ status });

    // Se a consulta foi marcada como REALIZADA
    if (status === "realizada") {
      // Verificar se já existe um recebimento cadastrado para esta consulta
      const recebimentoQuery = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("recebimentos")
        .where("consulta_id", "==", consultaId)
        .get();

      if (recebimentoQuery.empty) {
        // Extrair a data da consulta (YYYY-MM-DD) do campo data_hora ("YYYY-MM-DD HH:MM")
        const dataConsulta = consultaData.data_hora.split(" ")[0];

        // Criar o lançamento financeiro como PENDENTE no caixa PJ (Consultório)
        const recebimentoRef = firestore
          .collection("consultorios")
          .doc(sessao.consultorioId)
          .collection("recebimentos")
          .doc();

        await recebimentoRef.set({
          id: recebimentoRef.id,
          consulta_id: consultaId,
          paciente_id: consultaData.paciente_id,
          valor: consultaData.valor, // Valor acordado com o paciente
          data_vencimento: dataConsulta,
          data_pagamento: null,
          status: "pendente",
          forma_pagamento: null,
          tipo_conta: "PJ",
          categoria: "atendimento"
        });
        console.log(`💰 Recebimento pendente gerado no Firestore para a consulta realizada de ID: ${consultaId}`);
      }
    } 
    // Se a consulta foi alterada para outro status que não seja realizada (ex: cancelada, falta, agendada)
    else {
      // Se ela foi cancelada ou alterada, deletamos o recebimento correspondente APENAS se ele ainda estiver pendente ou atrasado.
      const recebimentoQuery = await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("recebimentos")
        .where("consulta_id", "==", consultaId)
        .get();

      const batch = firestore.batch();
      let deleteCount = 0;

      recebimentoQuery.docs.forEach(doc => {
        const recData = doc.data();
        if (recData.status === "pendente" || recData.status === "atrasado") {
          batch.delete(doc.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`💰 Removido(s) ${deleteCount} lançamento(s) financeiro(s) pendente(s)/atrasado(s) devido à alteração de status.`);
      }
    }

    // Sincronizar alteração de status com o Google Agenda
    if (consultaData.google_event_id) {
      try {
        if (status === "cancelada") {
          await deletarEventoAgenda(sessao.consultorioId, consultaData.google_event_id);
          await consultaRef.update({ google_event_id: null });
        } else {
          await atualizarEventoAgenda(sessao.consultorioId, consultaData.google_event_id, {
            paciente_nome: pacienteData.nome,
            data_hora: consultaData.data_hora,
            valor: consultaData.valor,
            status: status
          });
        }
      } catch (gErr) {
        console.warn("⚠️ Falha ao sincronizar alteração de status com o Google Agenda:", gErr);
      }
    }

    console.log(`✅ Consulta ${consultaId} atualizada para o status: ${status} no Firestore.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de status da consulta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
