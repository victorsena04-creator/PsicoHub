import db from "./db";

// Carregar variáveis de ambiente
const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
const calendar_id = process.env.GOOGLE_CALENDAR_ID || "primary";

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const calendar_id = process.env.GOOGLE_CALENDAR_ID || "primary";

  let current_refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!current_refresh_token) {
    try {
      const row = db.prepare("SELECT valor FROM configuracoes_sistema WHERE chave = ?").get("GOOGLE_REFRESH_TOKEN") as { valor: string } | undefined;
      if (row && row.valor) {
        current_refresh_token = row.valor;
      }
    } catch (e) {
      // Silencioso se o banco de dados ainda não estiver iniciado
    }
  }

  if (!client_id || !client_secret || !current_refresh_token) {
    return null;
  }

  // Se já temos um token em cache e ele ainda não expirou (damos margem de 30 segundos), retorna o cache
  const agora = Date.now();
  if (cachedAccessToken && tokenExpiresAt > agora + 30000) {
    return cachedAccessToken;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        refresh_token: current_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.warn("⚠️ Falha ao renovar access_token do Google Agenda:", errData);
      return null;
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000); // tempo em segundos para milissegundos
    return cachedAccessToken;
  } catch (error) {
    console.error("🚨 Erro de rede ao autenticar com Google OAuth:", error);
    return null;
  }
}

/**
 * Envia um novo agendamento de consulta para o Google Agenda.
 * 
 * @param consulta Objeto contendo os dados da consulta
 * @returns ID do evento gerado no Google Agenda ou null se inativo/falhar
 */
export async function criarEventoAgenda(consulta: {
  paciente_nome: string;
  data_hora: string; // Formato "YYYY-MM-DD HH:MM"
  valor: number;
}): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) {
    return null; // Integração não configurada ou erro de token
  }

  try {
    // Converter data_hora "YYYY-MM-DD HH:MM" para ISO 8601
    const [dataPart, horaPart] = consulta.data_hora.split(" ");
    const startDateTime = `${dataPart}T${horaPart}:00`;
    
    // Assumir duração padrão de 50 minutos para a sessão clínica
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 50 * 60 * 1000);
    const endDateTime = endDate.toISOString().split(".")[0]; // Remove milissegundos

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `PsicoHub: Atendimento - ${consulta.paciente_nome}`,
        description: `Sessão de terapia no valor de R$ ${consulta.valor.toFixed(2)}. Agendado automaticamente via aplicativo local.`,
        start: {
          dateTime: startDateTime,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "America/Sao_Paulo",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "email", minutes: 1440 },
          ],
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.warn("⚠️ Erro da Google Calendar API ao criar evento:", err);
      return null;
    }

    const event = await response.json();
    console.log(`✅ Evento criado no Google Agenda: ${event.id}`);
    return event.id as string;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (criar):", error);
    return null;
  }
}

/**
 * Atualiza um evento existente no Google Agenda (ex: quando o horário é movido no Kanban).
 * 
 * @param googleEventId ID do evento no Google Agenda
 * @param consulta Objeto com novos dados da consulta
 */
export async function atualizarEventoAgenda(
  googleEventId: string,
  consulta: {
    paciente_nome: string;
    data_hora: string; // Formato "YYYY-MM-DD HH:MM"
    valor: number;
    status: string;
  }
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token || !googleEventId) {
    return false;
  }

  try {
    const [dataPart, horaPart] = consulta.data_hora.split(" ");
    const startDateTime = `${dataPart}T${horaPart}:00`;
    
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 50 * 60 * 1000);
    const endDateTime = endDate.toISOString().split(".")[0];

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${googleEventId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `PsicoHub: Atendimento - ${consulta.paciente_nome}`,
        description: `Sessão de terapia no valor de R$ ${consulta.valor.toFixed(2)}. Status atual: ${consulta.status}.`,
        start: {
          dateTime: startDateTime,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "America/Sao_Paulo",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.warn("⚠️ Erro ao atualizar evento no Google Agenda:", err);
      return false;
    }

    console.log(`🔄 Evento ${googleEventId} atualizado no Google Agenda.`);
    return true;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (atualizar):", error);
    return false;
  }
}

/**
 * Exclui um evento da Google Agenda.
 * 
 * @param googleEventId ID do evento no Google Agenda
 */
export async function deletarEventoAgenda(googleEventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token || !googleEventId) {
    return false;
  }

  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${googleEventId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      // Se der 404 (já deletado lá), consideramos sucesso
      const err = await response.json();
      console.warn("⚠️ Erro ao excluir evento no Google Agenda:", err);
      return false;
    }

    console.log(`🗑️ Evento ${googleEventId} removido do Google Agenda.`);
    return true;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (excluir):", error);
    return false;
  }
}
