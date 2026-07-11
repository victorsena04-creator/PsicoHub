-- Ativar verificação de chaves estrangeiras no SQLite
PRAGMA foreign_keys = ON;

-- Tabela: pacientes (Cadastro de pacientes atendidos)
CREATE TABLE IF NOT EXISTS pacientes (
  id TEXT PRIMARY KEY, -- Identificador único do paciente (UUID)
  nome TEXT NOT NULL, -- Nome completo do paciente
  whatsapp TEXT, -- Telefone de contato
  email TEXT, -- Endereço de e-mail
  valor_consulta REAL NOT NULL, -- Valor cobrado por cada sessão
  frequencia TEXT CHECK (frequencia IN ('semanal', 'quinzenal', 'mensal', 'avulso')), -- Frequência dos atendimentos
  dia_semana INTEGER, -- Dia fixo da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
  horario TEXT, -- Horário de atendimento padrão (formato "HH:MM")
  ativo INTEGER DEFAULT 1, -- Indica se o cadastro está ativo (1=Sim, 0=Não)
  created_at TEXT DEFAULT (datetime('now', 'localtime')) -- Data de criação do cadastro
);

-- Tabela: agenda_base (Configurações fixas da agenda recorrente)
CREATE TABLE IF NOT EXISTS agenda_base (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE, -- Vínculo com a tabela de pacientes
  dia_semana INTEGER, -- Dia fixo do atendimento
  horario TEXT, -- Horário do atendimento
  ativo INTEGER DEFAULT 1 -- Indica se este horário padrão está ativo
);

-- Tabela: consultas (Sessões agendadas ou realizadas)
CREATE TABLE IF NOT EXISTS consultas (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE, -- Vínculo com o paciente
  data_hora TEXT NOT NULL, -- Data e hora do atendimento (formato "YYYY-MM-DD HH:MM")
  valor REAL NOT NULL, -- Valor cobrado pela consulta específica
  status TEXT CHECK (status IN ('agendada', 'realizada', 'cancelada', 'falta')) DEFAULT 'agendada', -- Situação do atendimento
  e_excecao INTEGER DEFAULT 0, -- Indica se foi um agendamento fora do padrão (1=Exceção, 0=Normal)
  google_event_id TEXT, -- Identificador do evento correspondente no Google Agenda
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabela: recebimentos (Dinheiro a receber e recebido)
CREATE TABLE IF NOT EXISTS recebimentos (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  consulta_id TEXT REFERENCES consultas(id) ON DELETE SET NULL, -- Consulta que gerou este recebimento (opcional)
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE, -- Vínculo com o paciente
  valor REAL NOT NULL, -- Valor financeiro
  data_vencimento TEXT, -- Data limite para pagamento (formato "YYYY-MM-DD")
  data_pagamento TEXT, -- Data em que o pagamento foi realizado
  status TEXT CHECK (status IN ('pendente', 'pago', 'atrasado')) DEFAULT 'pendente', -- Situação do recebimento
  forma_pagamento TEXT, -- Método de pagamento (Ex: Pix, Dinheiro, Cartão)
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PJ', -- Caixa de destino: PF (Pessoal) ou PJ (Profissional)
  categoria TEXT -- Categoria da receita para controle financeiro
);

-- Tabela: cartoes_credito (Cadastro de cartões de crédito para controle financeiro)
CREATE TABLE IF NOT EXISTS cartoes_credito (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  nome TEXT NOT NULL, -- Nome do cartão (Ex: "Nubank PF", "Itaú PJ")
  limite REAL DEFAULT 0, -- Limite de crédito total
  dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31), -- Dia do fechamento da fatura
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31), -- Dia do vencimento do pagamento
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL -- Caixa responsável pelo pagamento (PF ou PJ)
);

