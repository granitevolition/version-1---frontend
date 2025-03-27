# Use Node.js LTS version
FROM node:16-alpine as build-stage

# Install dependencies
WORKDIR /app
COPY package*.json ./

# build phase
COPY . /app/
# Set CI=false to prevent treating warnings as errors in build
ENV CI=false
RUN npm install && npm run build

# production environment
FROM nginx:stable-alpine
COPY --from=build-stage /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
