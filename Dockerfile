FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/package*.json ./
RUN npm ci --production

COPY --from=build /app/.output ./

EXPOSE 3001

ENV PORT=3001

CMD ["node", ".output/server/index.mjs"]
