import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET: Inicia o fluxo de autorização do Google Agenda.
 * Redireciona a psicóloga para a tela de login/consentimento do Google.
 */
export async function GET() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const redirect_uri = "http://localhost:3000/api/integracoes/google-calendar/callback";

  if (!client_id) {
    return NextResponse.json(
      { success: false, error: "Client ID do Google não configurado no servidor local." },
      { status: 500 }
    );
  }

  // Monta a URL de consentimento pedindo permissão de leitura/gravação da agenda e acesso offline (refresh_token)
  const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${client_id}&` +
    `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
    `access_type=offline&` +
    `prompt=consent`;

  // Redireciona o navegador para o Google
  return NextResponse.redirect(authUrl);
}
