# Use Node.js 18 Alpine como base image
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (ou yarn.lock)
COPY package*.json ./
COPY yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN yarn build

# Expor porta
EXPOSE 3001

# Comando para iniciar a aplicação
CMD [\
yarn\, \start\]
