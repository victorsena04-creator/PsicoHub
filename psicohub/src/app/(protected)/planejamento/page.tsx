import db from "@/lib/db";
import { PlanejamentoDashboard } from "@/components/planejamento/PlanejamentoDashboard";

// Força o Next.js a rodar as consultas no banco local em todo carregamento de página
// garantindo que não exibiremos dados desatualizados (cache) do build.
export const dynamic = 'force-dynamic';

export default async function PlanejamentoPage() {
  // 1. Pegar o mês e o ano atuais no formato numérico e de texto de dois dígitos
  const now = new Date();
  const mesAtualStr = String(now.getMonth() + 1).padStart(2, '0');
  const anoAtualStr = String(now.getFullYear());

  // 2. Buscar as Dívidas Ativas no banco SQLite usando prepare e all
  const dividas = db.prepare(`
    SELECT * FROM dividas 
    WHERE status = 'ativa'
    ORDER BY vencimento_proxima_parcela ASC
  `).all() as any[];

  // 3. Buscar os Investimentos cadastrados no banco SQLite
  const investimentos = db.prepare(`
    SELECT * FROM investimentos
    ORDER BY saldo_acumulado DESC
  `).all() as any[];

  // 4. Calcular o lucro líquido de Pessoa Jurídica (PJ) do mês atual:
  // Recebido PJ no mês atual (apenas o que está com status 'pago')
  const resRecebido = db.prepare(`
    SELECT SUM(valor) as total FROM recebimentos 
    WHERE status = 'pago'
      AND tipo_conta = 'PJ'
      AND strftime('%m', data_pagamento) = ?
      AND strftime('%Y', data_pagamento) = ?
  `).get(mesAtualStr, anoAtualStr) as { total: number | null };
  const recebidoPJ = resRecebido?.total || 0;

  // Despesas PJ no mês atual
  const resDespesas = db.prepare(`
    SELECT SUM(valor) as total FROM despesas 
    WHERE tipo_conta = 'PJ'
      AND strftime('%m', data) = ?
      AND strftime('%Y', data) = ?
  `).get(mesAtualStr, anoAtualStr) as { total: number | null };
  const despesasPJ = resDespesas?.total || 0;

  // Lucro líquido = Recebido PJ - Despesas PJ
  const lucroLiquido = recebidoPJ - despesasPJ;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-background font-semibold">
          Planejamento Financeiro
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Gerencie suas dívidas ativas, suas aplicações em investimentos e simule a distribuição do lucro líquido PJ do mês.
        </p>
      </div>

      <PlanejamentoDashboard 
        dividas={dividas}
        investimentos={investimentos}
        lucroLiquido={lucroLiquido}
      />
    </div>
  );
}
