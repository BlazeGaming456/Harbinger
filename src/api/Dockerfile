FROM node:20-alpine
WORKDIR /app
COPY src/api/package*.json ./
RUN npm install
COPY src/api ./src/api
COPY src/db ./src/db
COPY src/queues ./src/queues
CMD ["node", "src/api/app.js"]