-- Tabela: despesas (Saídas de dinheiro de conta corrente ou cartões)
CREATE TABLE IF NOT EXISTS despesas (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  descricao TEXT NOT NULL, -- Descrição da compra ou pagamento
  valor REAL NOT NULL, -- Valor financeiro
  data TEXT NOT NULL, -- Data do gasto (formato "YYYY-MM-DD")
  categoria TEXT CHECK (categoria IN ('aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros')), -- Categoria da despesa
  origem TEXT CHECK (origem IN ('manual', 'importacao')) DEFAULT 'manual', -- Se foi lançada manualmente ou lida de extrato PDF
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL, -- Conta pagadora: PF (Pessoal) ou PJ (Profissional)
  meio_pagamento TEXT CHECK (meio_pagamento IN ('conta_corrente', 'cartao_credito')) DEFAULT 'conta_corrente', -- Onde foi gasto
  cartao_id TEXT REFERENCES cartoes_credito(id) ON DELETE SET NULL, -- Cartão utilizado (se aplicável)
  fatura_mes INTEGER, -- Mês da fatura em que a despesa entra
  fatura_ano INTEGER -- Ano da fatura em que a despesa entra
);

-- Tabela: regras_classificacao (Regras para classificar compras importadas de extratos)
CREATE TABLE IF NOT EXISTS regras_classificacao (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  termo_chave TEXT NOT NULL UNIQUE, -- Termo do extrato (Ex: "ifood", "posto ipiranga")
  categoria TEXT CHECK (categoria IN ('aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros')) NOT NULL, -- Categoria padrão sugerida
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL -- Conta pagadora sugerida (PF ou PJ)
);

-- Tabela: metas (Metas financeiras mensais)
CREATE TABLE IF NOT EXISTS metas (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  meta_prolabore REAL, -- Meta de retiradas/lucro PJ para o mês
  meta_despesas REAL, -- Meta máxima de gastos PF no mês
  mes INTEGER, -- Mês (1 a 12)
  ano INTEGER -- Ano
);

-- Tabela: dividas (Controle de passivos e quitação)
CREATE TABLE IF NOT EXISTS dividas (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  credor TEXT NOT NULL, -- Nome do credor (Ex: Empréstimo Caixa, Cartão de Crédito)
  valor_total REAL NOT NULL, -- Saldo total devedor original
  valor_pago REAL DEFAULT 0, -- Total já quitado
  valor_parcela REAL, -- Valor da parcela recorrente
  parcelas_totais INTEGER, -- Quantidade de parcelas contratadas
  parcelas_pagas INTEGER DEFAULT 0, -- Parcelas já liquidadas
  destinacao_mensal REAL DEFAULT 0, -- Valor mensal reservado para quitação acelerada
  status TEXT CHECK (status IN ('ativa', 'quitada')) DEFAULT 'ativa', -- Status da dívida
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PF', -- Responsabilidade da dívida: PF ou PJ
  vencimento_proxima_parcela TEXT -- Vencimento da próxima parcela (formato "YYYY-MM-DD")
);

-- Tabela: investimentos (Controle de ativos e aportes)
CREATE TABLE IF NOT EXISTS investimentos (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  nome_ativo TEXT NOT NULL, -- Nome do investimento (Ex: "Tesouro IPCA 2029", "Poupança Reserva")
  tipo_investimento TEXT CHECK (tipo_investimento IN ('reserva_emergencia', 'renda_fixa', 'renda_variavel', 'outros')), -- Tipo de ativo
  saldo_acumulado REAL DEFAULT 0, -- Saldo total acumulado no ativo
  meta_aporte_mensal REAL DEFAULT 0, -- Valor planejado para investir mensalmente
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PF' -- Origem dos recursos: PF ou PJ
);

-- Tabela: usuarios (Credenciais de acesso local do ERP)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY, -- Identificador único do usuário
  username TEXT NOT NULL UNIQUE, -- Nome de usuário único para login
  password_hash TEXT NOT NULL, -- Senha criptografada em hash SHA-256
  role TEXT CHECK (role IN ('principal', 'suporte')) NOT NULL, -- Perfil: principal (psicólogo) ou suporte (técnico)
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabela: termos_ignorar_extrato (Termos de extrato a serem ignorados pelo robô extrator)
CREATE TABLE IF NOT EXISTS termos_ignorar_extrato (
  id TEXT PRIMARY KEY, -- Identificador único (UUID)
  termo TEXT NOT NULL UNIQUE, -- Descrição exata ou termo que o robô deve ignorar
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

