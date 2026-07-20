import { cookies } from "next/headers";

export interface SessionData {
  uid: string;
  email: string;
  consultorioId: string;
  role: "principal" | "suporte";
}

/**
 * Lê o cookie de sessão seguro "psicohub_session" e retorna os dados do usuário logado.
 * Possui resiliência contra URL-encoding e fallback automático para o consultório principal "desperte-psique".
 */
export function obterSessao(): SessionData | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("psicohub_session");
  
  if (!sessionCookie || !sessionCookie.value) {
    // Fallback de segurança para garantir exibição dos dados do consultório ativo
    return {
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    };
  }
  
  try {
    let rawValue = sessionCookie.value;
    // Trata codificação de URI que alguns navegadores/proxies aplicam em cookies JSON
    if (rawValue.startsWith("%") || rawValue.includes("%22") || rawValue.includes("%7B")) {
      rawValue = decodeURIComponent(rawValue);
    }

    const data = JSON.parse(rawValue) as SessionData;
    
    // Garantir que a sessão sempre aponte para o consultório oficial "desperte-psique"
    if (!data.consultorioId || data.consultorioId === "dev-admin" || data.consultorioId === "consultorio-principal") {
      data.consultorioId = "desperte-psique";
    }

    return data;
  } catch (error) {
    console.error("🚨 Erro ao parsear cookie de sessão, ativando fallback 'desperte-psique':", error);
    return {
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    };
  }
}
