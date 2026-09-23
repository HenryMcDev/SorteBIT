# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# ==============================================================================
# SorteBIT Frontend - Dockerfile Multi-Stage de Produção para Easypanel / Nginx
# ==============================================================================

# Estágio 1: Build da SPA React com Vite
FROM node:22-alpine AS builder

WORKDIR /app

# Argumentos de build para o Vite embutir no bundle durante a compilação
ARG VITE_BACKEND_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VAPID_PUBLIC_KEY

# Copia manifests para aproveitar cache do Docker
COPY package*.json ./

# Instala dependências
RUN npm ci || npm install

# Copia todo o código-fonte da aplicação
COPY . .

# Executa o build de produção com Vite gerando os assets na pasta dist/
RUN npm run build

# Estágio 2: Servidor Web Nginx Alpine ultra-leve
FROM nginx:alpine AS runner

# Copia os arquivos compilados do builder para o diretório padrão do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para suporte a SPA e gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta HTTP padrão
EXPOSE 80

# Inicia o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
