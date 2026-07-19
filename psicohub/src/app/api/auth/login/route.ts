import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, firestore } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Token de autenticação não fornecido." },
        { status: 400 }
      );
    }

    // 1. Validar o ID Token recebido do frontend usando o Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken);
    const { email, uid, name } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "E-mail de autenticação inválido." },
        { status: 400 }
      );
    }

    let consultorioId = "";
    let role: "principal" | "suporte" = "principal";
    let isDev = email.toLowerCase() === (process.env.DEV_EMAIL || "").toLowerCase();

    // 2. Verificar se o e-mail corresponde ao Desenvolvedor Administrador
    if (isDev) {
      // O desenvolvedor administrador tem um ID de consultório especial e papel principal
      consultorioId = "dev-admin";
      role = "principal";
      console.log(`💻 Desenvolvedor "${email}" autenticado com sucesso.`);
    } else {
      // 3. Buscar o usuário correspondente no Firestore global
      const userDoc = await firestore.collection("usuarios").doc(email.toLowerCase()).get();
      const userData = userDoc.data();

      if (!userDoc.exists || !userData) {
        return NextResponse.json(
          { success: false, error: "Este e-mail do Google não está autorizado a acessar o sistema." },
          { status: 401 }
        );
      }

      if (userData.ativo === 0) {
        return NextResponse.json(
          { success: false, error: "Seu acesso está inativo. Entre em contato com o suporte." },
          { status: 403 }
        );
      }

      consultorioId = userData.consultorioId;
      role = userData.role || "principal";
      console.log(`🔑 Usuário "${email}" autenticado com sucesso (Consultório: ${consultorioId}, Papel: ${role}).`);
    }

    // 4. Gravar o cookie HTTP-Only seguro de sessão no navegador
    const cookieStore = cookies();
    cookieStore.set("psicohub_session", JSON.stringify({
      uid,
      email: email.toLowerCase(),
      consultorioId,
      role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // Mantém logado por 7 dias
      path: "/"
    });

    // Gravar cookie complementar acessível pelo JavaScript do frontend (não é httpOnly)
    cookieStore.set("psicohub_user_info", JSON.stringify({
      email: email.toLowerCase(),
      role,
      isDev
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    return NextResponse.json({ success: true, role, email, isDev });

  } catch (error: any) {
    console.error("🚨 Erro na API de login do Firebase Auth:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno de autenticação." },
      { status: 500 }
    );
  }
}
