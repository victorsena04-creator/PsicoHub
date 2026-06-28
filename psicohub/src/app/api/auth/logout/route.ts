import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = cookies();
    cookieStore.delete("psicohub_session");
    cookieStore.delete("psicohub_user_info");
    console.log("🔒 Usuário deslogado com sucesso (sessão limpa).");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de logout:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao efetuar logout." },
      { status: 500 }
    );
  }
}
