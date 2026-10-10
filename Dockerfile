# Imagem oficial leve do Node.js
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5173

# Copiar arquivos do projeto
COPY package*.json ./
COPY server.js ./
COPY public/ ./public/

# Instalação segura de dependências
RUN npm install --omit=dev --ignore-scripts || true

# Expor a porta
EXPOSE 5173

# Usuário sem privilégios de root para segurança
USER node

# Verificação de integridade (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5173) + '/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); })"

# Inicialização
CMD ["node", "server.js"]
