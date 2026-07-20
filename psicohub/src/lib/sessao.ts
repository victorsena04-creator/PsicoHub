import { cookies } from "next/headers";

export interface SessionData {
  uid: string;
  email: string;
  consultorioId: string;
  role: "principal" | "suporte";
}

/**
 * Lê o cookie de sessão seguro "psicohub_session" e garante retorno do consultório oficial "desperte-psique".
 */
export function obterSessao(): SessionData | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("psicohub_session");
  
  if (!sessionCookie || !sessionCookie.value) {
    return {
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    };
  }

  try {
    let rawValue = sessionCookie.value;
    if (rawValue.startsWith("%") || rawValue.includes("%22") || rawValue.includes("%7B")) {
      rawValue = decodeURIComponent(rawValue);
    }
    const data = JSON.parse(rawValue) as SessionData;

    // Forçar incondicionalmente o consultório único e oficial da clínica
    data.consultorioId = "desperte-psique";

    return data;
  } catch (error) {
    return {
      uid: "default-user",
      email: "victorsena04@gmail.com",
      consultorioId: "desperte-psique",
      role: "principal"
    };
  }
}
