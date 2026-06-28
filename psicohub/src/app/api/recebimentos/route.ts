import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * API para atualizar inline dados de um recebimento (categoria e tipo_conta).
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { recebimentoId, campo, valor } = body;

    if (!recebimentoId || !campo || !valor) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios ausentes." },
        { status: 400 }
      );
    }

    if (campo !== "categoria" && campo !== "tipo_conta") {
      return NextResponse.json(
        { success: false, error: "Campo inválido para atualização." },
        { status: 400 }
      );
    }

    // Se o campo for categoria, valida se está dentro das permitidas para receitas
    if (campo === "categoria") {
      const categoriasValidas = ['atendimento', 'supervisao', 'palestra', 'outros'];
      if (!categoriasValidas.includes(valor)) {
        return NextResponse.json(
          { success: false, error: "Categoria de receita inválida." },
          { status: 400 }
        );
      }
    }

    // Se o campo for tipo_conta, valida se é PF ou PJ
    if (campo === "tipo_conta") {
      if (valor !== "PF" && valor !== "PJ") {
        return NextResponse.json(
          { success: false, error: "Tipo de conta inválido. Deve ser PF ou PJ." },
          { status: 400 }
        );
      }
    }

    // Executa a atualização no SQLite
    db.prepare(`
      UPDATE recebimentos
      SET ${campo} = ?
      WHERE id = ?
    `).run(valor, recebimentoId);

    console.log(`✅ Recebimento ${recebimentoId} atualizado inline: ${campo} -> ${valor}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de recebimento (PUT):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
