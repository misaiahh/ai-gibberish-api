FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends python3=3.11.2-1+b1 g++=4:12.2.0-3 make=4.3-4.1
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

ENV PORT=3001

CMD ["node", ".output/server/index.mjs"]
