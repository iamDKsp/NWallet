# Mellisa Wallet 💳✨

Aplicação de gestão financeira pessoal com design iOS (simulação iPhone 15 Pro HIG), animações fluidas em Framer Motion, tilt 3D em cartões e assistente de IA integrado (**Nexus**).

## 🚀 Como Executar Localmente

Como o projeto já foi configurado para você, basta rodar:

```bash
npm start
# ou
npm run dev
# ou
node server.js
```

Depois abra no navegador: **[http://localhost:5173](http://localhost:5173)**

---

## 🌟 O que está incluído e funcionando:

1. **Design iOS iPhone 15 Pro:**
   - Efeito de vidro (`ios-glass`, `ios-glass-dark`).
   - Notificações push dinâmicas no topo com animações spring.
   - Dock de navegação inferior flutuante.

2. **Cartões de Crédito Interativos:**
   - Santander, NuBank e Banco do Brasil.
   - Rotação e inclinação 3D (`tiltX`, `tiltY`) com suporte a giroscópio do celular e arraste com o mouse.
   - Gestos de swipe para editar/excluir.

3. **Gestão Financeira:**
   - Histórico de transações recentes categorizadas (Pix, Alimentação, Streaming, Compras).
   - Modal para cadastrar nova despesa / receita.
   - Modal para importar comprovantes com simulação de leitura inteligente.

4. **Assistente de Inteligência Artificial (Nexus):**
   - Botão central pulsante da IA.
   - Chat integrado respondendo em tempo real via rota `/api/chat` com respostas personalizadas.
