FROM node:20-alpine

# Install curl for healthcheck support
RUN apk add --no-cache curl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads backups

EXPOSE 5000
CMD ["node", "server.js"]
