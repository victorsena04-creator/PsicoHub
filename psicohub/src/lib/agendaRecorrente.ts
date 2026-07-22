import { firestore } from "@/lib/firebaseAdmin";
import { criarEventoAgenda } from "./googleCalendar";


/**
 * Função para auto-gerar consultas recorrentes para uma determinada semana
 * caso elas ainda não existam no Firestore (Multi-Tenant).
 * A semana é identificada a partir de sua Segunda-feira.
 * 
 * @param segundaFeira Objeto Date correspondente à Segunda-feira da semana de referência
 * @param consultorioId ID do consultório proprietário dos dados
 */
export async function gerarConsultasRecorrentesParaSemana(segundaFeira: Date, consultorioId: string) {
  try {
    const seg = new Date(segundaFeira);
    const dom = new Date(segundaFeira);
    dom.setDate(segundaFeira.getDate() + 6);

    const dataSegISO = seg.toISOString().split("T")[0];
    const dataDomISO = dom.toISOString().split("T")[0];

    // 1, 2 e 3. Buscar pacientes ativos, agendas base e consultas em paralelo
    const [pacientesSnapshot, agendaSnapshot, consultasSnapshot] = await Promise.all([
      firestore
        .collection("consultorios")
        .doc(consultorioId)
        .collection("pacientes")
        .where("ativo", "==", 1)
        .get(),
      firestore
        .collection("consultorios")
        .doc(consultorioId)
        .collection("agenda_base")
        .where("ativo", "==", 1)
        .get(),
      firestore
        .collection("consultorios")
        .doc(consultorioId)
        .collection("consultas")
        .where("e_excecao", "==", 0)
        .get()
    ]);

    if (pacientesSnapshot.empty) {
      return { success: true, geradas: 0, mensagem: "Nenhum paciente ativo encontrado." };
    }

    const pacientesAtivos = new Set(pacientesSnapshot.docs.map(d => d.id));
    const pacientesValorMap = new Map(pacientesSnapshot.docs.map(d => [d.id, d.data().valor_consulta]));
    const pacientesNomeMap = new Map(pacientesSnapshot.docs.map(d => [d.id, d.data().nome]));

    // Filtra para manter apenas agendas de pacientes que estão ativos
    const agendasBases = agendaSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as any }))
      .filter(ab => pacientesAtivos.has(ab.paciente_id));

    // Filtra localmente no JS pelas consultas que caem na semana civil atual
    const consultasSemana = consultasSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as any }))
      .filter(c => {
        const dataPart = (c.data_hora || "").split(" ")[0];
        return dataPart >= dataSegISO && dataPart <= dataDomISO;
      });

    const pacientesComConsulta = new Set(consultasSemana.map(c => c.paciente_id));

    // 1. Identificar e planejar novas consultas recorrentes a serem criadas
    interface NovaConsulta {
      ref: any;
      paciente_id: string;
      paciente_nome: string;
      data_hora: string;
      valor: number;
    }
    const novasConsultas: NovaConsulta[] = [];

    for (const agenda of agendasBases) {
      // Se já existe uma consulta normal do paciente na semana, não faz nada
      if (pacientesComConsulta.has(agenda.paciente_id)) {
        continue;
      }

      // Se não existe, calcula a data específica do atendimento correspondente ao dia da semana
      const dataAtendimento = new Date(segundaFeira);
      // dia_semana no banco: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
      const offset = agenda.dia_semana === 0 ? 6 : agenda.dia_semana - 1;
      dataAtendimento.setDate(segundaFeira.getDate() + offset);

      const dataAtendimentoISO = dataAtendimento.toISOString().split("T")[0];
      const dataHoraConsulta = `${dataAtendimentoISO} ${agenda.horario}`;

      // Referência para inserir a nova consulta padrão
      const consultaRef = firestore
        .collection("consultorios")
        .doc(consultorioId)
        .collection("consultas")
        .doc();

      const valorConsulta = pacientesValorMap.get(agenda.paciente_id) || 150.00;
      const pacienteNome = pacientesNomeMap.get(agenda.paciente_id) || "Paciente";

      novasConsultas.push({
        ref: consultaRef,
        paciente_id: agenda.paciente_id,
        paciente_nome: pacienteNome,
        data_hora: dataHoraConsulta,
        valor: valorConsulta
      });
    }

    // 2. Criar os eventos no Google Agenda e salvar no Firestore
    const batch = firestore.batch();
    let consultasGeradasCount = 0;

    for (const nc of novasConsultas) {
      let googleEventId: string | null = null;
      try {
        googleEventId = await criarEventoAgenda(consultorioId, {
          paciente_nome: nc.paciente_nome,
          data_hora: nc.data_hora,
          valor: nc.valor
        });
      } catch (gErr) {
        console.warn(`⚠️ Falha ao criar compromisso no Google Agenda para recorrente ${nc.paciente_nome}:`, gErr);
      }

      batch.set(nc.ref, {
        id: nc.ref.id,
        paciente_id: nc.paciente_id,
        data_hora: nc.data_hora,
        valor: nc.valor,
        status: "agendada",
        e_excecao: 0,
        google_event_id: googleEventId || null,
        created_at: new Date().toISOString()
      });

      consultasGeradasCount++;
    }

    if (consultasGeradasCount > 0) {
      await batch.commit();
      console.log(`🌱 Auto-geradas e integradas ${consultasGeradasCount} consultas recorrentes para a semana de ${dataSegISO} a ${dataDomISO} no Firestore.`);
    }

    // 3. Sincronização Retroativa: Encontrar consultas existentes sem google_event_id na semana
    const consultasSemGoogle = consultasSemana.filter(c => 
      !c.google_event_id && 
      pacientesAtivos.has(c.paciente_id) && 
      c.status !== "cancelada"
    );

    let retroativasSincronizadas = 0;
    for (const c of consultasSemGoogle) {
      const pacienteNome = pacientesNomeMap.get(c.paciente_id) || "Paciente";
      try {
        const googleEventId = await criarEventoAgenda(consultorioId, {
          paciente_nome: pacienteNome,
          data_hora: c.data_hora,
          valor: c.valor
        });

        if (googleEventId) {
          await firestore
            .collection("consultorios")
            .doc(consultorioId)
            .collection("consultas")
            .doc(c.id)
            .update({ google_event_id: googleEventId });

          retroativasSincronizadas++;
        }
      } catch (gErr) {
        console.warn(`⚠️ Falha ao sincronizar retroativamente consulta ${c.id}:`, gErr);
      }
    }

    if (retroativasSincronizadas > 0) {
      console.log(`🔄 Sincronizadas retroativamente ${retroativasSincronizadas} consultas no Google Agenda.`);
    }

    return { success: true, geradas: consultasGeradasCount, retroativas: retroativasSincronizadas };
  } catch (error: any) {
    console.error("🚨 Erro ao auto-gerar consultas recorrentes no Firestore:", error);
    throw error;
  }
}

