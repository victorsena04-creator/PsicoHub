# PsicoHub - ERP para Psicólogos Autônomos

## Visão Geral

Sistema completo para gestão de consultórios de psicologia, projetado para profissionais autônomos que atendem pacientes de forma recorrente.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilização | Tailwind CSS |
| Banco de Dados | SQLite Local (Banco local no HD/SSD) |
| Autenticação | Login Local Simples (Credenciais Locais) |
| Hospedagem | Localhost (Rodando direto na máquina) |
| Drag and Drop | @dnd-kit/core |
| PDF/OFX Parser | pdf-parse / ofx-js (V2) |

---

## Módulos do Sistema

### 1. Dashboard
- Seletor de visualização superior: **Geral (Integrado)**, **PF (Pessoal)** ou **PJ (Consultório)**
- Cards de indicadores financeiros filtráveis (Previsto, Faturado, Recebido, A Receber, Despesas, Lucro Líquido)
- Cards de indicadores de agenda (Agendadas, Realizadas, Cancelamentos, Taxa de Comparecimento)
- Barra de progresso de metas (Negócio PJ vs. Vida PF)

### 2. Gestão de Pacientes
- Listagem com busca
- Cadastro/edição completo
- Auto-criação de agenda base ao cadastrar

### 3. Agenda Inteligente
- Configuração fixa (agenda base)
- Kanban semanal com drag-and-drop
- Geração automática de consultas
- Ações: Realizada, Cancelada, Falta
- Exceções temporárias (semana atual)

### 4. Controle Financeiro (Contas PF / PJ)
- Abas de visualização: **Fluxo Consolidado**, **Pessoa Física (PF)** e **Pessoa Jurídica (PJ)**
- Totais de entrada, saída e saldo líquido em destaque por conta
- Separação de receitas e despesas por tipo de conta

### 5. Contas a Receber
- Filtros: Todos / Pendentes / Pagos / Atrasados
- Filtros por Conta de Destino (**PF** ou **PJ**)
- Ação "Marcar como Pago" (registrando em qual conta o dinheiro caiu)

### 6. Despesas e Importação Inteligente (Motor Interno)
- Formulário manual com campo de seleção: **Tipo de Despesa (PF ou PJ)**
- Listagem por categoria e por conta
- **Importação de Extrato em PDF (Motor Integrado)**:
  - Baseado no extrator em Python `extratos-bancarios` que lê o PDF e gera lançamentos.
  - **Mecanismo de Dupla Validação (Double-Pass)**: O PDF é lido duas vezes (por tabelas estruturadas e por texto corrido com regex) e os dados são comparados. Qualquer diferença de lançamentos ou valores emite um erro de consistência para garantir 100% de precisão antes de salvar.
  - **Fluxo de Classificação e Aprendizado**:
    - O motor tenta classificar os lançamentos cruzando a descrição com as regras salvas.
    - Se um lançamento não tiver classificação conhecida, o app exibe uma tela especial de conciliação.
    - A cliente seleciona a categoria e a conta (PF/PJ) para o lançamento não classificado.
    - Ao salvar, o sistema cria um novo padrão na base para classificar lançamentos futuros automaticamente.

### 9. Controle de Cartões de Crédito (PF e PJ)
- Cadastro de cartões de crédito (nome, limite, dia de vencimento, dia de fechamento, conta PF ou PJ).
- Lançamento de despesas específicas do cartão (sem misturar com os extratos de conta corrente).
- Visualização de fatura (aberta, fechada, paga) separada por conta.
- Lançamento de pagamento da fatura no fluxo de caixa (tratado como transferência, evitando duplicar despesas individuais).

### 7. Metas Financeiras
- Formulário mensal segregado:
  - Meta de Pró-labore / Faturamento (PJ)
  - Meta de Despesas Pessoais (PF)
- Barras de progresso com indicadores visuais individuais e unificados

