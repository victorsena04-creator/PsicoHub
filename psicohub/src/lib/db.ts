import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

declare global {
  var _sqliteDb: Database.Database | undefined;
}

let DB_PATH: string;

if (process.env.NODE_ENV === 'production') {
  // Em produção, vamos salvar na pasta AppData/Application Support do sistema
  // para evitar que o instalador do Electron limpe os dados nas atualizações.
  let appDataDir = '';
  if (process.platform === 'win32') {
    appDataDir = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    appDataDir = path.join(process.env.HOME || '', 'Library', 'Application Support');
  } else {
    appDataDir = path.join(process.env.HOME || '', '.config');
  }

  const targetFolder = path.join(appDataDir, 'PsicoHub');
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }
  DB_PATH = path.join(targetFolder, 'psicohub.db');
} else {
  // Em desenvolvimento, mantém local na raiz do projeto
  DB_PATH = path.join(process.cwd(), 'psicohub.db');
}

const SCHEMA_PATH = path.join(process.cwd(), 'database', 'schema.sql');

let db: Database.Database;

if (process.env.NODE_ENV === 'production') {
  db = new Database(DB_PATH);
} else {
  if (!global._sqliteDb) {
    global._sqliteDb = new Database(DB_PATH);
  }
  db = global._sqliteDb;
}

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

/**
 * Semeia o banco de dados com registros fictícios de demonstração caso o banco esteja vazio.
 * Isso garante que o usuário tenha dados reais para testar o sistema logo no primeiro uso.
 */
