# Use a slim Node image
FROM node:18-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Bundle app source
COPY src ./src
COPY .env.example .env

EXPOSE 4000

# Use NODE_ENV=production by default
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
