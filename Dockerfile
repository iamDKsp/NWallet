# Imagem oficial leve do Node.js
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3950

# Copiar arquivos do projeto
COPY package*.json ./
COPY server.js ./
COPY notifications.cjs ./
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY data/ ./data/
RUN mkdir -p /app/data && chown -R node:node /app/data

# Instalação segura de dependências
RUN npm ci --omit=dev --ignore-scripts

# Expor a porta
EXPOSE 3950

# Usuário sem privilégios de root para segurança
USER node

# Verificação de integridade (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3950) + '/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); })"

# Inicialização
CMD ["node", "server.js"]
