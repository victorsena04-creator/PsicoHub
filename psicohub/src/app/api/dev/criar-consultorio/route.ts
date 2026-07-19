import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * API do Desenvolvedor para cadastrar um novo consultório (Tenant) no Firestore.
 */
export async function POST(request: Request) {
  try {
    const sessao = obterSessao();
    const devEmail = process.env.DEV_EMAIL || "";

    // Apenas o e-mail do desenvolvedor configurado no .env pode acessar essa API
    if (!sessao || sessao.email.toLowerCase() !== devEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Acesso proibido. Apenas o desenvolvedor administrador pode realizar essa operação." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome do consultório é obrigatório." },
        { status: 400 }
      );
    }

    const consultorioRef = firestore.collection("consultorios").doc();
    const id = consultorioRef.id;

    await consultorioRef.set({
      id,
      nome: nome.trim(),
      created_at: new Date().toISOString()
    });

    console.log(`🏢 [DEV] Novo consultório criado: ${nome.trim()} (ID: ${id})`);
    return NextResponse.json({ success: true, id, nome: nome.trim() });
  } catch (error: any) {
    console.error("🚨 Erro na API do Desenvolvedor (Criar Consultório):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
