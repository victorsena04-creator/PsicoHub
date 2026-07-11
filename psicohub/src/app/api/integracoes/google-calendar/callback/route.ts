import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

const envPath = path.join(process.cwd(), ".env");

/**
 * GET: Captura o código de autorização enviado de volta pelo Google,
 * bate na API do Google para trocá-lo pelo Refresh Token, grava no arquivo .env local,
 * e exibe uma página bonita em português confirmando a conexão com sucesso.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    // Se o usuário negou ou ocorreu algum erro de autorização no navegador
    if (errorParam || !code) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Conexão Cancelada - PsicoHub</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', sans-serif; background-color: #fcfbfe; color: #1c1b1f; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { max-width: 420px; width: 100%; text-align: center; border: 1px solid #ec1c24; background: #fff8f8; padding: 40px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h1 { color: #ec1c24; font-size: 24px; margin-bottom: 12px; }
            p { font-size: 14px; line-height: 1.6; color: #49454f; margin-bottom: 24px; }
            .btn { background: #ec1c24; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Conexão Cancelada</h1>
            <p>Você cancelou a autorização ou ocorreu um erro de conexão com o Google Agenda (${errorParam || "código ausente"}). Nenhuma chave foi salva.</p>
            <a href="http://localhost:3000/dashboard" class="btn">Voltar para o PsicoHub</a>
          </div>
        </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const redirect_uri = "http://localhost:3000/api/integracoes/google-calendar/callback";

    if (!client_id || !client_secret) {
      throw new Error("Client ID ou Client Secret do Google ausente no .env do servidor local.");
    }

    // 1. Solicitar o Access Token e o Refresh Token ao Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: code,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errDetail = await tokenResponse.json();
      throw new Error(`Google API retornou erro: ${JSON.stringify(errDetail)}`);
    }

    const tokenData = await tokenResponse.json();
    const refresh_token = tokenData.refresh_token;

    if (!refresh_token) {
      // Se não retornar refresh_token, quer dizer que ela já autorizou o app e o Google enviou o token apenas na primeira vez.
      // Para resolver isso, ela precisa desconectar o app na conta do Google dela, ou passamos prompt=consent (que passamos na rota /login, então deve vir!)
      throw new Error(
        "O Google não enviou o refresh_token de acesso definitivo. Por favor, remova o PsicoHub das permissões da sua conta do Google e clique em conectar novamente no painel."
      );
    }

    // 2. Gravar o token gerado no arquivo .env local do computador dela
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const updateEnvVar = (content: string, key: string, val: string): string => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const line = `${key}=${val}`;
      if (regex.test(content)) {
        return content.replace(regex, line);
      } else {
        return content.trim() + `\n${line}\n`;
      }
    };

    let newEnvContent = envContent;
    newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_REFRESH_TOKEN", refresh_token.trim());
    
    // Atualizar no processo atual para passar a rodar imediatamente
    process.env.GOOGLE_REFRESH_TOKEN = refresh_token.trim();

    fs.writeFileSync(envPath, newEnvContent, "utf-8");
    console.log("✅ Google Refresh Token gravado automaticamente no .env do servidor local.");

    // Gravar também no SQLite persistente do AppData
    try {
      const db = (await import("@/lib/db")).default;
      db.prepare("INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES (?, ?)").run("GOOGLE_REFRESH_TOKEN", refresh_token.trim());
      console.log("✅ Google Refresh Token gravado na tabela configuracoes_sistema do banco SQLite persistente.");
    } catch (dbErr) {
      console.error("🚨 Erro ao salvar Refresh Token no SQLite:", dbErr);
    }

    // 3. Retornar página de sucesso em HTML5 bonito
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Conectado com Sucesso - PsicoHub</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Outfit', sans-serif; background-color: #fcfbfe; color: #1c1b1f; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { max-width: 440px; width: 100%; text-align: center; border: 1px solid #e1e2ec; background: #ffffff; padding: 40px 30px; border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
          .icon { width: 64px; height: 64px; background: #e8f5e9; color: #2e7d32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; font-size: 32px; font-weight: bold; }
          h1 { color: #1c1b1f; font-size: 26px; font-weight: 700; margin: 0 0 12px 0; }
          p { font-size: 14px; line-height: 1.6; color: #49454f; margin: 0 0 32px 0; }
          .btn { background: #3f51b5; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: background 0.2s; }
          .btn:hover { background: #303f9f; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Conexão Concluída!</h1>
          <p>Sua conta do Google foi conectada ao PsicoHub local com sucesso. O calendário e os horários das suas consultas começarão a ser sincronizados de forma bidirecional.</p>
          <a href="http://localhost:3000/dashboard" class="btn">Voltar para o PsicoHub</a>
        </div>
      </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );

  } catch (error: any) {
    console.error("🚨 Erro de Callback do Google Agenda:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Erro de Conexão - PsicoHub</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Outfit', sans-serif; background-color: #fcfbfe; color: #1c1b1f; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { max-width: 440px; width: 100%; text-align: center; border: 1px solid #fecdd3; background: #fff5f5; padding: 40px 30px; border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
          .icon { width: 64px; height: 64px; background: #ffebee; color: #c62828; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; font-size: 32px; font-weight: bold; }
          h1 { color: #1c1b1f; font-size: 24px; font-weight: 700; margin: 0 0 12px 0; }
          p { font-size: 13px; line-height: 1.6; color: #c62828; margin: 0 0 32px 0; font-family: monospace; text-align: left; background: #fff; padding: 12px; border: 1px dashed #fecdd3; border-radius: 8px; overflow-x: auto; }
          .btn { background: #e0e0e0; color: #333; border: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 13px; transition: background 0.2s; }
          .btn:hover { background: #d6d6d6; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✗</div>
          <h1>Erro ao Conectar</h1>
          <p>Erro: ${error.message || "Erro desconhecido"}</p>
          <a href="http://localhost:3000/dashboard" class="btn">Voltar para o PsicoHub</a>
        </div>
      </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }
}
