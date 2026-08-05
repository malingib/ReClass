FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Swap adapter for Node.js self-hosting
RUN npm install --save-dev @sveltejs/adapter-node && \
    node -e "
      const fs=require('fs');
      let c=fs.readFileSync('svelte.config.js','utf8');
      c=c.replace('adapter-vercel','adapter-node').replace('adapter: adapter()','adapter: adapter({ out: \"build\" })');
      fs.writeFileSync('svelte.config.js',c);
    " && \
    npm run build

FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3000
USER appuser
CMD ["node", "build"]
