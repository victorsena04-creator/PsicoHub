import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * API para atualizar ou criar metas financeiras (Meta PJ e Teto PF)
 * para o mês e ano corrente no SQLite local.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meta_prolabore, meta_despesas, mes: bodyMes, ano: bodyAno } = body;

    const now = new Date();
    const mes = bodyMes ? parseInt(bodyMes, 10) : now.getMonth() + 1;
    const ano = bodyAno ? parseInt(bodyAno, 10) : now.getFullYear();

    // Validar se os valores são numéricos e maiores ou iguais a zero
    const valProlabore = parseFloat(meta_prolabore);
    const valDespesas = parseFloat(meta_despesas);

    if (isNaN(valProlabore) || isNaN(valDespesas)) {
      return NextResponse.json(
        { success: false, error: "Os valores informados para as metas devem ser números válidos." },
        { status: 400 }
      );
    }

    // Verificar se já existe um registro de meta cadastrado para o mês/ano corrente
    const metaExistente = db.prepare(
      "SELECT id FROM metas WHERE mes = ? AND ano = ?"
    ).get(mes, ano) as { id: string } | undefined;

    if (metaExistente) {
      // Atualizar o registro existente no SQLite
      db.prepare(`
        UPDATE metas 
        SET meta_prolabore = ?, meta_despesas = ? 
        WHERE mes = ? AND ano = ?
      `).run(valProlabore, valDespesas, mes, ano);
      console.log(`✅ Metas do mês ${mes}/${ano} atualizadas: PJ = R$ ${valProlabore}, PF = R$ ${valDespesas}`);
    } else {
      // Inserir um novo registro no SQLite
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO metas (id, meta_prolabore, meta_despesas, mes, ano)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, valProlabore, valDespesas, mes, ano);
      console.log(`✅ Novas metas do mês ${mes}/${ano} criadas: PJ = R$ ${valProlabore}, PF = R$ ${valDespesas}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de metas financeiras:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
