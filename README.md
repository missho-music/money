# Classroom Pet Quest

香港中學課堂用的抽籤、寵物金幣和寵物養成網頁。介面以繁體中文為主。老師可以在投影時抽學生、即時加分；學生用自己的帳號查看金幣、養成寵物、買裝備和兌換實體禮物。

積分、購買、兌換和抽籤都在伺服器交易裡完成。重新整理或換裝置後，資料仍在伺服器資料庫，不會只留在瀏覽器。

## 現況

| 階段 | 狀態 |
|---|---|
| 1 班別、CSV／Excel 匯入、抽籤、防重複、歷史、加分、金幣紀錄 | 已可在課堂使用 |
| 2 學生登入、交易紀錄、批量加分、排行榜、報表、權限 | 已完成 |
| 3 初始寵物、改名、等級、經驗值、能力、待機動畫 | 已完成 |
| 4 商店、原子扣款、背包、裝備、能力加成、實體禮物兌換 | 已完成 |
| 5 寵物對戰、技能、Boss、班級合作、完整成就系統 | 尚未實作 |

對戰準備頁只顯示系統計算的能力。里程碑由現有紀錄計算，沒有可領取的額外獎勵。消耗品可以購買並放進背包，暫時不能使用。商品圖片上傳到 Firebase Storage 尚未接上，商店以名稱、稀有度和能力顯示。

## 本地執行

需要 Node.js 22。

```bash
npm install
npm run dev -- --port 4317 --hostname 0.0.0.0
```

開啟 http://127.0.0.1:4317 。

預設 `DATA_BACKEND=sqlite`。第一次啟動會在 `data/classroom.sqlite` 建立資料並寫入示範班別。這個檔案已列入 `.gitignore`。

示範帳號只在設定裡的示範模式開啟時顯示：

| 身份 | 登入名稱 | 密碼 |
|---|---|---|
| 老師 陳老師 | `teacher@petquest.school` | `PetQuest2026` |
| 學生 1A 陳大文 | `1A-01` | `Student2026` |

其餘已建立的學生密碼同為 `Student2026`。登入名稱是「班別-學號」，必須配合密碼，不能只輸入學號。正式使用前請在教師設定關閉示範模式，並為每位學生重設密碼。

```bash
npm test
npm run lint
```

## 資料從哪裡來

業務邏輯在 `src/server/services.ts` 和 `src/server/game-services.ts`。瀏覽器只呼叫 `/api/cpq`。

- `sqlite`：本機可測試的真實資料庫，使用 `node:sqlite`。抽籤、加分、購買都寫入這個檔案。
- `firestore`：設定 `DATA_BACKEND=firestore` 及下方 Admin SDK 環境變數後，同一套邏輯改寫 Cloud Firestore。客戶端 Firebase SDK 沒有寫入權限。

沒有填 Firebase 憑證時，程式不會假裝已連上雲端。

把 `.env.example` 複製為 `.env.local`：

```bash
DATA_BACKEND=sqlite
SESSION_SECRET=一串夠長的隨機字元
COOKIE_SECURE=false
```

正式環境請設定 `SESSION_SECRET`，並在 HTTPS 把 `COOKIE_SECURE` 設為 `true`。

Firestore 需要：

```bash
DATA_BACKEND=firestore
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
FIREBASE_WEB_API_KEY=
```

`FIREBASE_PRIVATE_KEY` 是服務帳戶私鑰，只放在伺服器環境。`FIREBASE_WEB_API_KEY` 只供伺服器向 Identity Toolkit 驗證電郵密碼，不要放進前端程式。

學生的 Firebase 登入電郵由系統產生，格式為 `{登入名稱}@students.classroom-pet-quest.local`，學生仍然用班別學號和密碼登入。

部署規則：

```bash
firebase deploy --only firestore:rules,storage
```

規則在 `firestore.rules` 和 `storage.rules`。客戶端不能改錢包、商品、訂單或抽籤紀錄。受信任的伺服器使用 Admin SDK，交易在伺服器執行。

## 部署

這個應用需要長駐的 Node.js 伺服器，才能執行交易和保存工作階段。Firebase Hosting 的純靜態網站不能單獨承載這些 API。

可用 Firebase App Hosting 或其他 Node 主機執行 `npm run build` 與 `npm start`，並把 Firestore 規則一併部署。在接上 Firestore 之前，不要把 SQLite 檔案當成雲端資料：無伺服器平台每次啟動都可能是空資料庫。

## 主要頁面

教師：總覽、班別管理、抽籤、積分、寵物、商店、實體禮物、報表、設定。

學生：寵物、商店、背包、金幣、禮物、排行、里程碑、對戰準備。

班別匯入接受 CSV 或 Excel，欄位為 `Class`、`Class Number`、`Student Name`（亦接受 `班別`、`學號`、`姓名`）。範本在 `/samples/students.csv`。同一學年以班別加學號核對，轉班會保留原有學生編號、金幣和寵物。

## 抽籤與金幣規則

- 同一輪裡，未缺席且尚未抽中的在學學生才會入池，用加密隨機數抽取。
- 全班抽完後要老師確認才開新一輪。重設不會刪除歷史。
- 缺席學生不參與，也不會被標成已抽中。
- 略過可選「稍後再抽」或「標記為已抽中」，兩種結果分開記錄。
- 同一抽籤結果配同一個加分項目只會入帳一次。
- 每獲得 1 枚寵物金幣，預設同時獲得 10 經驗值。花費金幣不扣經驗，也不減少累積獲得。
- 餘額不可低於 0。更正用相反交易，保留原因。
- 購買和兌換使用冪等鍵，同一請求重送不會重複扣款。

## 私隱

系統收集班別、學號、姓名和課堂顯示名稱，用來抽籤、派分和養成寵物。投影模式預設不顯示全名。學生只能讀自己的寵物、背包、金幣和訂單，排行榜只限所屬班別，老師可關閉或改為顯示名稱。

請按香港《個人資料（私隱）條例》和校方政策決定收集範圍、誰可存取、保留多久，以及何時封存或匯出後刪除。教師報表頁可匯出 CSV、Excel 和 JSON 備份；備份不含密碼雜湊。

## 測試涵蓋

`npm test` 檢查：一輪抽滿不重複、換班進度獨立、重新讀取資料仍在、加分與交易、購買扣款與背包、餘額不足、重複請求不重複扣款、裝備後攻擊力加減、學生不能改金幣或售價。多裝置同步在此以第二個 SQLite 連線讀到已提交餘額代表；接上 Firestore 後，兩部裝置會讀同一個雲端文件。