function seedDb(dbInstance: Database.Database) {
  try {
    // 1. Semear usuários padrão caso não existam
    const userCountResult = dbInstance.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };
    if (!userCountResult || userCountResult.count === 0) {
      console.log('🌱 Semeando usuários de demonstração e suporte...');
      const hashSupport = crypto.createHash('sha256').update('2307').digest('hex');
      const hashAdmin = crypto.createHash('sha256').update('admin').digest('hex');
      
      dbInstance.prepare(`
        INSERT INTO usuarios (id, username, password_hash, role)
        VALUES 
          ('usr-support', 'support', ?, 'suporte'),
          ('usr-admin', 'admin', ?, 'principal')
      `).run(hashSupport, hashAdmin);
      console.log('✅ Usuários semeados: support (senha 2307) e admin (senha admin).');
    }

    // Verificar se já existem pacientes cadastrados
    const countResult = dbInstance.prepare('SELECT COUNT(*) as count FROM pacientes').get() as { count: number };
    
    if (countResult && countResult.count > 0) {
      console.log('ℹ️ Banco de dados já possui dados de pacientes. Pulando semeadura de demonstração.');
      return;
    }

    // Se for ambiente de produção, não semeia os dados fictícios de demonstração
    if (process.env.NODE_ENV === 'production') {
      console.log('ℹ️ Ambiente de produção detectado. Ignorando semeadura de dados fictícios para o cliente.');
      return;
    }

    console.log('🌱 Semeando banco de dados local com dados fictícios de demonstração...');

    const runSeed = dbInstance.transaction(() => {
      // 1. Cadastrar Cartões de Crédito
      dbInstance.prepare(`
        INSERT INTO cartoes_credito (id, nome, limite, dia_fechamento, dia_vencimento, tipo_conta)
        VALUES 
          ('cartao-nubank-pf', 'Nubank PF', 10000.00, 5, 12, 'PF'),
          ('cartao-itau-pj', 'Itaú Business PJ', 15000.00, 10, 17, 'PJ')
      `).run();

      // 2. Cadastrar Pacientes de Demonstração
      dbInstance.prepare(`
        INSERT INTO pacientes (id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario, ativo)
        VALUES 
          ('pac-roberto', 'Roberto Silva', '(11) 98888-8888', 'roberto.silva@email.com', 150.00, 'semanal', 1, '14:00', 1),
          ('pac-juliana', 'Juliana Costa', '(11) 97777-7777', 'juliana.costa@email.com', 180.00, 'semanal', 2, '10:00', 1),
          ('pac-carlos', 'Carlos Souza', '(11) 96666-6666', 'carlos.souza@email.com', 200.00, 'quinzenal', 3, '16:00', 1),
          ('pac-mariana', 'Mariana Oliveira', '(11) 95555-5555', 'mariana.oliveira@email.com', 150.00, 'avulso', 4, '11:00', 1)
      `).run();

      // 3. Cadastrar Configurações de Agenda Recorrente
      dbInstance.prepare(`
        INSERT INTO agenda_base (id, paciente_id, dia_semana, horario, ativo)
        VALUES 
          ('base-roberto', 'pac-roberto', 1, '14:00', 1),
          ('base-juliana', 'pac-juliana', 2, '10:00', 1),
          ('base-carlos', 'pac-carlos', 3, '16:00', 1)
      `).run();

      // Obter mês e ano corrente dinamicamente
      const now = new Date();
      const ano = now.getFullYear();
      const mesNum = now.getMonth() + 1;
      const mesStr = String(mesNum).padStart(2, '0');

      // Cadastrar Metas Financeiras para o mês atual
      dbInstance.prepare(`
        INSERT INTO metas (id, meta_prolabore, meta_despesas, mes, ano)
        VALUES ('meta-mes-atual', 12000.00, 6000.00, ?, ?)
      `).run(mesNum, ano);

      // 4. Cadastrar Consultas do Mês Atual (algumas passadas realizadas/faltas, outras futuras agendadas)
      dbInstance.prepare(`
        INSERT INTO consultas (id, paciente_id, data_hora, valor, status, e_excecao)
        VALUES 
          ('cons-roberto-1', 'pac-roberto', '${ano}-${mesStr}-01 14:00', 150.00, 'realizada', 0),
          ('cons-juliana-1', 'pac-juliana', '${ano}-${mesStr}-02 10:00', 180.00, 'realizada', 0),
          ('cons-carlos-1', 'pac-carlos', '${ano}-${mesStr}-03 16:00', 200.00, 'realizada', 0),
          ('cons-roberto-2', 'pac-roberto', '${ano}-${mesStr}-08 14:00', 150.00, 'realizada', 0),
          ('cons-juliana-2', 'pac-juliana', '${ano}-${mesStr}-09 10:00', 180.00, 'cancelada', 0),
          ('cons-roberto-3', 'pac-roberto', '${ano}-${mesStr}-15 14:00', 150.00, 'realizada', 0),
          ('cons-juliana-3', 'pac-juliana', '${ano}-${mesStr}-16 10:00', 180.00, 'falta', 0),
          ('cons-carlos-2', 'pac-carlos', '${ano}-${mesStr}-17 16:00', 200.00, 'realizada', 0),
          ('cons-roberto-4', 'pac-roberto', '${ano}-${mesStr}-22 14:00', 150.00, 'agendada', 0),
          ('cons-juliana-4', 'pac-juliana', '${ano}-${mesStr}-23 10:00', 180.00, 'agendada', 0),
          ('cons-mariana-1', 'pac-mariana', '${ano}-${mesStr}-24 11:00', 150.00, 'agendada', 1)
      `).run();

      // 5. Cadastrar Recebimentos Vinculados às Consultas Realizadas
      dbInstance.prepare(`
        INSERT INTO recebimentos (id, consulta_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, tipo_conta)
        VALUES 
          ('rec-roberto-1', 'cons-roberto-1', 'pac-roberto', 150.00, '${ano}-${mesStr}-01', '${ano}-${mesStr}-01', 'pago', 'Pix', 'PJ'),
          ('rec-juliana-1', 'cons-juliana-1', 'pac-juliana', 180.00, '${ano}-${mesStr}-02', '${ano}-${mesStr}-02', 'pago', 'Pix', 'PJ'),
          ('rec-carlos-1', 'cons-carlos-1', 'pac-carlos', 200.00, '${ano}-${mesStr}-03', '${ano}-${mesStr}-04', 'pago', 'Transferência', 'PJ'),
          ('rec-roberto-2', 'cons-roberto-2', 'pac-roberto', 150.00, '${ano}-${mesStr}-08', '${ano}-${mesStr}-08', 'pago', 'Pix', 'PJ'),
          ('rec-roberto-3', 'cons-roberto-3', 'pac-roberto', 150.00, '${ano}-${mesStr}-15', '${ano}-${mesStr}-15', 'pago', 'Pix', 'PJ'),
          ('rec-carlos-2', 'cons-carlos-2', 'pac-carlos', 200.00, '${ano}-${mesStr}-17', '${ano}-${mesStr}-18', 'pago', 'Pix', 'PJ'),
          
          -- Atrasados e Pendentes
          ('rec-juliana-3', 'cons-juliana-3', 'pac-juliana', 180.00, '${ano}-${mesStr}-16', NULL, 'atrasado', NULL, 'PJ'),
          ('rec-roberto-4', 'cons-roberto-4', 'pac-roberto', 150.00, '${ano}-${mesStr}-22', NULL, 'pendente', NULL, 'PJ'),
          ('rec-juliana-4', 'cons-juliana-4', 'pac-juliana', 180.00, '${ano}-${mesStr}-23', NULL, 'pendente', NULL, 'PJ')
      `).run();

      // 6. Cadastrar Despesas
      dbInstance.prepare(`
        INSERT INTO despesas (id, descricao, valor, data, categoria, origem, tipo_conta, meio_pagamento, cartao_id, fatura_mes, fatura_ano)
        VALUES 
          ('des-aluguel', 'Aluguel do Consultório', 1500.00, '${ano}-${mesStr}-05', 'aluguel', 'manual', 'PJ', 'conta_corrente', NULL, NULL, NULL),
          ('des-internet', 'Internet Copasa Consultório', 120.00, '${ano}-${mesStr}-10', 'internet', 'manual', 'PJ', 'conta_corrente', NULL, NULL, NULL),
          ('des-google-ads', 'Campanha Google Ads', 450.00, '${ano}-${mesStr}-12', 'marketing', 'manual', 'PJ', 'cartao_credito', 'cartao-itau-pj', ?, ?),
          ('des-alimentacao-1', 'Almoço Restaurante iFood', 65.00, '${ano}-${mesStr}-03', 'alimentacao', 'manual', 'PF', 'conta_corrente', NULL, NULL, NULL),
          ('des-alimentacao-2', 'Supermercado Carrefour', 850.00, '${ano}-${mesStr}-07', 'alimentacao', 'manual', 'PF', 'cartao_credito', 'cartao-nubank-pf', ?, ?),
          ('des-sistema', 'Software Prontuários (PsicoManager)', 99.00, '${ano}-${mesStr}-15', 'ferramentas', 'manual', 'PJ', 'cartao_credito', 'cartao-itau-pj', ?, ?),
          ('des-imposto', 'Imposto Simples Nacional DAS', 350.00, '${ano}-${mesStr}-20', 'impostos', 'manual', 'PJ', 'conta_corrente', NULL, NULL, NULL),
          ('des-lazer', 'Cinema e Uber', 80.00, '${ano}-${mesStr}-14', 'outros', 'manual', 'PF', 'cartao_credito', 'cartao-nubank-pf', ?, ?)
      `).run(
        mesNum, ano, // google-ads (PJ)
        mesNum, ano, // supermercado (PF)
        mesNum, ano, // software (PJ)
        mesNum, ano  // cinema (PF)
      );

      // 7. Cadastrar Dívidas de Exemplo
      dbInstance.prepare(`
        INSERT INTO dividas (id, credor, valor_total, valor_pago, valor_parcela, parcelas_totais, parcelas_pagas, destinacao_mensal, status, tipo_conta, vencimento_proxima_parcela)
        VALUES 
          ('div-reforma', 'Banco do Brasil (Reforma do Consultório)', 12000.00, 3000.00, 500.00, 24, 6, 200.00, 'ativa', 'PF', '${ano}-${mesStr}-28'),
          ('div-notebook', 'Parcelamento Notebook Dell', 5000.00, 2500.00, 500.00, 10, 5, 0.00, 'ativa', 'PF', '${ano}-${mesStr}-15')
      `).run();

      // 8. Cadastrar Investimentos de Exemplo
      dbInstance.prepare(`
        INSERT INTO investimentos (id, nome_ativo, tipo_investimento, saldo_acumulado, meta_aporte_mensal, tipo_conta)
        VALUES 
          ('inv-reserva', 'Poupança Reserva de Emergência', 'reserva_emergencia', 8500.00, 500.00, 'PF'),
          ('inv-renda-fixa', 'CDB 100% CDI Liquidez Diária', 'renda_fixa', 3000.00, 200.00, 'PJ')
      `).run();

      // 9. Cadastrar Regras de Classificação para Extratos
      dbInstance.prepare(`
        INSERT INTO regras_classificacao (id, termo_chave, categoria, tipo_conta)
        VALUES 
          ('reg-ifood', 'ifood', 'alimentacao', 'PF'),
          ('reg-uber', 'uber', 'outros', 'PF'),
          ('reg-das', 'simples nacional', 'impostos', 'PJ'),
          ('reg-copasa', 'copasa', 'aluguel', 'PJ'),
          ('reg-cemig', 'cemig', 'aluguel', 'PJ')
      `).run();
    });

    runSeed();
    console.log('🌱 Semeadura de dados de teste concluída com sucesso!');
  } catch (error) {
    console.error('🚨 Erro ao semear banco de dados:', error);
  }
}

