# Use a specific Node.js version that's not Alpine-based
FROM node:16 as build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Set CI=false to prevent treating warnings as errors
ENV CI=false

# Build the application
RUN npm run build

# Final production image
FROM node:16-slim

# Install serve package globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy build from the previous stage
COPY --from=build /app/build ./build

# Expose port
EXPOSE 80

# Start command using serve instead of npx
CMD ["serve", "-s", "build", "-l", "80"]
