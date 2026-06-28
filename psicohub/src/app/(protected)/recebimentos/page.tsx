import db from "@/lib/db";
import { RecebimentosTable } from "@/components/recebimentos/RecebimentosTable";
import Link from "next/link";
import { ExportarRelatorioBtn } from "@/components/recebimentos/ExportarRelatorioBtn";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";

export const dynamic = "force-dynamic";

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
  // Filtros ativos
  const statusFiltro = searchParams.status || "todos";
  const contextoFiltro = searchParams.contexto || "todos";
  
  const now = new Date();
  const mes = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  // Montar query SQL dinâmica no SQLite
  let sql = `
    SELECT 
      r.id, 
      r.consulta_id, 
      r.paciente_id, 
      r.valor, 
      r.data_vencimento, 
      r.data_pagamento, 
      r.status, 
      r.forma_pagamento, 
      r.tipo_conta,
      COALESCE(p.nome, 'Lançamento Avulso (Extrato)') as paciente_nome,
      COALESCE(p.frequencia, 'avulso') as paciente_frequencia,
      c.data_hora as data_consulta
    FROM recebimentos r
    LEFT JOIN pacientes p ON r.paciente_id = p.id
    LEFT JOIN consultas c ON r.consulta_id = c.id
    WHERE 1=1
  `;

  const queryParams: any[] = [];

  // Aplicar filtro de status
  if (statusFiltro !== "todos") {
    sql += " AND r.status = ?";
    queryParams.push(statusFiltro);
  }

  // Aplicar filtro de contexto (PF / PJ)
  if (contextoFiltro !== "todos") {
    sql += " AND r.tipo_conta = ?";
    queryParams.push(contextoFiltro.toUpperCase());
  }

  // Aplicar filtro de Mês e Ano baseados em vencimento ou pagamento
  if (mes) {
    sql += " AND (strftime('%m', r.data_vencimento) = ? OR (r.data_pagamento IS NOT NULL AND strftime('%m', r.data_pagamento) = ?))";
    queryParams.push(mes, mes);
  }
  if (ano) {
    sql += " AND (strftime('%Y', r.data_vencimento) = ? OR (r.data_pagamento IS NOT NULL AND strftime('%Y', r.data_pagamento) = ?))";
    queryParams.push(ano, ano);
  }

  // Ordenar por vencimento (mais recente primeiro)
  sql += " ORDER BY r.data_vencimento DESC";

  // Executar query no SQLite local
  const recebimentos = db.prepare(sql).all(queryParams) as RecebimentoQuery[];

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
