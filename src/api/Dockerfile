FROM node:20-alpine
WORKDIR /app
COPY src/api/package*.json ./
RUN npm install
COPY src/api ./src/api
CMD ["node", "src/api/app.js"]