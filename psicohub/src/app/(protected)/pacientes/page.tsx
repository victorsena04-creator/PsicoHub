import db from "@/lib/db";
import { AddPatientModal } from "@/components/pacientes/AddPatientModal";
import { PacientesTable } from "@/components/pacientes/PacientesTable";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";

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
  // Pegar mês e ano a partir dos parâmetros de busca
  const now = new Date();
  const mes = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  // Buscar os pacientes e contar quantas sessões/consultas eles têm no período ativo
  let query = `
    SELECT p.*, COUNT(c.id) as sessoes_periodo
    FROM pacientes p
    LEFT JOIN consultas c ON p.id = c.paciente_id
      ${mes ? "AND strftime('%m', c.data_hora) = ?" : ""}
      ${ano ? "AND strftime('%Y', c.data_hora) = ?" : ""}
    WHERE p.ativo = 1
    GROUP BY p.id
    ORDER BY p.nome
  `;

  const queryParams: any[] = [];
  if (mes) queryParams.push(mes);
  if (ano) queryParams.push(ano);

  const pacientes = db.prepare(query).all(queryParams) as Paciente[];

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
