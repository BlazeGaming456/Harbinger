FROM node:20-alpine
WORKDIR /app

COPY src/worker/package*.json ./
RUN npm install

COPY src/worker ./src/worker
COPY src/db ./src/db
COPY src/queues ./src/queues

CMD ["node", "probe-worker.js"]