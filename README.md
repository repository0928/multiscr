# 多科目雲端評分系統

教師專用的雲端評分工具，支援多科目、自訂評分項目、CSV 匯入匯出、xlsx 成績匯出。

## 專案結構

```
multiscr/
├── client/   Vue 3 + Vite + Tailwind 前端
└── server/   Node.js + Express + Prisma 後端
```

## 本地開發

### 1. 環境需求
- Node.js 18+
- PostgreSQL（或使用 Docker）

### 2. 後端設定

```bash
cd server
cp .env.example .env
# 編輯 .env 填入 DATABASE_URL 和 JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev
```

### 3. 前端設定

```bash
cd client
npm install
npm run dev
```

前端預設在 http://localhost:5173，後端在 http://localhost:3000。

---

## 部署到 Zeabur

### 步驟一：建立 GitHub 倉庫

```bash
# 在 D:\code\multiscr 資料夾執行
git init
git add .
git commit -m "init: 多科目評分系統"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/multiscr.git
git push -u origin main
```

### 步驟二：Zeabur 設定

1. 前往 [zeabur.com](https://zeabur.com) 並登入
2. 建立新 Project
3. 加入 **PostgreSQL** 服務（Zeabur 會自動注入 `DATABASE_URL`）
4. 加入 **GitHub 服務（server 目錄）**：
   - Root Directory: `server`
   - 環境變數：
     - `JWT_SECRET` = 自設安全金鑰（隨機字串，至少32字元）
     - `CLIENT_URL` = 前端網址（等前端部署後填入）
5. 加入 **GitHub 服務（client 目錄）**：
   - Root Directory: `client`
   - 環境變數：
     - `VITE_API_URL` = 後端網址（如 `https://api.yourdomain.zeabur.app`）

### 步驟三：後續推送

之後每次推送 `main` branch 即自動重新部署。

---

## 功能說明

| 功能 | 說明 |
|------|------|
| 登入/帳號 | 中文一字帳號 + 4字元密碼，可自行修改 |
| 科目管理 | 新增、改名、刪除科目 |
| 學生管理 | 手動新增 或 CSV 批量匯入（年,班,號,姓名） |
| 評分項目 | 自訂項目名稱與滿分，可排序，支援 CSV 匯入匯出 |
| 評分 | 滑桿直覺評分，自動儲存 |
| 總覽 | 成績表格含等第（優甲乙丙丁），可匯出 xlsx |
