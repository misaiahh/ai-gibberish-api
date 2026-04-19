FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends python3 g++ make
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

ENV PORT=3001

CMD ["node", ".output/server/index.mjs"]