export function initDb() {
  try {
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);
      console.log('✅ Banco de dados SQLite inicializado.');
      
      // Criar a tabela de configurações chave-valor se não existir
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            chave TEXT PRIMARY KEY,
            valor TEXT
          )
        `).run();
        console.log("✅ Tabela 'configuracoes_sistema' criada com sucesso.");
      } catch (e) {
        console.error("🚨 Erro ao criar tabela configuracoes_sistema:", e);
      }
      
      // Migração dinâmica: adicionar coluna categoria à tabela recebimentos se não existir
      try {
        db.prepare("ALTER TABLE recebimentos ADD COLUMN categoria TEXT").run();
        console.log("✅ Coluna 'categoria' adicionada à tabela recebimentos com sucesso.");
      } catch (e: any) {
        // Ignora se a coluna já existir (o SQLite lançará erro de coluna duplicada)
        if (!e.message.includes("duplicate column name")) {
          console.error("🚨 Erro ao rodar migração em recebimentos:", e);
        }
      }

      // Migração dinâmica: adicionar coluna google_event_id à tabela consultas se não existir
      try {
        db.prepare("ALTER TABLE consultas ADD COLUMN google_event_id TEXT").run();
        console.log("✅ Coluna 'google_event_id' adicionada à tabela consultas com sucesso.");
      } catch (e: any) {
        // Ignora se a coluna já existir
        if (!e.message.includes("duplicate column name")) {
          console.error("🚨 Erro ao rodar migração de google_event_id em consultas:", e);
        }
      }

      // Rodar a semeadura de dados de demonstração
      seedDb(db);
    } else {
      console.warn(`⚠️ Aviso: Arquivo de esquema não encontrado em: ${SCHEMA_PATH}`);
    }
  } catch (error) {
    console.error('🚨 Erro ao inicializar o banco de dados:', error);
    throw error;
  }
}

// Não inicializar ou rodar migrações concorrentes durante o build do Next.js.
// O banco será inicializado dinamicamente no primeiro acesso em tempo de execução (runtime).
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  initDb();
}

export default db;
