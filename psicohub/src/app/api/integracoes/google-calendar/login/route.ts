import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * GET: Inicia o fluxo de autorização do Google Agenda de forma multi-tenant.
 * Redireciona a psicóloga para a tela de login/consentimento do Google,
 * enviando o ID do consultório ativo no parâmetro "state".
 */
export async function GET(request: Request) {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const client_id = process.env.GOOGLE_CLIENT_ID;
    
    // Identificar dinamicamente o host atual (local ou produção na Vercel)
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const redirect_uri = `${protocol}://${host}/api/integracoes/google-calendar/callback`;

    if (!client_id) {
      return NextResponse.json(
        { success: false, error: "Client ID do Google não configurado no servidor." },
        { status: 500 }
      );
    }

    // Monta a URL de consentimento passando o ID do consultório como state
    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${client_id}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${sessao.consultorioId}`;

    console.log(`🔌 [CALENDAR] Iniciando autenticação para o consultório "${sessao.consultorioId}" (Redirect: ${redirect_uri}).`);
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("🚨 Erro ao iniciar login do Google Agenda:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
