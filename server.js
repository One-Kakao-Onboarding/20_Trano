import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

// 환경변수를 먼저 로드
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API 핸들러 동적 import (환경변수 로드 후)
const { default: questionsHandler } = await import('./api/questions/index.js');
const { default: easyHandler } = await import('./api/questions/easy.js');

const PORT = 3000;

// MIME 타입 매핑
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 정적 파일 서빙 함수
function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 쿼리 파라미터 파싱
  req.query = Object.fromEntries(url.searchParams);

  // Express/Vercel 스타일 헬퍼 추가
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  console.log(`${req.method} ${url.pathname}`);

  try {
    // API 라우트
    if (url.pathname === '/api/questions' && req.method === 'GET') {
      await questionsHandler(req, res);
    } else if (url.pathname === '/api/questions/easy' && req.method === 'GET') {
      await easyHandler(req, res);
    }
    // 정적 파일 서빙
    else {
      let filePath = path.join(__dirname, url.pathname);

      // 루트 경로면 index.html 서빙
      if (url.pathname === '/') {
        filePath = path.join(__dirname, 'index.html');
      }

      serveStaticFile(filePath, res);
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`
🚀 로컬 테스트 서버 실행 중: http://localhost:${PORT}

API 엔드포인트:
  GET http://localhost:${PORT}/api/questions
  GET http://localhost:${PORT}/api/questions?age=12
  GET http://localhost:${PORT}/api/questions?category=language
  GET http://localhost:${PORT}/api/questions/easy?age=24

Ctrl+C로 종료
  `);
});
