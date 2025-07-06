
FROM node:20

# Definir diretório de trabalho
WORKDIR /

COPY package*.json ./
RUN npm install
COPY . .

# Expor porta
EXPOSE 3045
CMD ["npm", "start"]
