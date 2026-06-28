# Guia de Estilo Visual - PsicoHub

Este documento serve como o mapa de regras visuais do PsicoHub. Ele define as cores, fontes e espaçamentos que garantem uma interface limpa, profissional e acolhedora para psicólogos autônomos.

---

## 🎨 Paleta de Cores

As cores foram escolhidas para passar uma sensação de calma, segurança e organização profissional.

| Nome da Cor | Código Hexadecimal | Uso Principal |
| :--- | :--- | :--- |
| **Fundo Geral** | `#f8fafc` | Fundo das páginas (cinza ultra-claro, descansivo para os olhos). |
| **Fundo dos Painéis** | `#ffffff` | Fundo de cartões (cards), tabelas e caixas de texto (branco puro). |
| **Texto Principal** | `#0f172a` | Títulos e textos em destaque (slate escuro, quase preto). |
| **Texto Secundário** | `#475569` | Textos de ajuda, legendas e descrições menores (cinza escuro). |
| **Primária (Azul-petróleo)** | `#1e3a5f` | Menu lateral, botões principais de ação e cabeçalhos (marca do sistema). |
| **Destaque (Verde)** | `#10b981` | Consultas realizadas, valores pagos ou recebidos e metas batidas (sucesso). |
| **Alerta (Amarelo)** | `#f59e0b` | Consultas agendadas, pendências financeiras e valores a vencer. |
| **Perigo / Despesa (Vermelho)**| `#ef4444` | Consultas canceladas, faltas de pacientes e lançamento de despesas. |

---

## ✍️ Tipografia (Letras)

Usaremos a fonte **Inter** (disponível gratuitamente no Google Fonts), que é extremamente legível em telas de computadores e celulares.

* **Títulos Principais (ex: Título da Página)**: 24 pixels de tamanho, em negrito (Bold).
* **Títulos de Seção (ex: Nome de um Bloco/Card)**: 18 pixels de tamanho, em semi-negrito (Semi-bold).
* **Texto Comum (ex: Nomes de pacientes, tabelas)**: 14 pixels de tamanho, em peso normal (Regular).
* **Textos Menores (ex: Datas, status secundários)**: 12 pixels de tamanho, em peso leve (Light).

---

## 📐 Espaçamento e Cantos (Grid e Bordas)

Para que o design pareça moderno e "leve", usaremos as seguintes convenções:

1. **Cantos Arredondados**: Todos os cartões, botões e campos de formulário devem ter cantos levemente arredondados (`border-radius` de 8 pixels, equivalente ao `rounded-lg` do Tailwind).
2. **Sombras Suaves**: Cartões e painéis flutuantes terão uma sombra bem sutil para dar sensação de profundidade (`box-shadow` suave).
3. **Margens e Espaços (Paddings)**:
   * **Margens (Margin)**: O espaço de separação *entre* os blocos será de 16 a 24 pixels.
   * **Espaço Interno (Padding)**: O espaço de respiro *dentro* de cada bloco (ex: a distância do texto até a borda do cartão) será de 20 pixels.
