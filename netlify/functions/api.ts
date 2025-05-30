import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { registerRoutes } from '../../server/routes';

// 환경 변수 설정
dotenv.config();

// Express 앱 생성
const app = express();

// 미들웨어 설정
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://your-netlify-site.netlify.app',
  credentials: true
}));
app.use(cookieParser());

// 라우트 설정
registerRoutes(app);

// 서버리스 핸들러로 변환
export const handler = serverless(app); 