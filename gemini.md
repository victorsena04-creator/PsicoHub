# Gemini - Constituição do Projeto PsicoHub

## Esquemas de Dados

### Formatos de Entrada
*[A definir durante Fase 1]*

### Formatos de Saída
*[A definir durante Fase 1]*

## Regras Comportamentais

### Princípios Fundamentais
1. **Confiabilidade sobre Velocidade**: Priorizar soluções determinísticas
2. **Dados Primeiro**: Definir esquemas antes de codificar
3. **Nunca Adivinhar**: Lógica de negócios deve ser explícita
4. **Autocorreção**: Sistema deve ser capaz de se reparar

### Invariantes Arquiteturais
- LLMs são probabilísticos; lógica de negócios deve ser determinística
- Variáveis de ambiente em `.env`
- Arquivos temporários em `.tmp/`
- Dados primários em fonte definida

### Regras de Negócio
*[A definir durante Fase 1]*

## Arquitetura

### Estrutura de Pastas
```
├── gemini.md          # Mapa do Projeto e Rastreamento de Estado
├── .env               # Chaves de API/Segredos
├── .env.example       # Exemplo de configurações
├── .gitignore         # Arquivos ignorados pelo Git
├── architecture/      # Camada 1: POPs (O "Como Fazer")
├── tools/             # Camada 3: Scripts Python (Os "Motores")
└── .tmp/              # Bancada de Trabalho Temporária
```

### Camadas A.N.T.
1. **Arquitetura (`architecture/`)**: POPs técnicos em Markdown
2. **Navegação**: Tomada de decisão e roteamento
3. **Ferramentas (`tools/`)**: Scripts Python determinísticos

## Estado Atual do Projeto
- Fase: 1 - Visão (em andamento)
- Status: Aguardando informações completas do usuário sobre o app
- Próximo Marco: Definição do esquema de dados após receber detalhes do projeto

### Estrutura Implementada
- Arquivos de memória: task_plan.md, findings.md, progress.md
- Constituição: gemini.md
- Configurações: .env.example, .gitignore
- Arquitetura: architecture/ com README.md e exemplo_pop.md
- Ferramentas: tools/ com README.md e exemplo.py
- Temporários: .tmp/ (vazio)

### Próximas Ações
1. Receber informações completas do usuário
2. Atualizar gemini.md com esquemas de dados
3. Iniciar Fase 2: Link (Conectividade)

## Log de Mudanças
- [Data Atual]: Criação inicial do gemini.md