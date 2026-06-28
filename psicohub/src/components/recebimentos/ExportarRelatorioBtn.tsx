"use client";

interface Recebimento {
  id: string;
  paciente_nome: string;
  paciente_frequencia: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  tipo_conta: string;
}

interface ExportarRelatorioBtnProps {
  recebimentos: Recebimento[];
}

export function ExportarRelatorioBtn({ recebimentos }: ExportarRelatorioBtnProps) {
  const handleExport = () => {
    if (recebimentos.length === 0) {
      alert("Não há dados de recebimentos para exportar.");
      return;
    }

    // Cabeçalhos do CSV
    const headers = [
      "Paciente",
      "Frequência",
      "Valor (R$)",
      "Vencimento",
      "Data de Pagamento",
      "Status",
      "Forma de Pagamento",
      "Contexto"
    ];

    // Linhas do CSV
    const rows = recebimentos.map((r) => [
      r.paciente_nome,
      r.paciente_frequencia,
      r.valor.toFixed(2).replace(".", ","),
      r.data_vencimento ? new Date(r.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "",
      r.data_pagamento ? new Date(r.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "",
      r.status.toUpperCase(),
      r.forma_pagamento || "",
      r.tipo_conta === "PJ" ? "PJ (Consultório)" : "PF (Pessoal)"
    ]);

    // Montar conteúdo do CSV com codificação UTF-8 com BOM para abrir perfeitamente no Excel
    const csvContent = "\uFEFF" + [
      headers.join(";"), 
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_recebimentos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Exportar Relatório
    </button>
  );
}
