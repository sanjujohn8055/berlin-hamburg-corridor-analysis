FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set NODE_ENV for build
ENV NODE_ENV=production

# Build the application with detailed error output
RUN npm run build:server
RUN npm run build:client -- --stats-children

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]