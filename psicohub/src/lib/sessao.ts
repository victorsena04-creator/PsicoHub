import { cookies } from "next/headers";

export interface SessionData {
  uid: string;
  email: string;
  consultorioId: string;
  role: "principal" | "suporte";
}

/**
 * Lê o cookie de sessão seguro "psicohub_session" e retorna os dados do usuário logado,
 * incluindo o seu consultorioId para isolamento de dados no Firestore.
 */
export function obterSessao(): SessionData | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("psicohub_session");
  
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  
  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch (error) {
    console.error("🚨 Erro ao parsear cookie de sessão:", error);
    return null;
  }
}
