import { firestore } from "./firebaseAdmin";

// Carregar variáveis de ambiente globais do Google API Client
const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const calendar_id = process.env.GOOGLE_CALENDAR_ID || "primary";

// Cache em memória para os Access Tokens temporários (evita renovar a cada chamada do mesmo consultório)
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}
const tokenCacheMap: { [consultorioId: string]: TokenCache } = {};

/**
 * Obtém o access_token válido renovando a partir do refresh_token multi-tenant no Firestore.
 */
async function getAccessToken(consultorioId: string): Promise<string | null> {
  if (!client_id || !client_secret) {
    console.warn("⚠️ Client ID ou Client Secret do Google Agenda ausentes no servidor.");
    return null;
  }

  // 1. Verificar se já temos no cache e se ainda é válido
  const agora = Date.now();
  const cache = tokenCacheMap[consultorioId];
  if (cache && cache.expiresAt > agora + 30000) {
    return cache.accessToken;
  }

  try {
    // 2. Buscar o refresh_token do consultório ativo no Firestore
    const doc = await firestore
      .collection("consultorios")
      .doc(consultorioId)
      .collection("configuracoes")
      .doc("google_calendar")
      .get();

    const dataConfig = doc.data();
    let current_refresh_token = dataConfig?.refresh_token;

    // Fallback: se for o consultório dev-admin ou não estiver configurado no Firestore,
    // tenta usar o token global do arquivo .env (caso exista)
    if (!current_refresh_token) {
      current_refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
    }

    if (!current_refresh_token) {
      console.log(`ℹ️ Google Agenda não configurado para o consultório: ${consultorioId}`);
      return null;
    }

    // 3. Chamar a API do Google para gerar o access_token temporário
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
      console.warn(`⚠️ Falha ao renovar access_token para o consultório "${consultorioId}":`, errData);
      return null;
    }

    const data = await response.json();
    
    // Salvar em cache
    tokenCacheMap[consultorioId] = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error(`🚨 Erro ao autenticar com Google OAuth para o consultório "${consultorioId}":`, error);
    return null;
  }
}

/**
 * Envia um novo agendamento de consulta para o Google Agenda.
 */
export async function criarEventoAgenda(
  consultorioId: string,
  consulta: {
    paciente_nome: string;
    data_hora: string; // Formato "YYYY-MM-DD HH:MM"
    valor: number;
  }
): Promise<string | null> {
  const token = await getAccessToken(consultorioId);
  if (!token) {
    return null; // Integração não configurada ou erro de autenticação
  }

  try {
    const [dataPart, horaPart] = consulta.data_hora.split(" ");
    const startDateTime = `${dataPart}T${horaPart}:00`;
    
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 50 * 60 * 1000); // 50 minutos
    const endDateTime = endDate.toISOString().split(".")[0];

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `PsicoHub: Atendimento - ${consulta.paciente_nome}`,
        description: `Sessão de terapia no valor de R$ ${consulta.valor.toFixed(2)}. Agendado automaticamente via PsicoHub Online.`,
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
    console.log(`✅ Evento criado no Google Agenda: ${event.id} (Consultório: ${consultorioId})`);
    return event.id as string;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (criar):", error);
    return null;
  }
}

/**
 * Atualiza um evento existente no Google Agenda.
 */
export async function atualizarEventoAgenda(
  consultorioId: string,
  googleEventId: string,
  consulta: {
    paciente_nome: string;
    data_hora: string; // Formato "YYYY-MM-DD HH:MM"
    valor: number;
    status: string;
  }
): Promise<boolean> {
  const token = await getAccessToken(consultorioId);
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

    console.log(`🔄 Evento ${googleEventId} atualizado no Google Agenda (Consultório: ${consultorioId}).`);
    return true;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (atualizar):", error);
    return false;
  }
}

/**
 * Exclui um evento da Google Agenda.
 */
export async function deletarEventoAgenda(consultorioId: string, googleEventId: string): Promise<boolean> {
  const token = await getAccessToken(consultorioId);
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
      const err = await response.json();
      console.warn("⚠️ Erro ao excluir evento no Google Agenda:", err);
      return false;
    }

    console.log(`🗑️ Evento ${googleEventId} removido do Google Agenda (Consultório: ${consultorioId}).`);
    return true;
  } catch (error) {
    console.error("🚨 Erro de rede ao sincronizar com Google Agenda (excluir):", error);
    return false;
  }
}
