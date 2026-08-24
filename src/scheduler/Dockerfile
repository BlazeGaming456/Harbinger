FROM node:20-alpine
WORKDIR /app

COPY src/scheduler/package*.json ./
RUN npm install

COPY src/scheduler ./src/scheduler
COPY src/db ./src/db
COPY src/queues ./src/queues

CMD ["node", "src/scheduler/index.js"]