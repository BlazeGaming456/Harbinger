FROM node:20-alpine
WORKDIR /app
COPY src/api/package*.json ./
RUN npm install
COPY src/api ./
COPY src/db ../db
COPY src/queues ../queues
CMD ["node", "app.js"]