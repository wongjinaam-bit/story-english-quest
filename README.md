# Story English Quest

網頁版小學生英文學習 App MVP：迷你故事、圖片、聽說讀寫任務、詞彙學習、錯題複習、教師/Admin 後台與 QR Code 分享頁。

## 功能

- 學生端首頁與今日故事任務
- 課程地圖與 8 個內建故事
- 故事頁、單字頁、聽力、口說、閱讀、寫作任務
- 星星、徽章、錯題本、學習進度
- 教師/Admin 後台 demo 登入
- Dashboard、學生管理、任務指定、課程管理
- QR Code 分享頁
- Supabase schema，供正式資料庫使用

## Demo 後台帳號

教師：

```text
teacher@example.com
teacher123
```

Admin：

```text
admin@example.com
admin123
```

MVP 目前使用 demo 驗證與瀏覽器 localStorage，方便立即試用。正式版可接 Supabase Auth 與資料表。

## 本機啟動

最簡單方式：雙擊或執行：

```text
start-local.bat
```

或使用指令：

```bash
npm install
npm run dev
```

打開：

```text
http://localhost:3000
```

後台：

```text
http://localhost:3000/admin
```

QR Code：

```text
http://localhost:3000/qr
```

## Supabase 設定

1. 到 Supabase 建立新專案。
2. 打開 SQL Editor。
3. 貼上 `supabase/schema.sql` 並執行。
4. 到 Project Settings 取得：
   - Project URL
   - anon public key
5. 複製 `.env.example` 成 `.env.local`。
6. 填入：

```text
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 部署到 Vercel

最簡單方式：雙擊或執行：

```text
deploy-to-vercel.bat
```

如果畫面出現 Vercel 登入網址，請用瀏覽器打開該網址並完成登入。完成後部署會繼續進行，最後會顯示正式網址。

手動部署方式：

1. 將專案推到 GitHub。
2. 到 Vercel 新增專案。
3. 選擇此 repository。
4. 設定環境變數：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL=https://你的網域.vercel.app
```

5. Deploy。
6. 部署完成後打開 `/qr`，即可取得可分享 QR Code。

## 建議下一步

- 將內建課程資料搬到 Supabase。
- 將 demo 登入替換成 Supabase Auth。
- 教師後台改為讀取真實學生資料。
- 口說任務加入瀏覽器錄音與回放。
- AI 發音與 AI 寫作回饋接入正式 API。
