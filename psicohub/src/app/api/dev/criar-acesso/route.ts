import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API do Desenvolvedor para liberar ou modificar acessos a contas de usuários (vincular e-mail ao consultório).
 */
export async function POST(request: Request) {
  try {
    const sessao = obterSessao();
    const devEmail = process.env.DEV_EMAIL || "";

    // Apenas o desenvolvedor oficial pode rodar essa ação
    if (!sessao || sessao.email.toLowerCase() !== devEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Acesso proibido." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, consultorioId, role } = body;

    if (!email || !consultorioId || !role) {
      return NextResponse.json(
        { success: false, error: "E-mail, Consultório e Papel de acesso são obrigatórios." },
        { status: 400 }
      );
    }

    // Verificar se o consultório selecionado realmente existe no Firestore
    const consultorioDoc = await firestore.collection("consultorios").doc(consultorioId).get();
    if (!consultorioDoc.exists) {
      return NextResponse.json(
        { success: false, error: "O consultório selecionado não existe." },
        { status: 404 }
      );
    }

    // Salvar ou atualizar na coleção global de usuários
    const emailKey = email.trim().toLowerCase();
    const userRef = firestore.collection("usuarios").doc(emailKey);

    await userRef.set({
      email: emailKey,
      consultorioId,
      role,
      ativo: 1,
      updated_at: new Date().toISOString()
    }, { merge: true });

    console.log(`🔑 [DEV] Acesso concedido/atualizado para "${emailKey}" no consultório "${consultorioDoc.data()?.nome}" com papel "${role}".`);
    return NextResponse.json({ success: true, email: emailKey });
  } catch (error: any) {
    console.error("🚨 Erro na API do Desenvolvedor (Criar Acesso):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
