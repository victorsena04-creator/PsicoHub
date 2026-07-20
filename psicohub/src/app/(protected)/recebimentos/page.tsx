import { RecebimentosTable } from "@/components/recebimentos/RecebimentosTable";
import Link from "next/link";
import { ExportarRelatorioBtn } from "@/components/recebimentos/ExportarRelatorioBtn";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  searchParams: {
    status?: string;
    contexto?: string;
    mes?: string;
    ano?: string;
  };
}

interface RecebimentoQuery {
  id: string;
  consulta_id: string | null;
  paciente_id: string;
  paciente_nome: string;
  paciente_frequencia: "semanal" | "quinzenal" | "mensal" | "avulso";
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado";
  forma_pagamento: string | null;
  tipo_conta: "PF" | "PJ";
  data_consulta: string | null;
}

export default async function RecebimentosPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Filtros ativos
  const statusFiltro = searchParams.status || "todos";
  const contextoFiltro = searchParams.contexto || "todos";
  
  const now = new Date();
  const mes = searchParams.mes !== undefined ? searchParams.mes : "";
  const ano = searchParams.ano !== undefined ? searchParams.ano : "";

  const consultorioId = (sessao && sessao.consultorioId) ? sessao.consultorioId : "desperte-psique";

  let recebimentosData: any[] = [];
  let pacientesMap = new Map<string, any>();
  let consultasMap = new Map<string, any>();

  try {
    const [recebimentosSnapshot, pacientesSnapshot, consultasSnapshot] = await Promise.all([
      firestore.collection("consultorios").doc(consultorioId).collection("recebimentos").get(),
      firestore.collection("consultorios").doc(consultorioId).collection("pacientes").get(),
      firestore.collection("consultorios").doc(consultorioId).collection("consultas").get()
    ]);

    recebimentosData = recebimentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    pacientesMap = new Map(pacientesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
    consultasMap = new Map(consultasSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
  } catch (err) {
    console.error("🚨 Erro ao buscar recebimentos do consultório no Firestore:", err);
  }

  // --- FILTRAGEM E MAPEAMENTO (UNION/JOIN SIMULADO NO JS) ---

  const filtrarPorMesAno = (dataStr: string) => {
    if (!dataStr) return false;
    if (!mes && !ano) return true; // Visão Geral: Exibe tudo sem filtrar mês/ano
    const datePart = dataStr.split(" ")[0]; // Pega YYYY-MM-DD
    const [cAno, cMes] = datePart.split("-");
    const matchAno = ano ? cAno === ano : true;
    const matchMes = mes ? cMes === mes : true;
    return matchAno && matchMes;
  };

  let recebimentos = recebimentosData.map(r => {
    const pac = r.paciente_id ? pacientesMap.get(r.paciente_id) : null;
    const cons = r.consulta_id ? consultasMap.get(r.consulta_id) : null;
    
    return {
      id: r.id,
      consulta_id: r.consulta_id,
      paciente_id: r.paciente_id || "",
      paciente_nome: pac?.nome || 'Lançamento Avulso (Extrato)',
      paciente_frequencia: pac?.frequencia || 'avulso',
      valor: r.valor || 0,
      data_vencimento: r.data_vencimento || null,
      data_pagamento: r.data_pagamento || null,
      status: r.status || "pendente",
      forma_pagamento: r.forma_pagamento || null,
      tipo_conta: r.tipo_conta || "PJ",
      data_consulta: cons?.data_hora || null
    } as RecebimentoQuery;
  });

  // Aplicar filtros dinamicamente
  recebimentos = recebimentos.filter(r => {
    // Filtro de status
    if (statusFiltro !== "todos" && r.status !== statusFiltro) {
      return false;
    }

    // Filtro de contexto
    if (contextoFiltro !== "todos" && r.tipo_conta !== contextoFiltro.toUpperCase()) {
      return false;
    }

    // Filtro de data (mes/ano) baseado no vencimento ou pagamento
    if (mes || ano) {
      const matchVenc = r.data_vencimento ? filtrarPorMesAno(r.data_vencimento) : false;
      const matchPag = r.data_pagamento ? filtrarPorMesAno(r.data_pagamento) : false;
      if (!matchVenc && !matchPag) {
        return false;
      }
    }

    return true;
  });

  // Ordenar por vencimento decrescente (mais recentes primeiro)
  recebimentos.sort((a, b) => {
    const vA = a.data_vencimento || "";
    const vB = b.data_vencimento || "";
    return vB.localeCompare(vA);
  });

  return (
    <div className="w-full">
      {/* Cabeçalho via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Contas a Receber"
        subtitulo="Acompanhe o faturamento das suas consultas e gerencie as pendências de pacientes."
        actionButton={<ExportarRelatorioBtn recebimentos={recebimentos} />}
      />

      {/* Seções de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filtro de Status (Controle Segmentado) */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant">
          <Link
            href={`?status=todos&contexto=${contextoFiltro}`}
            className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${
              statusFiltro === "todos"
                ? "bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60 font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todos
          </Link>
          <Link
            href={`?status=pendente&contexto=${contextoFiltro}`}
            className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${
              statusFiltro === "pendente"
                ? "bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60 font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pendentes
          </Link>
          <Link
            href={`?status=pago&contexto=${contextoFiltro}`}
            className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${
              statusFiltro === "pago"
                ? "bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60 font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Liquidados
          </Link>
          <Link
            href={`?status=atrasado&contexto=${contextoFiltro}`}
            className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${
              statusFiltro === "atrasado"
                ? "bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60 font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Atrasados
          </Link>
        </div>

        {/* Filtro de Contexto (PF / PJ) */}
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-2 font-semibold">
            Filtrar Contexto
          </span>
          <Link
            href={`?status=${statusFiltro}&contexto=todos`}
            className={`px-3 py-1.5 rounded-md border text-label-sm transition-all ${
              contextoFiltro === "todos"
                ? "bg-surface-variant text-on-surface font-semibold border-outline-variant"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            Todos
          </Link>
          <Link
            href={`?status=${statusFiltro}&contexto=pj`}
            className={`px-3 py-1.5 rounded-md border font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-all ${
              contextoFiltro === "pj"
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            PJ - Business
          </Link>
          <Link
            href={`?status=${statusFiltro}&contexto=pf`}
            className={`px-3 py-1.5 rounded-md border font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-all ${
              contextoFiltro === "pf"
                ? "bg-secondary/10 text-secondary border-secondary/30"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            PF - Personal
          </Link>
        </div>
      </div>

      {/* Tabela de Dados Dinâmica (Componente do Cliente) */}
      <RecebimentosTable recebimentos={recebimentos} />
    </div>
  );
}
