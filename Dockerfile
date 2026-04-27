FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Cache dependencies in a separate layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only runtime source for a smaller image.
COPY server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
