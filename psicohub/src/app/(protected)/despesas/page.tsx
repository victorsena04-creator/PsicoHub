import db from "@/lib/db";
import { DespesasDashboard } from "@/components/despesas/DespesasDashboard";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    filtro?: string;
    mes?: string;
    ano?: string;
    tab?: string;
  };
}

interface Cartao {
  id: string;
  nome: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  tipo_conta: "PF" | "PJ";
  valor_fatura?: number; // Calculado no servidor
}

interface DespesaExibicao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  origem: string;
  tipo_conta: "PF" | "PJ";
  meio_pagamento: "conta_corrente" | "cartao_credito";
  cartao_id: string | null;
  cartao_nome: string | null;
  fatura_mes: number | null;
  fatura_ano: number | null;
}

export default async function DespesasPage({ searchParams }: PageProps) {
  // Filtros ativos na URL
  const filtro = searchParams.filtro || "consolidado";
  const now = new Date();
  const mes = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());
  const mesNum = mes ? parseInt(mes) : now.getMonth() + 1;
  const anoNum = ano ? parseInt(ano) : now.getFullYear();

  const tipoContaFiltro = filtro === "consolidado" ? null : filtro.toUpperCase();

  // 1. Carregar despesas do SQLite de acordo com os filtros
  let queryDespesas = `
    SELECT d.*, c.nome as cartao_nome
    FROM despesas d
    LEFT JOIN cartoes_credito c ON d.cartao_id = c.id
    WHERE 1=1
      ${tipoContaFiltro ? `AND d.tipo_conta = '${tipoContaFiltro}'` : ''}
  `;

  const queryParams: any[] = [];
  if (mes) {
    queryDespesas += " AND strftime('%m', d.data) = ?";
    queryParams.push(mes);
  }
  if (ano) {
    queryDespesas += " AND strftime('%Y', d.data) = ?";
    queryParams.push(ano);
  }
  queryDespesas += " ORDER BY d.data DESC";

  const despesas = db.prepare(queryDespesas).all(queryParams) as DespesaExibicao[];

  // 2. Carregar cartões de crédito e calcular o total da fatura do período de cada um
  const cartoes = db.prepare("SELECT * FROM cartoes_credito ORDER BY nome").all() as Cartao[];

  const cartoesComFatura = cartoes.map(cartao => {
    // Somar despesas deste cartão na fatura do mês selecionado
    const res = db.prepare(`
      SELECT SUM(valor) as total FROM despesas
      WHERE cartao_id = ? 
        AND fatura_mes = ? 
        AND fatura_ano = ?
    `).get(cartao.id, mesNum, anoNum) as { total: number | null };

    return {
      ...cartao,
      valor_fatura: res?.total || 0
    };
  });

  return (
    <div className="w-full">
      {/* Cabeçalho da Página via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Despesas & Caixa"
        subtitulo="Gerencie seus gastos, faturas de cartão de crédito e conciliação de extratos."
      />

      {/* Componente Cliente que engloba as abas de Despesas, Faturas de Cartão e Importação de Extrato */}
      <DespesasDashboard 
        despesasIniciais={despesas} 
        cartoes={cartoesComFatura} 
        filtroInicial={filtro}
        abaInicial={searchParams.tab as any}
      />
    </div>
  );
}
