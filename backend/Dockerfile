FROM node:24-alpine
WORKDIR /app
COPY server.mjs ./
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/api/v1/health || exit 1
CMD ["node", "server.mjs"]
