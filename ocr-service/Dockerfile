FROM node:18-alpine

# Install dependencies for Tesseract and Sharp
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    vips-dev \
    fftw-dev \
    build-base \
    python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
