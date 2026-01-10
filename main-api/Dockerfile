# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
