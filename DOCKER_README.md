# 🐳 Docker 배포 가이드

## 📁 Docker 관련 파일 구조

```
프로젝트 루트/
├── Dockerfile                    # Docker 이미지 빌드 설정
├── docker-compose.yml            # 개발환경용 Docker Compose
├── docker-compose.prod.yml       # 프로덕션환경용 Docker Compose  
├── docker.env.example            # 환경변수 템플릿
├── docker-push.sh               # DockerHub 배포 스크립트
├── docker-deploy.sh             # Docker Compose 실행 스크립트
└── .dockerignore                # Docker 빌드시 제외할 파일들
```

## 🚀 배포 과정

### 1. **개발 완료 후 GitHub 푸시**
```bash
git add .
git commit -m "기능 추가"
git push origin main
```

### 2. **DockerHub에 이미지 배포** (로컬에서)
```bash
# Docker 로그인 (최초 1회만)
docker login

# DockerHub에 이미지 푸시
./docker-push.sh

# 특정 버전으로 푸시
./docker-push.sh v1.2.3
```

### 3. **서버에서 배포**
```bash
# 최신 코드 받기
git pull origin main

# 환경변수 설정 (최초 1회만)
cp docker.env.example .env.production
# .env.production 파일 편집

# 프로덕션 배포
./docker-deploy.sh prod
```

## 🔧 주요 명령어

### **개발환경 실행**
```bash
# 개발용 Docker Compose 실행
./docker-deploy.sh

# 또는 직접 실행
docker-compose up --build -d
```

### **프로덕션환경 실행**
```bash
# 프로덕션용 Docker Compose 실행
./docker-deploy.sh prod

# 또는 직접 실행
docker-compose -f docker-compose.prod.yml up -d
```

### **컨테이너 관리**
```bash
# 컨테이너 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 실시간 로그 보기
docker-compose -f docker-compose.prod.yml logs -f

# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart

# 컨테이너 중지
docker-compose -f docker-compose.prod.yml down
```

## 🌐 접속 정보

- **개발환경**: http://localhost:3010
- **프로덕션**: http://서버IP:3010

## ⚙️ 환경변수 설정

`docker.env.example`을 복사하여 `.env` (개발용) 또는 `.env.production` (프로덕션용) 파일을 생성하고 실제 값들로 수정하세요.

```bash
# 개발용
cp docker.env.example .env

# 프로덕션용  
cp docker.env.example .env.production
```

## 🛠️ 트러블슈팅

### 포트 충돌 시
```bash
# 사용중인 포트 확인
lsof -i :3010

# 컨테이너 강제 중지
docker-compose -f docker-compose.prod.yml down --remove-orphans
```

### 이미지 업데이트 안될 때
```bash
# 이미지 강제 다운로드
docker-compose -f docker-compose.prod.yml pull

# 캐시 없이 재시작
docker-compose -f docker-compose.prod.yml up --force-recreate -d
``` 