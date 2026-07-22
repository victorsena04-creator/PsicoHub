import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";

// Forçar carregamento dinâmico
export const dynamic = 'force-dynamic';

/**
 * Função utilitária para renovar o access_token do Google Agenda a partir do refresh_token
 */
async function getAccessToken(refresh_token: string): Promise<string | null> {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret || !refresh_token) {
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id,
        client_secret,
        refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("🚨 Erro de autenticação no Webhook:", error);
    return null;
  }
}

/**
 * POST: Endpoint público de Webhook que o Google Calendar notificará
 * quando houver qualquer alteração na agenda dos consultórios integrados.
 */
export async function POST(request: Request) {
  try {
    // 1. Buscar todas as configurações de Google Agenda ativas nos consultórios
    const configSnap = await firestore.collectionGroup("configuracoes").get();
    const configDocs = configSnap.docs.filter(doc => doc.id === "google_calendar");

    if (configDocs.length === 0) {
      console.log("ℹ️ Nenhuma integração de Google Agenda ativa no Firestore.");
      return NextResponse.json({ success: true, message: "Sem integrações ativas" });
    }

    let totalSynced = 0;

    for (const doc of configDocs) {
      const configData = doc.data();
      const refresh_token = configData.refresh_token;
      const calendarId = configData.calendarId || "primary";

      // O path é: consultorios/{consultorioId}/configuracoes/google_calendar
      // O consultorioId é o ID do documento avô (parent do parent)
      const consultorioId = doc.ref.parent.parent?.id;
      if (!consultorioId || !refresh_token) continue;

      const token = await getAccessToken(refresh_token);
      if (!token) {
        console.warn(`⚠️ Não foi possível renovar o token para o consultório: ${consultorioId}`);
        continue;
      }

      // Calcular "agora - 5 minutos" em formato ISO 8601 UTC
      const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
      const updatedMin = cincoMinutosAtras.toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?updatedMin=${encodeURIComponent(updatedMin)}&showDeleted=true`;

      const response = await fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error(`🚨 Erro ao buscar eventos do Google Agenda para consultório ${consultorioId}`);
        continue;
      }

      const data = await response.json();
      const eventos = data.items || [];

      if (eventos.length === 0) continue;

      // Garantir existência do paciente virtual neste consultório
      const pacienteRef = firestore
        .collection("consultorios")
        .doc(consultorioId)
        .collection("pacientes")
        .doc("pac-google-bloqueado");

      const pacienteDoc = await pacienteRef.get();
      if (!pacienteDoc.exists) {
        await pacienteRef.set({
          id: "pac-google-bloqueado",
          nome: "Horário Bloqueado (Google Agenda)",
          whatsapp: "",
          email: "",
          valor_consulta: 0.00,
          frequencia: "avulso",
          dia_semana: 1,
          horario: "08:00",
          ativo: 1,
          created_at: new Date().toISOString()
        });
        console.log(`👤 Paciente virtual 'pac-google-bloqueado' criado para o consultório ${consultorioId}`);
      }

      for (const event of eventos) {
        const googleEventId = event.id;

        // Formatar datas do Google (ex: "2026-07-20T14:00:00-03:00") para "YYYY-MM-DD HH:MM"
        let dataHoraFormatada = "";
        if (event.start && event.start.dateTime) {
          const dt = new Date(event.start.dateTime);
          const ano = dt.getFullYear();
          const mes = String(dt.getMonth() + 1).padStart(2, "0");
          const dia = String(dt.getDate()).padStart(2, "0");
          const hora = String(dt.getHours()).padStart(2, "0");
          const minuto = String(dt.getMinutes()).padStart(2, "0");
          dataHoraFormatada = `${ano}-${mes}-${dia} ${hora}:${minuto}`;
        }

        // Buscar consulta local pelo google_event_id no consultório específico
        const consultasSnap = await firestore
          .collection("consultorios")
          .doc(consultorioId)
          .collection("consultas")
          .where("google_event_id", "==", googleEventId)
          .get();

        const consultaLocalDoc = consultasSnap.docs[0];

        // Caso o evento tenha sido deletado/cancelado no Google Agenda
        if (event.status === "cancelled") {
          if (consultaLocalDoc) {
            const consultaLocalId = consultaLocalDoc.id;
            
            // Atualizar status local para 'cancelada'
            await consultaLocalDoc.ref.update({ status: "cancelada" });

            // Remover recebimentos pendentes/atrasados vinculados
            const recebimentosQuery = await firestore
              .collection("consultorios")
              .doc(consultorioId)
              .collection("recebimentos")
              .where("consulta_id", "==", consultaLocalId)
              .get();

            const batchDelete = firestore.batch();
            let countFinances = 0;
            recebimentosQuery.docs.forEach(rDoc => {
              const rData = rDoc.data();
              if (rData.status === "pendente" || rData.status === "atrasado") {
                batchDelete.delete(rDoc.ref);
                countFinances++;
              }
            });
            if (countFinances > 0) {
              await batchDelete.commit();
            }

            console.log(`🗑️ Consulta local ${consultaLocalId} do consultório ${consultorioId} cancelada devido à exclusão no Google Agenda.`);
          }
          continue;
        }

        // Se a consulta local existe e o horário mudou no Google Agenda, atualiza localmente
        if (consultaLocalDoc) {
          const consultaLocalData = consultaLocalDoc.data();
          if (dataHoraFormatada && consultaLocalData.data_hora !== dataHoraFormatada) {
            await consultaLocalDoc.ref.update({ data_hora: dataHoraFormatada });
            console.log(`🔄 Consulta local ${consultaLocalDoc.id} remarcada no Firestore para ${dataHoraFormatada}.`);
          }
        }
        // Se NÃO existe e foi criado no Google diretamente (compromisso pessoal da psicóloga)
        else {
          if (dataHoraFormatada) {
            const novaConsultaRef = firestore
              .collection("consultorios")
              .doc(consultorioId)
              .collection("consultas")
              .doc();

            await novaConsultaRef.set({
              id: novaConsultaRef.id,
              paciente_id: "pac-google-bloqueado",
              data_hora: dataHoraFormatada,
              valor: 0.00,
              status: "agendada",
              e_excecao: 1,
              google_event_id: googleEventId,
              created_at: new Date().toISOString()
            });

            console.log(`🔒 Novo horário bloqueado cadastrado via Google Agenda em ${dataHoraFormatada} para o consultório ${consultorioId}.`);
          }
        }
      }
      totalSynced += eventos.length;
    }

    return NextResponse.json({ success: true, syncedCount: totalSynced });

  } catch (error: any) {
    console.error("🚨 Erro de sincronização no Webhook:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro de servidor" }, { status: 500 });
  }
}
