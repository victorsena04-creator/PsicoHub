import { PlanejamentoDashboard } from "@/components/planejamento/PlanejamentoDashboard";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

// Força o Next.js a rodar as consultas a cada carregamento de página
export const dynamic = 'force-dynamic';

export default async function PlanejamentoPage() {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  const now = new Date();
  const mesAtualStr = String(now.getMonth() + 1).padStart(2, '0');
  const anoAtualStr = String(now.getFullYear());

  // --- QUERIES NO CLOUD FIRESTORE (Executadas em paralelo) ---
  const [dividasSnapshot, investimentosSnapshot, recebimentosSnapshot, despesasSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("dividas").where("status", "==", "ativa").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("investimentos").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("recebimentos").where("status", "==", "pago").where("tipo_conta", "==", "PJ").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("despesas").where("tipo_conta", "==", "PJ").get()
  ]);

  const dividas = dividasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any
  }));

  // Ordenar por vencimento
  dividas.sort((a, b) => {
    const vA = a.vencimento_proxima_parcela || "";
    const vB = b.vencimento_proxima_parcela || "";
    return vA.localeCompare(vB);
  });

  const investimentos = investimentosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any
  }));

  // Ordenar decrescente por saldo acumulado
  investimentos.sort((a, b) => (b.saldo_acumulado || 0) - (a.saldo_acumulado || 0));

  // --- PROCESSAMENTO NO SERVIDOR (JS IN-MEMORY) ---

  const filtrarPorMesAno = (dataStr: string) => {
    if (!dataStr) return false;
    const datePart = dataStr.split(" ")[0]; // Pega YYYY-MM-DD
    const [cAno, cMes] = datePart.split("-");
    return cAno === anoAtualStr && cMes === mesAtualStr;
  };

  const recebidoPJ = recebimentosSnapshot.docs
    .map(doc => doc.data())
    .filter(r => r.data_pagamento && filtrarPorMesAno(r.data_pagamento))
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  const despesasPJ = despesasSnapshot.docs
    .map(doc => doc.data())
    .filter(d => d.data && filtrarPorMesAno(d.data))
    .reduce((sum, d) => sum + (d.valor || 0), 0);

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
