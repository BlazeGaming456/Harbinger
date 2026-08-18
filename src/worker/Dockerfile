FROM node:20-alpine
WORKDIR /app

COPY src/worker/package*.json ./
RUN npm install

COPY src/worker ./
COPY src/db ../db
COPY src/queues ../queues

CMD ["node", "probe-worker.js"]