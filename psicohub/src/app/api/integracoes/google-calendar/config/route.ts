import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

function mascararChave(chave: string | undefined): string {
  if (!chave) return "";
  if (chave.length <= 8) return "********";
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`;
}

// GET: Retorna chaves da agenda mascaradas para exibição no front-end de forma segura
export async function GET() {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    let refreshToken = "";

    // Buscar o refresh_token do consultório ativo no Firestore
    const configDoc = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("configuracoes")
      .doc("google_calendar")
      .get();

    if (configDoc.exists) {
      refreshToken = configDoc.data()?.refresh_token || "";
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

// POST: Ações de desconexão ou configuração de agenda para o consultório ativo
export async function POST(request: Request) {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Desconectar o Google Agenda do consultório
    if (action === "desconectar") {
      await firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("configuracoes")
        .doc("google_calendar")
        .delete();

      console.log(`🔌 [CALENDAR] Google Agenda desconectado do consultório "${sessao.consultorioId}".`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Ação não suportada nesta rota." }, { status: 400 });
  } catch (error: any) {
    console.error("🚨 Erro ao atualizar configurações da agenda no Firestore:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao processar dados." },
      { status: 500 }
    );
  }
}
