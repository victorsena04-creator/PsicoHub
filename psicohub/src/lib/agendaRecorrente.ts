import db from "@/lib/db";
import crypto from "crypto";

/**
 * Função para auto-gerar consultas recorrentes para uma determinada semana
 * caso elas ainda não existam no banco de dados.
 * A semana é identificada a partir de sua Segunda-feira.
 * 
 * @param segundaFeira Objeto Date correspondente à Segunda-feira da semana de referência
 */
export function gerarConsultasRecorrentesParaSemana(segundaFeira: Date) {
  try {
    // 1. Obter os limites da semana (Segunda a Domingo) em formato YYYY-MM-DD
    const seg = new Date(segundaFeira);
    const dom = new Date(segundaFeira);
    dom.setDate(segundaFeira.getDate() + 6);

    const dataSegISO = seg.toISOString().split("T")[0];
    const dataDomISO = dom.toISOString().split("T")[0];

    // 2. Buscar todas as agendas bases ativas de pacientes que também estejam ativos
    const agendasBases = db.prepare(`
      SELECT ab.id as base_id, ab.paciente_id, ab.dia_semana, ab.horario, p.valor_consulta
      FROM agenda_base ab
      JOIN pacientes p ON ab.paciente_id = p.id
      WHERE ab.ativo = 1 AND p.ativo = 1
    `).all() as {
      base_id: string;
      paciente_id: string;
      dia_semana: number;
      horario: string;
      valor_consulta: number;
    }[];

    if (agendasBases.length === 0) {
      return { success: true, geradas: 0, mensagem: "Nenhuma agenda recorrente ativa encontrada." };
    }

    let consultasGeradasCount = 0;

    // Executa tudo dentro de uma transação SQLite para melhor performance e consistência
    const runTransaction = db.transaction(() => {
      for (const agenda of agendasBases) {
        // Verificar se já existe uma consulta normal (não exceção) cadastrada para este paciente na semana
        const consultaExistente = db.prepare(`
          SELECT id FROM consultas
          WHERE paciente_id = ?
            AND substr(data_hora, 1, 10) >= ?
            AND substr(data_hora, 1, 10) <= ?
            AND e_excecao = 0
        `).get(agenda.paciente_id, dataSegISO, dataDomISO);

        // Se já existe uma consulta normal do paciente na semana, não faz nada
        if (consultaExistente) {
          continue;
        }

        // Se não existe, calcula a data específica do atendimento correspondente ao dia da semana
        const dataAtendimento = new Date(segundaFeira);
        // dia_semana no banco: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
        // Como o nosso loop de semana civil começa na segunda-feira:
        // Se dia_semana for 0 (Domingo), o offset é de +6 dias em relação à segunda.
        // Se for de 1 a 6, o offset é (dia_semana - 1) dias.
        const offset = agenda.dia_semana === 0 ? 6 : agenda.dia_semana - 1;
        dataAtendimento.setDate(segundaFeira.getDate() + offset);

        const dataAtendimentoISO = dataAtendimento.toISOString().split("T")[0];
        const dataHoraConsulta = `${dataAtendimentoISO} ${agenda.horario}`;

        // Inserir a nova consulta padrão no banco
        db.prepare(`
          INSERT INTO consultas (id, paciente_id, data_hora, valor, status, e_excecao)
          VALUES (?, ?, ?, ?, 'agendada', 0)
        `).run(
          crypto.randomUUID(),
          agenda.paciente_id,
          dataHoraConsulta,
          agenda.valor_consulta
        );

        consultasGeradasCount++;
      }
    });

    runTransaction();

    if (consultasGeradasCount > 0) {
      console.log(`🌱 Auto-geradas ${consultasGeradasCount} consultas recorrentes para a semana de ${dataSegISO} a ${dataDomISO}.`);
    }

    return { success: true, geradas: consultasGeradasCount };
  } catch (error: any) {
    console.error("🚨 Erro ao auto-gerar consultas recorrentes:", error);
    throw error;
  }
}
