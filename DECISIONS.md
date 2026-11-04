# DECISIONS.md — Registro de Decisões do LibertyBag

Este documento registra as decisões de arquitetura, produto e experiência do usuário tomadas ao longo do projeto e o motivo de cada uma.

---

## Fase 1 — Núcleo Offline (MVP)

### 1. Valores monetários sempre em centavos (inteiros)
- **Decisão:** Todo valor em dinheiro é guardado e calculado como número inteiro em centavos (`amountCents: number`). Ex.: `R$ 45,90` é salvo como `4590`.
- **Por quê:** Operações em ponto flutuante (`float`) em JavaScript geram erros clássicos como `10.55 + 20.10 = 30.650000000000002`. Usando inteiros em centavos (e distribuindo eventual resto de divisão na 1ª parcela em compras parceladas), a soma bate sempre 100% exata.

### 2. Fluxo de Adicionar em literalmente 3 toques
- **Decisão:** Na tela `Adicionar`, digitar o valor no teclado numérico grande (1), escolher `Saiu / Entrou` (2) e tocar no card da `Categoria` (3) **já salva imediatamente** o lançamento no IndexedDB e fecha a tela exibindo o botão flutuante **"Desfazer"**. Campos como data, descrição, forma de pagamento, repetição mensal e parcelamento ficam recolhidos em **"Mais detalhes opcionais"** com padrões inteligentes (`Hoje`, `Pix`).
- **Por quê:** Reduz a fricção ao mínimo para a mãe anotar gastos do dia a dia na hora em que acontecem, sem precisar procurar um botão "Salvar" no fim de um formulário longo.

### 3. Modelagem com `spaceId`, `updatedAt` e `deletedAt` desde a Fase 1
- **Decisão:** Todas as 12 tabelas do Dexie (`users`, `spaces`, `space_members`, `accounts`, `categories`, `transactions`, `recurrences`, `budgets`, `savings_goals`, `goal_movements`, `trips`, `trip_items`) já foram criadas na versão 1 do banco local contendo `spaceId`, `updatedAt` e `deletedAt` (exclusão lógica).
- **Por quê:** Evita migrações destrutivas na Fase 2 (Planejamento/Análises) e na Fase 3 (Sincronização com Supabase + Espaços compartilhados entre os 3 usuários). Além disso, a exclusão lógica (`deletedAt`) torna o botão **"Desfazer"** instantâneo e seguro.

### 4. Conta padrão invisível na Fase 1
- **Decisão:** O seed inicial cria automaticamente uma conta padrão (`Conta Principal`) ligada ao espaço pessoal sem obrigar a pessoa a escolher "Qual conta/carteira?" a cada gasto.
- **Por quê:** Perguntar conta bancária a cada café anotado confunde quem não tem familiaridade com finanças. A forma de pagamento opcional (*Pix / Conta, Cartão, Dinheiro*) fica disponível em *Mais detalhes*.

### 5. Identificação amigável no Onboarding sem exigir senha na Fase 1
- **Decisão:** Na 3ª tela do Onboarding (que pode ser pulada e reaberta em *Mais > Como usar*), perguntamos apenas *"Como você gosta de ser chamado(a)?"* para personalizar a saudação da tela inicial.
- **Por quê:** Mantém o app 100% funcional offline desde o primeiro segundo, deixando o login com e-mail/Google para a Fase 3.

---

## Rodada de Polimento da Fase 1 (Auditoria Visual, Categorias & Microinterações)

### 6. Escala única de espaçamento, tipografia mínima de 14px (escalável em `rem`) e Grid de 2 colunas no Desktop
- **Decisão:**
  - Definimos a escala de espaçamento única (`4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 48 / 64px`) e reconfiguramos `fontSize.xs` no Tailwind para `0.875rem` (`14px` no modo Normal, `15.75px` no modo Grande e `17.5px` no modo Bem grande).
  - O container principal passou de `max-w-2xl` (672px) para `max-w-[1240px]` com `padding` fluido (`clamp(16px, 3.5vw, 48px)`) e layout em 2 colunas (`lg:grid-cols-12`) nas telas **Início**, **Lançamentos**, **Adicionar**, **Planejar**, **Análises** e **Mais**.
  - Todos os botões usam `white-space: nowrap`, altura mínima de `52px`, `padding` horizontal ≥ `16px` e `gap` de `12px` entre ícone e texto. No menu lateral (`272px`), o botão principal usa o rótulo conciso **"Novo lançamento"**.
- **Por quê:** Elimina quebras de linha indesejadas em botões, garante legibilidade para a mãe em qualquer tamanho de fonte e aproveita telas de notebook/monitor sem áreas vazias exageradas.

### 7. Criação de categoria tanto em "Mais" quanto dentro do fluxo "Adicionar" sem perder o valor digitado
- **Decisão:** Criamos o `CategoryFormModal` (bottom sheet arrastável no celular e modal no desktop) com prévia ao vivo, 24 ícones, 8 cores da identidade visual e detector de nomes parecidos (`findSimilarCategory`). No fluxo de *Adicionar*, o último item da grade é **"+ Nova categoria"**; ao salvar, se o valor já tiver sido digitado, o lançamento já é salvo automaticamente na nova categoria (ou a nova categoria fica pré-selecionada caso o valor ainda seja zero). Ao apagar uma categoria que possui lançamentos, o app oferece mover os registros para **"Outros"** com suporte completo ao botão **Desfazer**.
- **Por quê:** Impede que a pessoa perca o lançamento que estava registrando só porque sentiu falta de uma categoria nova na hora.

