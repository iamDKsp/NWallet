# NWallet 💳✨

Aplicação de gestão financeira pessoal de alta fidelidade com design iOS (simulação Apple iPhone 15 Pro HIG), animações fluidas em Framer Motion, inclinação 3D interativa de cartões de crédito e assistente de IA (**Nexus**) integrado.

---

## 🚀 Como Executar Localmente

```bash
# Iniciar o servidor
npm start
# ou
npm run dev
# ou
node server.js
```

Depois abra no navegador: **[http://localhost:5173](http://localhost:5173)**

---

## 🌟 Principais Recursos

- **Design iOS Autêntico:**
  - Efeito de vidro dinâmico (`ios-glass` e `ios-glass-dark`).
  - Notificações push simuladas no topo com transições elásticas (*spring physics*).
  - Dock flutuante inferior de navegação HIG.
  
- **Cartões de Crédito com Física 3D:**
  - Cartões Santander, NuBank e Banco do Brasil.
  - Efeito 3D Tilt (`tiltX`, `tiltY`) interativo com giroscópio de celular e arraste de mouse.
  - Gestos de swipe para editar, excluir ou selecionar cartões.

- **Gestão Financeira Completa:**
  - Listagem de transações recentes categorizadas (Pix, Alimentação, Streaming, Compras).
  - Modal para adicionar despesas e receitas.
  - Leitura e importação de comprovantes.
  - Gráficos e estatísticas de gastos.

- **Assistente de Inteligência Artificial (Nexus):**
  - Botão holográfico pulsante na barra inferior.
  - Integração via endpoint `/api/chat` para conversas financeiras inteligentes em tempo real.

---

## 🐳 Como Subir no Portainer

### Método 1: Via Stack (Git Repository) - Recomendado

1. No painel do seu **Portainer**, vá em **Stacks** > **Add stack**.
2. Defina o nome da stack (ex: `nwallet`).
3. Em **Build method**, selecione **Repository**.
4. Preencha os campos:
   * **Repository URL:** `https://github.com/iamDKsp/NWallet.git`
   * **Repository reference:** `refs/heads/main`
   * **Compose path:** `docker-compose.yml`
   *(Se o seu repositório for privado, ative a opção **Authentication** e informe seu usuário do GitHub e Personal Access Token).*
5. Clique em **Deploy the stack**.

### Método 2: Via Docker CLI / Compose Manual

```bash
docker compose up -d --build
```

A aplicação ficará disponível na porta `3950`:
👉 `http://SEU_IP_DO_SERVIDOR:3950`