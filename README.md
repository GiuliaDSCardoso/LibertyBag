# LibertyBag 🌸

**LibertyBag** é um aplicativo de finanças pessoais completo, acolhedor e extremamente simples de usar, feito sob medida para 3 pessoas da família (tendo a mãe como usuária de referência absoluta: zero jargão técnico, letras legíveis, botões grandes e ajuda em todas as telas).

Funciona na web e no celular (Android e iPhone) como um **PWA instalável** e **100% offline-first**.

---

## 🚀 Como rodar o projeto no computador

Pré-requisitos: Node.js 18+ instalado.

```bash
# 1. Instalar as dependências
npm install

# 2. Rodar em modo de desenvolvimento
npm run dev

# 3. Rodar os testes automatizados (Vitest)
npm test

# 4. Gerar versão final de produção (com Service Worker / PWA ativo)
npm run build
npm run preview
```

> **Dica para testar no celular na mesma rede Wi-Fi:**
> Rode `npx vite --host` (ou `npm run build && npx vite preview --host`) e abra no celular o endereço `http://192.168.x.x:5173` (ou `:4173`) mostrado no terminal.

---

## 📱 Como instalar o PWA na tela inicial do celular

### No Android (Chrome)
1. Abra o endereço do LibertyBag no **Google Chrome** do celular.
2. Toque no menu de três pontinhos **⋮** no canto superior direito (ou no banner inferior *"Adicionar LibertyBag à tela inicial"*).
3. Toque em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. Pronto! O ícone da flor amarela e azul aparecerá junto aos seus aplicativos e funcionará mesmo em **modo avião**.

### No iPhone / iOS (Safari)
1. Abra o endereço do LibertyBag no **Safari** do iPhone.
2. Toque no botão **Compartilhar** (o quadradinho com uma seta apontando para cima, na barra inferior).
3. Role a lista para baixo e toque em **"Adicionar à Tela de Início"**.
4. Toque em **"Adicionar"** no canto superior direito.
5. Pronto! O LibertyBag abrirá em tela cheia, sem barras do navegador, e funcionará 100% offline.

---

## 🎨 Identidade Visual e Regras de UX

- **Linguagem humana:**
  - *Dinheiro que entrou* (nunca "Receitas")
  - *Dinheiro que saiu* (nunca "Despesas")
  - *Sobrou este mês* (nunca "Saldo projetado" ou "Fluxo de caixa")
  - *Quanto posso gastar* (nunca "Orçamento")
  - *Cofrinho* (nunca "Meta de poupança")
- **Anote em 3 toques:** `1. Valor` → `2. Entrou ou Saiu` → `3. Toque na categoria` (salva na hora!).
- **Sem medo de errar:** Toda ação exibe o aviso **"Feito! Desfazer"** por alguns segundos.
- **Ajuda `?` em todas as telas:** Explicação curta em no máximo 3 frases com um exemplo prático.
- **Acessibilidade:** Alvos de toque ≥ 48px, opção de aumentar o tamanho da letra (*Normal, Grande, Bem grande*) e temas *Praia* (claro) e *Noite* (azul profundo).
