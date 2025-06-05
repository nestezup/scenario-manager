#!/bin/bash

# DockerHub 배포 스크립트
# Usage: ./docker-push.sh [tag_version]

set -e  # 에러 발생시 스크립트 중단

# 설정
DOCKER_USERNAME="nestezup"
IMAGE_NAME="scenario-manager"
TAG_VERSION=${1:-latest}
FULL_IMAGE_NAME="$DOCKER_USERNAME/$IMAGE_NAME:$TAG_VERSION"

echo "🐳 DockerHub에 이미지 배포를 시작합니다..."
echo "📦 이미지: $FULL_IMAGE_NAME"

# Docker 로그인 확인
echo "🔐 Docker 로그인 상태 확인 중..."
if ! docker info | grep -q "Username"; then
    echo "❌ Docker에 로그인되어 있지 않습니다."
    echo "다음 명령어로 로그인해주세요:"
    echo "docker login"
    exit 1
fi

echo "✅ Docker 로그인 확인됨"

# 멀티 플랫폼 빌더 생성/사용
echo "🏗️  멀티 플랫폼 빌더 설정 중..."
if ! docker buildx ls | grep -q "multiplatform"; then
    docker buildx create --name multiplatform --use
else
    docker buildx use multiplatform
fi

# 멀티 플랫폼 이미지 빌드 및 푸시
echo "🔨 멀티 플랫폼 이미지 빌드 및 푸시 중..."
echo "   플랫폼: linux/amd64, linux/arm64"
echo "   이미지: $FULL_IMAGE_NAME"

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag $FULL_IMAGE_NAME \
    --push \
    .

echo ""
echo "✅ DockerHub 배포가 완료되었습니다!"
echo "🌐 DockerHub: https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME"
echo "📦 이미지: $FULL_IMAGE_NAME"
echo ""
echo "배포된 이미지 사용법:"
echo "  docker pull $FULL_IMAGE_NAME"
echo "  docker run -p 3010:3000 $FULL_IMAGE_NAME"
echo ""
echo "docker-compose에서 사용하려면:"
echo "  docker-compose.prod.yml의 image를 다음과 같이 변경:"
echo "  image: $FULL_IMAGE_NAME" 