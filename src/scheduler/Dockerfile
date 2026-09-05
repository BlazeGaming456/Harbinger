FROM node:20-alpine
WORKDIR /app

COPY src/scheduler/package*.json ./
RUN npm install

COPY src/scheduler ./src/scheduler

CMD ["node", "src/scheduler/index.js"]