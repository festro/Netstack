FROM node:20-alpine
WORKDIR /app
COPY server.js .
COPY index.html .
ENV NODE_ENV=production
EXPOSE 8090
CMD ["node", "server.js"]
