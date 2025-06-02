#!/bin/bash

# 스크립트 실행 디렉토리로 이동
cd "$(dirname "$0")"

echo "Pulling latest image from Docker Hub..."
docker pull nestezup/scenario-manager:latest

echo "Stopping and removing existing container if it exists..."
docker-compose -f docker-compose.prod.yml down

echo "Starting new container..."
docker-compose -f docker-compose.prod.yml up -d

echo "Cleaning up unused images..."
docker image prune -f

echo "Deployment completed successfully!"
echo "Application is now running at http://localhost:3000" 