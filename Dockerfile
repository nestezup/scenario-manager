# 리눅스 x86_64 호환성을 위한 플랫폼 지정
FROM --platform=linux/amd64 node:18-alpine

# 필요한 시스템 패키지 설치 (빌드 도구)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with verbose logging
RUN npm ci --verbose --production=false

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# 프로덕션 의존성만 재설치 (최적화)
RUN npm ci --only=production && npm cache clean --force

# 비특권 사용자 생성 및 권한 설정
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Health check 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --version || exit 1

# Command to run the application
CMD ["node", "dist/index.js"] 