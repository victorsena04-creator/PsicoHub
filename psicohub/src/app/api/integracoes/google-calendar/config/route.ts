import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

const envPath = path.join(process.cwd(), ".env");

function mascararChave(chave: string | undefined): string {
  if (!chave) return "";
  if (chave.length <= 8) return "********";
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`;
}

// GET: Retornar chaves atuais mascaradas para exibir na tela de forma segura
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    let refreshToken = process.env.GOOGLE_REFRESH_TOKEN || "";
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    if (!refreshToken) {
      try {
        const db = (await import("@/lib/db")).default;
        const row = db.prepare("SELECT valor FROM configuracoes_sistema WHERE chave = ?").get("GOOGLE_REFRESH_TOKEN") as { valor: string } | undefined;
        if (row && row.valor) {
          refreshToken = row.valor;
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        clientId: mascararChave(clientId),
        clientSecret: mascararChave(clientSecret),
        refreshToken: mascararChave(refreshToken),
        calendarId: calendarId,
        configurado: !!(clientId && clientSecret && refreshToken)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar configurações da agenda." },
      { status: 500 }
    );
  }
}

// POST: Salvar novas chaves digitadas pela psicóloga diretamente no arquivo .env
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, refreshToken, calendarId, action } = body;

    // Se for solicitado desconectar o token
    if (action === "desconectar") {
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
      newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_REFRESH_TOKEN", "");
      process.env.GOOGLE_REFRESH_TOKEN = "";

      fs.writeFileSync(envPath, newEnvContent, "utf-8");

      // Limpar do banco SQLite também
      try {
        const db = (await import("@/lib/db")).default;
        db.prepare("INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES (?, ?)").run("GOOGLE_REFRESH_TOKEN", "");
      } catch (dbErr) {
        console.error("🚨 Erro ao limpar token do SQLite ao desconectar:", dbErr);
      }

      console.log("🔌 Google Agenda desconectado (Refresh Token removido).");
      return NextResponse.json({ success: true });
    }

    // 1. Ler o conteúdo atual do arquivo .env ou criar um novo se não existir
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Função auxiliar para atualizar ou adicionar linha no .env
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
    
    // Só atualiza se o usuário digitou uma chave nova (não mascarada)
    if (clientId && !clientId.includes("...")) {
      newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_CLIENT_ID", clientId.trim());
      process.env.GOOGLE_CLIENT_ID = clientId.trim();
    }
    if (clientSecret && !clientSecret.includes("...")) {
      newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_CLIENT_SECRET", clientSecret.trim());
      process.env.GOOGLE_CLIENT_SECRET = clientSecret.trim();
    }
    if (refreshToken && !refreshToken.includes("...")) {
      newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_REFRESH_TOKEN", refreshToken.trim());
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken.trim();

      // Gravar também no SQLite
      try {
        const db = (await import("@/lib/db")).default;
        db.prepare("INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES (?, ?)").run("GOOGLE_REFRESH_TOKEN", refreshToken.trim());
        console.log("✅ Google Refresh Token salvo no SQLite persistente.");
      } catch (dbErr) {
        console.error("🚨 Erro ao gravar token no SQLite:", dbErr);
      }
    }
    if (calendarId) {
      newEnvContent = updateEnvVar(newEnvContent, "GOOGLE_CALENDAR_ID", calendarId.trim());
      process.env.GOOGLE_CALENDAR_ID = calendarId.trim();
    }

    // Salvar as alterações de volta no arquivo .env
    fs.writeFileSync(envPath, newEnvContent, "utf-8");
    
    console.log("✅ Configurações do Google Agenda salvas no .env com sucesso.");
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 Erro ao salvar configurações da agenda no .env:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor ao gravar dados." },
      { status: 500 }
    );
  }
}
