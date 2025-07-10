# Use uma imagem base Node.js
FROM node:18-alpine

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie o arquivo package.json e package-lock.json
COPY package*.json ./

# Instale as dependências do projeto
# `npm ci` is generally preferred in CI/CD for its speed and reliability
RUN npm ci

# Copie o restante do código da aplicação
COPY . .

# --- ADICIONE ESTAS DUAS LINHAS PARA O ENTRYPOINT ---
# Copie o script entrypoint e torne-o executável
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Exponha a porta da aplicação (se necessário)
EXPOSE 3035

# Defina o ENTRYPOINT para seu script customizado
# Este será o primeiro comando a ser executado.
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Defina o comando padrão para iniciar a aplicação
# Este comando será passado como argumento para o ENTRYPOINT (o "$@" no script).
CMD ["npm", "start"]