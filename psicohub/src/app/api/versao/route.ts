import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mock = searchParams.get("mock") === "true";

    // Carregar a versão do package.json local
    const packageJsonPath = path.join(process.cwd(), "package.json");
    let versaoLocal = "1.0.0";
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      versaoLocal = packageJson.version || "1.0.0";
    }

    // Se mock=true estiver na URL, simula que há uma nova versão para testes visuais
    if (mock) {
      return NextResponse.json({
        success: true,
        novaVersaoDisponivel: true,
        versaoLocal,
        versaoRemota: "1.0.1",
        releaseNotes: "Melhorias de desempenho e correções na conciliação bancária de PDFs.",
        downloadUrl: "https://github.com/victo-desenvolvimento/PsicoHub/releases"
      });
    }

    // Consulta real ao arquivo de versão hospedado no repositório do GitHub
    const githubUrl = "https://raw.githubusercontent.com/victo-desenvolvimento/PsicoHub/main/version.json";
    
    try {
      // Configura um timeout de 3 segundos para não travar a abertura do app caso esteja offline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(githubUrl, { 
        signal: controller.signal,
        next: { revalidate: 3600 } // Cache de 1 hora no Next.js
      });
      
      clearTimeout(timeoutId);

      if (res.ok) {
        const remoteData = await res.json();
        const versaoRemota = remoteData.version || "1.0.0";
        
        // Comparação de versão simples (ex: "1.0.0" !== "1.0.1")
        const novaVersaoDisponivel = versaoRemota !== versaoLocal;

        return NextResponse.json({
          success: true,
          novaVersaoDisponivel,
          versaoLocal,
          versaoRemota,
          releaseNotes: remoteData.release_notes || "",
          downloadUrl: remoteData.download_url || "https://github.com/victo-desenvolvimento/PsicoHub/releases"
        });
      }
    } catch (e) {
      // Caso o usuário esteja sem internet ou o repositório ainda não exista,
      // a falha é silenciosa para não travar o carregamento inicial do ERP local.
    }

    return NextResponse.json({
      success: true,
      novaVersaoDisponivel: false,
      versaoLocal,
      versaoRemota: versaoLocal,
      commit: "v2.0-firebase-check",
      firebaseConfigured: {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        projectIdVal: process.env.FIREBASE_PROJECT_ID || "NENHUM"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("🚨 Erro na API de versão:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno." },
      { status: 500 }
    );
  }
}