### 8. Planejamento (Dívidas & Investimentos)
- Cadastro e visualização de Dívidas (Valor total, credor, parcelas quitadas, valor mensal destinado para quitação)
- Cadastro e acompanhamento de Investimentos (Reserva de emergência, renda fixa, etc., saldo acumulado e meta de investimento mensal)
- Painel de simulação para destinação de saldo líquido (ex: "Sobrou R$ X, destinar quanto para dívidas e quanto para investimentos?")

---

## Estrutura de Banco de Dados (SQLite Local)

Como rodamos localmente no HD/SSD, o banco de dados será um arquivo SQLite local. Os IDs serão UUIDs gerados no backend ou chaves automáticas. O campo `user_id` não é estritamente necessário para um único usuário local, mas pode ser mantido para suporte a múltiplos perfis locais.

### Tabela: pacientes
```sql
CREATE TABLE pacientes (
  id TEXT PRIMARY KEY, -- UUID em formato string
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  valor_consulta NUMERIC NOT NULL,
  frequencia TEXT CHECK (frequencia IN ('semanal', 'quinzenal', 'mensal', 'avulso')),
  dia_semana INT, -- 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  horario TEXT, -- Formato "HH:MM"
  ativo INTEGER DEFAULT 1, -- 1=True, 0=False
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

### Tabela: agenda_base
```sql
CREATE TABLE agenda_base (
  id TEXT PRIMARY KEY,
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE,
  dia_semana INT,
  horario TEXT,
  ativo INTEGER DEFAULT 1
);
```

### Tabela: consultas
```sql
CREATE TABLE consultas (
  id TEXT PRIMARY KEY,
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE,
  data_hora TEXT NOT NULL, -- ISO8601 String "YYYY-MM-DD HH:MM"
  valor NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('agendada', 'realizada', 'cancelada', 'falta')) DEFAULT 'agendada',
  e_excecao INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

### Tabela: recebimentos
```sql
CREATE TABLE recebimentos (
  id TEXT PRIMARY KEY,
  consulta_id TEXT REFERENCES consultas(id) ON DELETE SET NULL,
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_vencimento TEXT, -- ISO8601 "YYYY-MM-DD"
  data_pagamento TEXT,
  status TEXT CHECK (status IN ('pendente', 'pago', 'atrasado')) DEFAULT 'pendente',
  forma_pagamento TEXT,
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PJ' -- Destino do dinheiro
);
```

### Tabela: despesas
```sql
CREATE TABLE despesas (
  id TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data TEXT NOT NULL, -- ISO8601 "YYYY-MM-DD"
  categoria TEXT CHECK (categoria IN ('aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros')),
  origem TEXT CHECK (origem IN ('manual', 'importacao')) DEFAULT 'manual',
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL, -- Quem pagou a despesa (PF ou PJ)
  meio_pagamento TEXT CHECK (meio_pagamento IN ('conta_corrente', 'cartao_credito')) DEFAULT 'conta_corrente',
  cartao_id TEXT REFERENCES cartoes_credito(id) ON DELETE SET NULL, -- Se pago via cartão
  fatura_mes INTEGER, -- Para agrupar na fatura do cartão
  fatura_ano INTEGER
);
```

### Tabela: cartoes_credito
```sql
CREATE TABLE cartoes_credito (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL, -- ex: "Nubank PF", "Itaú PJ"
  limite NUMERIC DEFAULT 0,
  dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL
);
```

### Tabela: regras_classificacao
```sql
CREATE TABLE regras_classificacao (
  id TEXT PRIMARY KEY,
  termo_chave TEXT NOT NULL UNIQUE, -- termo do extrato (ex: "ifood", "posto")
  categoria TEXT CHECK (categoria IN ('aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros')) NOT NULL,
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) NOT NULL -- PF ou PJ padrão sugerido
);
```

### Tabela: metas
```sql
CREATE TABLE metas (
  id TEXT PRIMARY KEY,
  meta_prolabore NUMERIC, -- Meta de retirada PJ
  meta_despesas NUMERIC, -- Meta de gastos PF
  mes INTEGER,
  ano INTEGER
);
```

