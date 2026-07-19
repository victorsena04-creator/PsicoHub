import { AddPatientModal } from "@/components/pacientes/AddPatientModal";
import { PacientesTable } from "@/components/pacientes/PacientesTable";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    mes?: string;
    ano?: string;
  };
}

interface Paciente {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  valor_consulta: number;
  frequencia: "semanal" | "quinzenal" | "mensal" | "avulso";
  dia_semana: number;
  horario: string;
  ativo: number;
  sessoes_periodo?: number;
}

export default async function PacientesPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Pegar mês e ano a partir dos parâmetros de busca
  const now = new Date();
  const mes = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  // 1 e 2. Buscar pacientes ativos e consultas em paralelo
  const [pacientesSnapshot, consultasSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("pacientes").where("ativo", "==", 1).get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("consultas").get()
  ]);

  const pacientesList = pacientesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email,
      valor_consulta: data.valor_consulta,
      frequencia: data.frequencia,
      dia_semana: data.dia_semana,
      horario: data.horario,
      ativo: data.ativo
    } as Paciente;
  });

  const consultasCountMap: Record<string, number> = {};
  consultasSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const dataHora = data.data_hora || ""; // Formato "YYYY-MM-DD HH:MM"
    const [datePart] = dataHora.split(" ");
    if (datePart) {
      const [cAno, cMes] = datePart.split("-");
      if (cAno === ano && cMes === mes) {
        consultasCountMap[data.paciente_id] = (consultasCountMap[data.paciente_id] || 0) + 1;
      }
    }
  });

  // Mapear sessões do período para cada paciente
  const pacientes = pacientesList.map(pac => ({
    ...pac,
    sessoes_periodo: consultasCountMap[pac.id] || 0
  }));

  // Ordenar alfabeticamente por nome
  pacientes.sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="w-full">
      {/* Cabeçalho da Página via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Pacientes"
        subtitulo="Gerencie seus pacientes, contatos e preferências de sessão."
        actionButton={<AddPatientModal />}
      />

      {/* Tabela de Pacientes Cadastrados (Componente do Cliente) */}
      <PacientesTable pacientes={pacientes} />
    </div>
  );
}
