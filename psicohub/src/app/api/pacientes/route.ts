import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

/**
 * Rota de API para gerenciar pacientes no banco de dados SQLite local.
 * API (Application Programming Interface): Uma "ponte" que permite que o nosso frontend
 * (a tela do site) se comunique com o nosso backend (o código que roda no servidor e acessa o banco).
 */
export async function POST(request: Request) {
  try {
    // Ler os dados enviados pela tela no formato JSON (formato de texto estruturado para envio de dados)
    const body = await request.json();
    const { nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario } = body;

    // Validar se o nome foi preenchido
    if (!nome) {
      return NextResponse.json(
        { success: false, error: "O nome do paciente é obrigatório." },
        { status: 400 }
      );
    }

    // Gerar um identificador único (UUID) para o paciente
    const id = crypto.randomUUID();

    // Executar a query SQL para inserir o novo paciente no banco SQLite
    db.prepare(`
      INSERT INTO pacientes (id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      nome,
      whatsapp || null,
      email || null,
      parseFloat(valor_consulta || 0),
      frequencia || "semanal",
      dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario || "14:00"
    );

    // Criar a agenda recorrente padrão (agenda base) vinculada a este paciente
    db.prepare(`
      INSERT INTO agenda_base (id, paciente_id, dia_semana, horario, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      crypto.randomUUID(),
      id,
      dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario || "14:00"
    );

    console.log(`✅ Paciente "${nome}" cadastrado com sucesso.`);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("🚨 Erro na API de cadastro de paciente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const pacientes = db.prepare("SELECT id, nome, valor_consulta, dia_semana, horario FROM pacientes WHERE ativo = 1 ORDER BY nome").all();
    return NextResponse.json({ success: true, data: pacientes });
  } catch (error: any) {
    console.error("🚨 Erro na API de consulta de pacientes:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario } = body;

    if (!id || !nome) {
      return NextResponse.json(
        { success: false, error: "O ID e o nome do paciente são obrigatórios." },
        { status: 400 }
      );
    }

    // Atualiza o paciente no SQLite
    db.prepare(`
      UPDATE pacientes
      SET nome = ?, whatsapp = ?, email = ?, valor_consulta = ?, frequencia = ?, dia_semana = ?, horario = ?
      WHERE id = ?
    `).run(
      nome,
      whatsapp || null,
      email || null,
      parseFloat(valor_consulta || 0),
      frequencia || "semanal",
      dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario || "14:00",
      id
    );

    // Atualiza a agenda base correspondente
    db.prepare(`
      UPDATE agenda_base
      SET dia_semana = ?, horario = ?
      WHERE paciente_id = ?
    `).run(
      dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario || "14:00",
      id
    );

    console.log(`✅ Paciente "${nome}" atualizado com sucesso.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de atualização de paciente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "O ID do paciente é obrigatório." },
        { status: 400 }
      );
    }

    // Inativar no banco de dados SQLite
    db.prepare("UPDATE pacientes SET ativo = 0 WHERE id = ?").run(id);
    db.prepare("UPDATE agenda_base SET ativo = 0 WHERE paciente_id = ?").run(id);

    console.log(`✅ Paciente com ID ${id} inativado com sucesso.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de exclusão de paciente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
