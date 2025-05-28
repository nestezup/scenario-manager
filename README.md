# 시놉시스 기반 영상 제작 자동화 POC

## 프로젝트 개요

이 프로젝트는 텍스트 시놉시스를 기반으로 영상 제작 과정을 자동화하는 POC(Proof of Concept) 애플리케이션입니다. 사용자가 입력한 시놉시스를 여러 씬으로 분할하고, 각 씬에 대한.

주요 기능:
1. 시놉시스 입력 및 씬으로 분할
2. 씬 별 이미지 프롬프트 생성
3. 이미지 생성 및 선택
4. 선택된 이미지 기반 영상 프롬프트 생성
5. 결과물 JSON 형식으로 다운로드

## 기술 스택

- Frontend: React, TypeScript, TailwindCSS
- Backend: Express.js
- API 통합: Replicate, FAL.ai
- 인증: Supabase

## 개발 환경 설정

### 필요 조건
- Node.js 18+ 
- npm 또는 yarn

### 설치

1. 저장소 클론 후 의존성 설치:
   ```
   npm install
   ```

2. 환경 변수 설정:
   프로젝트 루트에 `.env` 파일을 생성하고 다음 변수를 설정합니다:
   ```
   # 서버 환경 변수
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=scenario-manager-secret-key

   # Supabase 설정
   SUPABASE_URL=https://your-supabase-project-url.supabase.co
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   SUPABASE_ANON_KEY=your-supabase-anon-key

   # 애플리케이션 URL
   APP_URL=http://localhost:3000

   # 외부 API 키
   REPLICATE_API_TOKEN=your-replicate-api-token
   FAL_KEY=your-fal-ai-key
   ```
   
   > 참고: 개발 모드에서는 Supabase 및 외부 API 키 없이도 모의 기능으로 실행할 수 있습니다.

3. 개발 서버 실행:
   ```
   npm run dev
   ```

4. 브라우저에서 `http://localhost:3000` 접속

## API 엔드포인트

### 1. 시놉시스 분석 및 씬 분할
- **URL**: `/api/parse-scenes`
- **Method**: POST
- **요청**: `{ "synopsis": "시놉시스 텍스트", "scene_count": 10 }`
- **응답**: `[{ "id": 1, "text": "씬 내용", "order": 1 }, ...]`

### 2. 이미지 프롬프트 생성
- **URL**: `/api/generate-image-prompt`
- **Method**: POST
- **요청**: `{ "scene_text": "씬 내용 텍스트" }`
- **응답**: `{ "prompt": "이미지 생성 프롬프트" }`

### 3. 이미지 생성
- **URL**: `/api/generate-images`
- **Method**: POST
- **요청**: `{ "prompt": "이미지 생성 프롬프트" }`
- **응답**: `{ "images": ["이미지URL1", "이미지URL2", "이미지URL3"] }`

### 4. 영상 프롬프트 생성
- **URL**: `/api/describe-image`
- **Method**: POST
- **요청**: `{ "image_url": "선택된 이미지 URL" }`
- **응답**: `{ "video_prompt": "영상 프롬프트", "negative_prompt": "네거티브 프롬프트" }`

## 인증 시스템

- 이 애플리케이션은 Supabase를 사용한 이메일 인증을 지원합니다.
- 개발 모드에서는 Supabase 키 없이도 모의 인증으로 테스트할 수 있습니다.

## 구현 참고사항

1. 자세한 API 엔드포인트 정보는 API_ENDPOINTS.md 파일을 참조하세요.

2. 실제 환경에서는 다음 API 키가 필요합니다:
   - Supabase 프로젝트 URL 및 API 키
   - Replicate API 토큰
   - FAL.ai API 키

## 후속 단계

- 씬 추가/삭제 기능 구현
- 더 다양한 이미지 옵션 제공
- 프롬프트 직접 편집 기능
- 다국어 지원
- 테마 변경 옵션

## 라이센스

이 프로젝트는 [MIT 라이센스](LICENSE)에 따라 배포됩니다.