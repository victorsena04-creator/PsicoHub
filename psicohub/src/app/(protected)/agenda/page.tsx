import { KanbanBoard } from "@/components/agenda/KanbanBoard";
import Link from "next/link";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { gerarConsultasRecorrentesParaSemana } from "@/lib/agendaRecorrente";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    data?: string;
    mes?: string;
    ano?: string;
  };
}

interface ConsultaExibicao {
  id: string;
  paciente_id: string;
  paciente_nome: string;
  valor_consulta: number;
  data_hora: string;
  status: "agendada" | "realizada" | "cancelada" | "falta";
  e_excecao: number;
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Pegar parâmetros de período
  const dataParam = searchParams.data;
  const mesParam = searchParams.mes;
  const anoParam = searchParams.ano;

  let dataReferencia = new Date();
  
  if (mesParam && anoParam) {
    // Se o usuário selecionar um Mês e Ano específicos, nos posicionamos na primeira segunda-feira desse mês
    const anoNum = parseInt(anoParam);
    const mesNum = parseInt(mesParam) - 1; // 0-indexed no JS Date
    dataReferencia = new Date(anoNum, mesNum, 1);
  } else if (dataParam) {
    const parsed = new Date(dataParam + "T12:00:00"); // Forçar hora do meio dia para evitar fuso horário
    if (!isNaN(parsed.getTime())) {
      dataReferencia = parsed;
    }
  }

  // Calcular a data da Segunda-feira da semana correspondente
  const diaSemanaRef = dataReferencia.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const diffSegunda = diaSemanaRef === 0 ? -6 : 1 - diaSemanaRef;
  
  const segundaFeira = new Date(dataReferencia);
  segundaFeira.setDate(dataReferencia.getDate() + diffSegunda);
  segundaFeira.setHours(0, 0, 0, 0);

  // Auto-gerar consultas recorrentes configuradas na agenda base para a semana atual
  await gerarConsultasRecorrentesParaSemana(segundaFeira, sessao.consultorioId);

  // 1 e 2. Buscar pacientes e consultas em paralelo
  const [pacientesSnapshot, consultasSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("pacientes").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("consultas").get()
  ]);

  const pacientesMap = new Map(pacientesSnapshot.docs.map(doc => [doc.id, doc.data()]));
  const consultasAll = consultasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any
  }));

  // Gerar as datas de Segunda a Sexta daquela semana
  const diasSemana = [];
  const nomesDias = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

  for (let i = 0; i < 5; i++) {
    const dataDia = new Date(segundaFeira);
    dataDia.setDate(segundaFeira.getDate() + i);
    
    const dataISO = dataDia.toISOString().split("T")[0]; // Formato "YYYY-MM-DD"
    const diaMes = dataDia.getDate() + " " + dataDia.toLocaleString("pt-BR", { month: "short" }).replace(".", "");

    // Filtrar consultas do dia e fazer JOIN com paciente correspondente
    const consultasDia = consultasAll
      .filter(c => (c.data_hora || "").startsWith(dataISO))
      .map(c => {
        const pac = pacientesMap.get(c.paciente_id);
        return {
          id: c.id,
          paciente_id: c.paciente_id,
          data_hora: c.data_hora,
          status: c.status,
          e_excecao: c.e_excecao,
          paciente_nome: pac?.nome || "Paciente Inexistente",
          valor_consulta: c.valor !== undefined ? c.valor : (pac?.valor_consulta || 150.00)
        } as ConsultaExibicao;
      });

    // Ordenar consultas por horário (hh:mm)
    consultasDia.sort((a, b) => {
      const horaA = (a.data_hora || "").split(" ")[1] || "";
      const horaB = (b.data_hora || "").split(" ")[1] || "";
      return horaA.localeCompare(horaB);
    });

    diasSemana.push({
      nome: nomesDias[i],
      dataISO,
      diaMes,
      consultas: consultasDia,
    });
  }

  // Datas para navegação de semana (anterior e próxima)
  const dataAnterior = new Date(segundaFeira);
  dataAnterior.setDate(segundaFeira.getDate() - 7);
  const urlAnterior = `?data=${dataAnterior.toISOString().split("T")[0]}`;

  const dataProxima = new Date(segundaFeira);
  dataProxima.setDate(segundaFeira.getDate() + 7);
  const urlProxima = `?data=${dataProxima.toISOString().split("T")[0]}`;

  // Formato textual do período exibido (Ex: "14 - 20 Outubro, 2026")
  const sextaFeira = new Date(segundaFeira);
  sextaFeira.setDate(segundaFeira.getDate() + 4);
  const mesSegunda = segundaFeira.toLocaleString("pt-BR", { month: "long" });
  const mesSexta = sextaFeira.toLocaleString("pt-BR", { month: "long" });
  const ano = segundaFeira.getFullYear();

  const periodoTexto = mesSegunda === mesSexta
    ? `${segundaFeira.getDate()} - ${sextaFeira.getDate()} de ${mesSegunda.charAt(0).toUpperCase() + mesSegunda.slice(1)}, ${ano}`
    : `${segundaFeira.getDate()} de ${mesSegunda.charAt(0).toUpperCase() + mesSegunda.slice(1)} - ${sextaFeira.getDate()} de ${mesSexta.charAt(0).toUpperCase() + mesSexta.slice(1)}, ${ano}`;

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col">
      {/* Cabeçalho da Agenda via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Agenda"
        subtitulo="Acompanhe o status de sessões semanais e atendimentos agendados."
        actionButton={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-xl p-1 shadow-sm">
              <Link
                href={urlAnterior}
                className="p-1 hover:text-primary transition-colors cursor-pointer flex items-center"
                title="Semana Anterior"
              >
                <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
              </Link>
              <span className="text-xs font-semibold px-2 text-on-surface whitespace-nowrap">{periodoTexto}</span>
              <Link
                href={urlProxima}
                className="p-1 hover:text-primary transition-colors cursor-pointer flex items-center"
                title="Próxima Semana"
              >
                <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
              </Link>
            </div>
            <Link
              href="?"
              className="bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-label-md py-1.5 px-3 rounded-lg flex items-center transition-colors shadow-sm cursor-pointer"
            >
              Hoje
            </Link>
          </div>
        }
      />

      {/* Kanban Board Interativo (Componente do Cliente) */}
      <div className="flex-1 overflow-y-hidden">
        <KanbanBoard diasSemana={diasSemana} />
      </div>
    </div>
  );
}
