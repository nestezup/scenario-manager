#!/bin/bash

# Docker Compose 배포 스크립트
# Usage: ./docker-deploy.sh [prod|dev]

set -e  # 에러 발생시 스크립트 중단

ENVIRONMENT=${1:-dev}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🚀 프로덕션 환경으로 배포를 시작합니다..."
else
    echo "🛠️  개발 환경으로 배포를 시작합니다..."
fi

echo "📋 환경 설정 파일 확인 중..."

# 환경변수 파일 확인
if [ "$ENVIRONMENT" = "prod" ]; then
    if [ ! -f ".env.production" ]; then
        echo "❌ .env.production 파일이 없습니다. docker.env.example을 참고하여 생성해주세요."
        exit 1
    fi
else
    if [ ! -f ".env" ]; then
        echo "⚠️  .env 파일이 없습니다. docker.env.example을 참고하여 생성해주세요."
        echo "기본 설정으로 계속 진행합니다..."
    fi
fi

# 필요한 디렉토리 생성
echo "📁 필요한 디렉토리 생성 중..."
mkdir -p logs uploads backups

# Docker Compose 실행
echo "🐳 Docker Compose 실행 중..."
if [ "$ENVIRONMENT" = "prod" ]; then
    # 프로덕션: 이미지 다운로드 후 실행
    docker-compose -f $COMPOSE_FILE pull
    docker-compose -f $COMPOSE_FILE up -d
else
    # 개발: 빌드 후 실행
    docker-compose -f $COMPOSE_FILE up --build -d
fi

# 컨테이너 상태 확인
echo "⏳ 컨테이너 시작 대기 중..."
sleep 10

echo "📊 컨테이너 상태 확인 중..."
docker-compose -f $COMPOSE_FILE ps

echo "📝 로그 확인:"
docker-compose -f $COMPOSE_FILE logs --tail=20

echo ""
echo "✅ 배포가 완료되었습니다!"
echo "🌐 애플리케이션이 http://localhost:3010 에서 실행 중입니다."
echo ""
echo "유용한 명령어:"
echo "  로그 보기: docker-compose -f $COMPOSE_FILE logs -f"
echo "  컨테이너 재시작: docker-compose -f $COMPOSE_FILE restart"
echo "  컨테이너 중지: docker-compose -f $COMPOSE_FILE down"
echo "  컨테이너 상태: docker-compose -f $COMPOSE_FILE ps" 