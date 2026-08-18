FROM node:20-alpine
WORKDIR /app

COPY src/scheduler/package*.json ./
RUN npm install

COPY src/scheduler ./
COPY src/db ../db
COPY src/queues ../queues

CMD ["node", "index.js"]