### 8. Microinterações sutis (150–300ms) com `motion` e respeito total a `prefers-reduced-motion`
- **Decisão:** Adicionamos transições suaves de rota (`AnimatePresence`), entrada escalonada (`stagger` de `40ms`) nos cards, contagem animada (`AnimatedMoney` de `240ms`) nos números principais, preenchimento suave na barra de orçamento e animação spring no aviso *"Desfazer"*, desligando tudo automaticamente quando o sistema operacional solicita `prefers-reduced-motion`.
- **Por quê:** Dá sensação tátil e calma de produto bem acabado sem atrasar o uso em nenhum milissegundo.

### 9. Padronização de todos os modais e do fluxo de "Adicionar" com `ModalShell`
- **Decisão:** Criamos o componente reutilizável `ModalShell` com cabeçalho fixo, rodapé fixo, corpo com rolagem vertical controlada (`overflow-y-auto overflow-x-hidden`) e altura máxima segura (`max-h-[90vh]`), aplicado em todos os popups do app (`AddTransactionModal`, `CategoryFormModal`, `TransactionDetailModal`, `HelpButton`, `ConfirmDialog` e modais da tela `Planejar`).
- **Por quê:** Garante que nenhum modal corte o topo ao rolar nem gere barra de rolagem horizontal em telas de celular (`360px`) ou desktop (`1280px–1920px`).

---

## Fase 2 — Planejamento, Análises e Exportação

### 10. Planejamento reunido em 4 abas simples (Cofrinhos, Quanto gastar, Viagens, Contas a pagar)
- **Decisão:** Na tela **Planejar**, organizamos as 4 ferramentas em abas claras com um único objetivo por vez:
  1. **Cofrinhos:** mostra automaticamente a frase *"Para chegar lá, guarde R$ X por mês"*, botões rápidos de **Guardar** e **Retirar** e celebração visual quando atinge 100%.
  2. **Quanto gastar:** orçamento mensal geral e por categoria com barra de progresso simples e botão **"Copiar do mês passado"** em 1 toque.
  3. **Viagens:** orçamento dividido nas 5 partes clássicas (*Passagem, Hospedagem, Comida, Passeios, Extras*) com vínculo opcional a um Cofrinho.
  4. **Contas a pagar:** lista de contas mensais com botão **"Paguei!"** que cria o lançamento do mês e já avança o próximo vencimento em 1 mês (tudo com suporte ao botão **Desfazer**).
- **Por quê:** Mantém cada tela limpa, sem misturar metas de longo prazo com contas do mês, respeitando a regra de zero jargão financeiro.

### 11. Análises com explicação transparente ("Por que estou vendo isso?") e Exportação CSV/PDF offline
- **Decisão:** Na tela **Análises**, combinamos o gráfico de rosca (`Recharts`) com barras horizontais legíveis, comparação direta com o mês anterior em frases do dia a dia e sugestões gentis baseadas em regras locais. Cada sugestão tem o botão **"Por que estou vendo isso?"** que mostra exatamente a soma usada pelo aplicativo. Em **Mais**, adicionamos a exportação offline para planilha **CSV** (com BOM UTF-8 e separador `;` para abrir direto no Excel) e relatório **PDF** para impressão.
- **Por quê:** Dá transparência total para quem não tem costume com gráficos financeiros e garante que a família possa guardar cópias dos seus dados a qualquer momento.

### 12. Parcelamento completo (Crédito / Pix Parcelado, Entrada, Juros e Repetição por Meses) + Ativação com Enter
- **Decisão:**
  - Criamos `calculateInstallmentPlan` em `transactionService.ts` suportando **Pix**, **Cartão de Crédito**, **Pix Parcelado**, **Débito** e **Dinheiro**.
  - Permite informar se **deu uma entrada à vista e parcelou o resto** (criando o registro da Entrada hoje com `installment.current = 0` e as $N$ parcelas nos meses seguintes) e se **teve juros** (permitindo digitar o valor fixo de cada parcela ou o total com juros, calculando automaticamente os centavos de juros e mostrando o resumo ao vivo).
  - Permite ativar **"Repete outros meses"** tanto como conta fixa mensal quanto por uma quantidade exata de meses (`Por X meses`).
  - Adicionamos suporte global à tecla `Enter` em `ModalShell.tsx` e digitação numérica pelo teclado físico em `AddTransactionModal.tsx`.
- **Por quê:** Reflete exatamente como compras reais são feitas no Brasil (entrada no Pix + restante parcelado com ou sem juros no cartão ou Pix parcelado) sem perder a simplicidade.

---

## Fase 3 — Nuvem no Supabase, Login, Sincronização LWW e Espaços da Família

### 13. Sincronização Offline-First Bidirecional com Last-Write-Wins (`updatedAt`) e RLS por `spaceId`
- **Decisão:**
  - O app continua gravando tudo primeiro no `Dexie` (IndexedDB) para nunca depender de internet.
  - Em `syncService.ts`, implementamos a sincronização bidirecional (`push` via `upsert` e `pull` com `resolveConflictLWW` baseado em `updatedAt` ISO 8601 e exclusão lógica `deletedAt`).
  - Em `supabase/schema.sql`, configuramos as 12 tabelas com **Row Level Security (RLS)** baseada na função `public.is_space_member("spaceId")`, garantindo que cada pessoa acesse apenas seu espaço pessoal e os espaços compartilhados dos quais faz parte.
  - Criamos códigos curtos de 6 caracteres (`inviteCode`, ex.: `CASA26`) para que a mãe e o namorado entrem no espaço compartilhado sem configuração técnica.
- **Por quê:** Mantém a velocidade instantânea do offline-first enquanto permite que as 3 pessoas compartilhem orçamentos, lançamentos e cofrinhos com segurança na nuvem.
