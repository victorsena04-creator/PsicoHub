import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

// Forçar carregamento dinâmico
export const dynamic = 'force-dynamic';

/**
 * Função utilitária para renovar o access_token do Google Agenda temporariamente para o Webhook
 */
async function getAccessTokenForWebhook(): Promise<string | null> {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;

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
 * quando houver qualquer alteração na agenda da cliente.
 */
export async function POST(request: Request) {
  try {
    // 1. O Google envia headers especiais na notificação Push (ex: x-goog-resource-id)
    // Para simplificar, quando a campainha toca, listamos os eventos alterados nos últimos 5 minutos.
    const token = await getAccessTokenForWebhook();
    if (!token) {
      console.warn("⚠️ Webhook notificado, mas credenciais do Google Agenda ausentes no .env. Ignorando.");
      return NextResponse.json({ success: true, message: "Ignorado (sem credenciais)" });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    
    // Calcular "agora - 5 minutos" em formato ISO 8601 UTC esperado pelo Google
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    const updatedMin = cincoMinutosAtras.toISOString();

    // 2. Chamar listagem da API do Google Calendar buscando modificações recentes
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?updatedMin=${encodeURIComponent(updatedMin)}&showDeleted=true`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("🚨 Erro ao buscar eventos atualizados do Google Agenda:", err);
      return NextResponse.json({ success: false, error: "Erro na API do Google" }, { status: 500 });
    }

    const data = await response.json();
    const eventos = data.items || [];

    if (eventos.length === 0) {
      return NextResponse.json({ success: true, message: "Nenhum evento recente para sincronizar." });
    }

    // Usar transação para manter atomicidade no SQLite
    const syncTransaction = db.transaction(() => {
      // Garantir existência do paciente virtual de bloqueio
      const pacBloqueado = db.prepare("SELECT id FROM pacientes WHERE id = 'pac-google-bloqueado'").get();
      if (!pacBloqueado) {
        db.prepare(`
          INSERT INTO pacientes (id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario, ativo)
          VALUES ('pac-google-bloqueado', 'Horário Bloqueado (Google Agenda)', '', '', 0.00, 'avulso', 1, '08:00', 1)
        `).run();
        console.log("👤 Paciente virtual 'pac-google-bloqueado' criado com sucesso.");
      }

      for (const event of eventos) {
        const googleEventId = event.id;
        
        // Formatar datas retornadas pelo Google (ex: "2026-07-20T14:00:00-03:00") para "YYYY-MM-DD HH:MM"
        let dataHoraFormatada = "";
        if (event.start && event.start.dateTime) {
          const dt = new Date(event.start.dateTime);
          // Ajustar para o fuso local do servidor/desktop
          const ano = dt.getFullYear();
          const mes = String(dt.getMonth() + 1).padStart(2, "0");
          const dia = String(dt.getDate()).padStart(2, "0");
          const hora = String(dt.getHours()).padStart(2, "0");
          const minuto = String(dt.getMinutes()).padStart(2, "0");
          dataHoraFormatada = `${ano}-${mes}-${dia} ${hora}:${minuto}`;
        }

        // Buscar correspondência local no banco pelo google_event_id
        const consultaLocal = db.prepare(
          "SELECT id, paciente_id, data_hora, status FROM consultas WHERE google_event_id = ?"
        ).get(googleEventId) as { id: string; paciente_id: string; data_hora: string; status: string } | undefined;

        // Caso o evento tenha sido deletado (status === 'cancelled') no Google
        if (event.status === "cancelled") {
          if (consultaLocal) {
            // Atualizar status local para 'cancelada'
            db.prepare("UPDATE consultas SET status = 'cancelada' WHERE id = ?").run(consultaLocal.id);
            // Opcional: remover lançamentos financeiros pendentes associados
            db.prepare("DELETE FROM recebimentos WHERE consulta_id = ? AND status = 'pendente'").run(consultaLocal.id);
            console.log(`🗑️ Consulta local ${consultaLocal.id} cancelada devido a exclusão no Google Agenda.`);
          }
          continue;
        }

        // Se a consulta local já existe e o horário mudou no Google, atualiza localmente
        if (consultaLocal) {
          if (dataHoraFormatada && consultaLocal.data_hora !== dataHoraFormatada) {
            db.prepare("UPDATE consultas SET data_hora = ? WHERE id = ?").run(dataHoraFormatada, consultaLocal.id);
            console.log(`🔄 Consulta local ${consultaLocal.id} remarcada no banco de dados para ${dataHoraFormatada}.`);
          }
        } 
        // Se NÃO existe correspondente local e foi criado no Google diretamente
        else {
          // Se for um evento que não criamos localmente (ex: compromisso pessoal da psicóloga)
          // Nós a inserimos como um "Horário Bloqueado" na agenda local para evitar conflitos.
          if (dataHoraFormatada) {
            db.prepare(`
              INSERT INTO consultas (id, paciente_id, data_hora, valor, status, e_excecao, google_event_id)
              VALUES (?, 'pac-google-bloqueado', ?, 0.00, 'agendada', 1, ?)
            `).run(
              crypto.randomUUID(),
              dataHoraFormatada,
              googleEventId
            );
            console.log(`🔒 Novo horário bloqueado cadastrado via Google Agenda em ${dataHoraFormatada}.`);
          }
        }
      }
    });

    syncTransaction();
    return NextResponse.json({ success: true, syncedCount: eventos.length });

  } catch (error: any) {
    console.error("🚨 Erro de sincronização no Webhook:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro de servidor" }, { status: 500 });
  }
}