### Tabela: dividas
```sql
CREATE TABLE dividas (
  id TEXT PRIMARY KEY,
  credor TEXT NOT NULL,
  valor_total NUMERIC NOT NULL,
  valor_pago NUMERIC DEFAULT 0,
  valor_parcela NUMERIC,
  parcelas_totais INTEGER,
  parcelas_pagas INTEGER DEFAULT 0,
  destinacao_mensal NUMERIC DEFAULT 0, -- Quanto reserva por mês para quitar
  status TEXT CHECK (status IN ('ativa', 'quitada')) DEFAULT 'ativa',
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PF', -- Dívida pessoal (PF) ou comercial (PJ)
  vencimento_proxima_parcela TEXT
);
```

### Tabela: investimentos
```sql
CREATE TABLE investimentos (
  id TEXT PRIMARY KEY,
  nome_ativo TEXT NOT NULL, -- ex: "Tesouro Direto", "Reserva de Emergência"
  tipo_investimento TEXT CHECK (tipo_investimento IN ('reserva_emergencia', 'renda_fixa', 'renda_variavel', 'outros')),
  saldo_acumulado NUMERIC DEFAULT 0,
  meta_aporte_mensal NUMERIC DEFAULT 0, -- Meta de envio mensal
  tipo_conta TEXT CHECK (tipo_conta IN ('PF', 'PJ')) DEFAULT 'PF' -- Investimento pessoal (PF) ou caixa da empresa (PJ)
);
```

---

## Design

### Paleta de Cores
- Primária: Azul-petróleo (#1e3a5f)
- Secundária: Branco/Cinza claro (#f8fafc)
- Acento: Verde (#10b981), Amarelo (#f59e0b), Vermelho (#ef4444)

### Tipografia
- Fonte: Inter (Google Fonts)

### Navegação (Sidebar)
```
🏠 Dashboard
👤 Pacientes
📅 Agenda
💰 Financeiro
📋 Contas a Receber
📤 Despesas
🎯 Metas
📉 Planejamento (Dívidas & Investimentos)
```

---

## Estrutura de Pastas

```
psicohub/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── pacientes/page.tsx
│   │   ├── agenda/page.tsx
│   │   ├── financeiro/page.tsx
│   │   ├── recebimentos/page.tsx
│   │   ├── despesas/page.tsx
│   │   ├── metas/page.tsx
│   │   └── planejamento/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── agenda/
│   ├── financeiro/
│   ├── planejamento/
│   └── pacientes/
├── lib/
│   ├── db.ts
│   ├── agenda.ts
│   └── parser.ts
├── database/
│   └── schema.sql
├── hooks/
├── ideia.md
└── README.md
```

---

## MVP - Prioridade de Entrega (Revisado Local + PF/PJ + Importador)

1. ✅ Setup do projeto (Next.js + Tailwind)
2. ⬜ Configuração do banco SQLite local (`db.ts` e `schema.sql` com tabelas de Dívidas, Investimentos, Cartões e Regras)
3. ⬜ Tela de Login Local simples
4. ⬜ Cadastro de Pacientes
5. ⬜ Agenda Base + geração automática da semana
6. ⬜ Agenda Kanban com drag and drop
7. ⬜ Marcar consulta como realizada → gerar recebimento (PJ)
8. ⬜ Controle segregado de contas (PF/PJ) em receitas e despesas
9. ⬜ Dashboard com indicadores consolidados e chaves de filtro (PF/PJ)
10. ⬜ Tela de Contas a Receber (Receitas de Atendimento)
11. ⬜ Tela de Despesas manuais e Controle de Cartões de Crédito (PF/PJ)
12. ⬜ Painel de Planejamento Financeiro (Cadastro de Dívidas & Investimentos)
13. ⬜ Integração do motor Python de leitura de extratos PDF (com dupla checagem)
14. ⬜ Tela de conciliação do extrato e aprendizado de novas regras de classificação
15. ⬜ Metas financeiras segregadas