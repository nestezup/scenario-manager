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
- API 통합: OpenAI GPT-4 및 DALL-E (또는 기타 이미지 생성 모델)

## 개발 환경 설정

### 필요 조건
- Node.js 18+ 
- npm 또는 yarn

### 설치

1. 저장소 클론 후 의존성 설치:
   ```
   npm install
   ```

2. 개발 서버 실행:
   ```
   npm run dev
   ```

3. 브라우저에서 `http://localhost:5000` 접속 (또는 표시된 포트)

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

## 구현 참고사항

1. 현재 버전에서는 실제 API 엔드포인트가 구현되어 있지 않습니다. API_ENDPOINTS.md 파일을 참조하여 실제 API를 구현할 수 있습니다.

2. 실제 환경에서는 OpenAI API를 사용하기 위한 API 키가 필요합니다:
   - .env 파일에 `OPENAI_API_KEY=your-api-key` 형식으로 설정하세요.
   - 서버 측 API 로직을 구현하여 키를 안전하게 관리해야 합니다.

## 후속 단계

- 씬 추가/삭제 기능 구현
- 더 다양한 이미지 옵션 제공
- 프롬프트 직접 편집 기능
- 다국어 지원
- 테마 변경 옵션

## 라이센스

이 프로젝트는 [MIT 라이센스](LICENSE)에 따라 배포됩니다.