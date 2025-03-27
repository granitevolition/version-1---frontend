# Use Node.js LTS version with full Alpine image (not slim)
FROM node:16-alpine as build-stage

# Install npm and ensure npx is available
RUN apk add --no-cache --update npm

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . /app/

# Set CI=false to prevent treating warnings as errors in build
ENV CI=false

# Build the application
RUN npm run build

# Production environment
FROM nginx:stable-alpine
COPY --from=build-stage /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
