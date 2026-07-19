import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";

export const dynamic = 'force-dynamic';

/**
 * Rota de API para gerenciar pacientes no Cloud Firestore (Multi-Tenant).
 */
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
    const { nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario } = body;

    if (!nome) {
      return NextResponse.json(
        { success: false, error: "O nome do paciente é obrigatório." },
        { status: 400 }
      );
    }

    // Referência para o novo paciente dentro do consultório do usuário
    const pacienteRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc();

    const novoPaciente = {
      id: pacienteRef.id,
      nome,
      whatsapp: whatsapp || null,
      email: email || null,
      valor_consulta: parseFloat(valor_consulta || 0),
      frequencia: frequencia || "semanal",
      dia_semana: dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario: horario || "14:00",
      ativo: 1,
      created_at: new Date().toISOString()
    };

    // Salvar paciente
    await pacienteRef.set(novoPaciente);

    // Referência para a agenda base do paciente
    const agendaRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("agenda_base")
      .doc();

    await agendaRef.set({
      id: agendaRef.id,
      paciente_id: pacienteRef.id,
      dia_semana: dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario: horario || "14:00",
      ativo: 1
    });

    console.log(`✅ Paciente "${nome}" cadastrado com sucesso no Firestore (Consultório: ${sessao.consultorioId}).`);
    return NextResponse.json({ success: true, id: pacienteRef.id });
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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const snapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .where("ativo", "==", 1)
      .get();

    const pacientes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        valor_consulta: data.valor_consulta,
        dia_semana: data.dia_semana,
        horario: data.horario
      };
    });

    // Ordenação alfabética no servidor Next.js
    pacientes.sort((a, b) => a.nome.localeCompare(b.nome));

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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario } = body;

    if (!id || !nome) {
      return NextResponse.json(
        { success: false, error: "O ID e o nome do paciente são obrigatórios." },
        { status: 400 }
      );
    }

    // Referência do paciente
    const pacienteRef = firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc(id);

    await pacienteRef.update({
      nome,
      whatsapp: whatsapp || null,
      email: email || null,
      valor_consulta: parseFloat(valor_consulta || 0),
      frequencia: frequencia || "semanal",
      dia_semana: dia_semana !== undefined ? parseInt(dia_semana) : 1,
      horario: horario || "14:00"
    });

    // Atualizar a agenda base associada ao paciente
    const agendaSnapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("agenda_base")
      .where("paciente_id", "==", id)
      .get();

    const batch = firestore.batch();
    agendaSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        dia_semana: dia_semana !== undefined ? parseInt(dia_semana) : 1,
        horario: horario || "14:00"
      });
    });
    await batch.commit();

    console.log(`✅ Paciente "${nome}" atualizado com sucesso no Firestore.`);
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
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "O ID do paciente é obrigatório." },
        { status: 400 }
      );
    }

    // Inativar no Firestore
    await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("pacientes")
      .doc(id)
      .update({ ativo: 0 });

    // Inativar a agenda base correspondente
    const agendaSnapshot = await firestore
      .collection("consultorios")
      .doc(sessao.consultorioId)
      .collection("agenda_base")
      .where("paciente_id", "==", id)
      .get();

    const batch = firestore.batch();
    agendaSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { ativo: 0 });
    });
    await batch.commit();

    console.log(`✅ Paciente com ID ${id} e agenda base inativados no Firestore.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Erro na API de exclusão de paciente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
