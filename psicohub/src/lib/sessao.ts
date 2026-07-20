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
    const data = JSON.parse(sessionCookie.value) as SessionData;
    
    // Se o cookie de sessão mantiver "dev-admin" ou estiver em branco, corrige para o consultório oficial "desperte-psique"
    if (!data.consultorioId || data.consultorioId === "dev-admin") {
      data.consultorioId = "desperte-psique";
    }

    return data;
  } catch (error) {
    console.error("🚨 Erro ao parsear cookie de sessão:", error);
    return null;
  }
}
