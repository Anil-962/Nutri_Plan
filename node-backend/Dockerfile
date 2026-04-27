FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available) first to leverage layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy remaining project files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
