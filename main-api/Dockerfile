# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies ----
FROM base AS dependencies
COPY package*.json ./
RUN npm install

# ---- Build ----
FROM dependencies AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY prisma ./prisma

EXPOSE 3001
