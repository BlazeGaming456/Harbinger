FROM node:20-alpine
WORKDIR /app

COPY src/worker/package*.json ./
RUN npm install

COPY src/worker ./src/worker

CMD ["node", "probe-worker.js"]