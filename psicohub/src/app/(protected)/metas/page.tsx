import db from "@/lib/db";
import { MetasForm } from "@/components/metas/MetasForm";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    mes?: string;
    ano?: string;
  };
}

const mesesMap: { [key: string]: string } = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro"
};

export default async function MetasPage({ searchParams }: PageProps) {
  const now = new Date();
  
  // Pegar mês e ano a partir dos parâmetros de busca
  const mesStr = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, "0");
  const anoStr = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  // As metas requerem um mês e ano específicos, se vier "Todos" (vazio) colocamos o mês/ano corrente como fallback
  const mesFinal = mesStr || String(now.getMonth() + 1).padStart(2, "0");
  const anoFinal = anoStr || String(now.getFullYear());

  const mesNum = parseInt(mesFinal, 10);
  const anoNum = parseInt(anoFinal, 10);

  // 1. Buscar metas registradas no SQLite para o período selecionado
  const metas = db.prepare(`
    SELECT meta_prolabore, meta_despesas FROM metas 
    WHERE mes = ? AND ano = ?
  `).get(mesNum, anoNum) as { meta_prolabore: number; meta_despesas: number } | undefined;

  const metaProlabore = metas?.meta_prolabore || 0;
  const metaDespesas = metas?.meta_despesas || 0;

  // 2. Calcular o total recebido no caixa PJ no período selecionado
  const resRecebidoPJ = db.prepare(`
    SELECT SUM(valor) as total FROM recebimentos
    WHERE status = 'pago' 
      AND tipo_conta = 'PJ'
      AND strftime('%m', data_pagamento) = ?
      AND strftime('%Y', data_pagamento) = ?
  `).get(mesFinal, anoFinal) as { total: number | null };
  const recebidoPJ = resRecebidoPJ?.total || 0;

  // 3. Calcular o total de despesas pessoais PF no período selecionado
  const resDespesasPF = db.prepare(`
    SELECT SUM(valor) as total FROM despesas
    WHERE tipo_conta = 'PF'
      AND strftime('%m', data) = ?
      AND strftime('%Y', data) = ?
  `).get(mesFinal, anoFinal) as { total: number | null };
  const despesasPF = resDespesasPF?.total || 0;

  // Obter texto amigável do período selecionado
  const mesNome = mesesMap[mesFinal] || mesFinal;
  const mesTexto = `${mesNome} de ${anoFinal}`;

  return (
    <div className="w-full">
      {/* Cabeçalho da Página via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Metas & Limites"
        subtitulo="Defina e acompanhe suas metas de retirada e tetos de gastos para o período."
      />

      {/* Componente de formulário e controle de metas */}
      <MetasForm
        metaProlaboreInicial={metaProlabore}
        metaDespesasInicial={metaDespesas}
        recebidoPJ={recebidoPJ}
        despesasPF={despesasPF}
        mesTexto={mesTexto}
        mes={mesNum}
        ano={anoNum}
      />
    </div>
  );
}
