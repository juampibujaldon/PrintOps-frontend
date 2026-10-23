# Build del front.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# nginx sirve el build y hace de proxy de /api y /ws al backend.
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# PORT lo asigna Railway; BACKEND_URL apunta al backend (idealmente por la red privada).
ENV PORT=8080 \
    BACKEND_URL=http://printops-backend.railway.internal:8080 \
    NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_URL)$"
EXPOSE 8080
