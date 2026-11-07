# 自行託管的 Google 登入

本修改適用於 KSsalome/ideas-ningverse 的 Cloudflare Workers 部署。原 Sites 的託管設定與資料庫不會隨此更新自動搬移。

## 本機設定

在專案根目錄的 `.dev.vars` 填寫 `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`；保留原有 `SESSION_SECRET`、`SETUP_TOKEN`。密鑰檔由 Git 忽略，不包含在更新包。

Google 的網頁用戶端需加入來源 `http://localhost:5173`、`http://127.0.0.1:5173`，與各自的 `/auth/google/callback` 重新導向 URI。測試用戶端保留在測試環境；公開正式環境另行設定。

依序執行以下指令：

```powershell
# 依鎖定版本安裝相依套件。
npx.cmd --yes pnpm@11.25.0 install --frozen-lockfile --prefer-offline --network-concurrency=2 --fetch-timeout=600000 --fetch-retries=5
# 對本機隔離資料庫套用資料表腳本，沿用原本測試用 DB 編號。
npx.cmd --yes pnpm@11.25.0 exec wrangler d1 migrations apply DB --local --config .wrangler/local-db.json --persist-to .wrangler/state
# 啟動 Google 登入測試。
npm.cmd run dev
```

本機 `.wrangler/local-db.json` 使用先前建立的本機設定檔。若尚未建立，先依主流程建立本機 DB 設定，不要改用正式資料庫作本機測試。

以 `http://localhost:5173` 開啟網站，從角色編輯頁選擇 Google 登入。登入成功後可保存角色，再測試重新整理。島主首次設定仍需自己的 `SETUP_TOKEN` 與至少十二字元的城門密碼；暫存憑證僅存在同一瀏覽器分頁，設定完成後清除。

## 正式環境

公開前須完成正式 Google 用戶端、HTTPS 回呼網址及 Worker 的 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`、`SETUP_TOKEN` secrets。另設定 `AUTH_ORIGIN` 為精確 HTTPS 網站來源（不含結尾斜線），登入入口會拒絕未設定的正式網址。

正式資料庫另以 `--remote --config wrangler.cloud.jsonc` 套用 migration。設定檔與建置成功不代表 OAuth 真實登入或原網站資料移轉已完成；應在自己的瀏覽器完成實際 Google 登入、島主與一般帳號權限測試後公開。

## 實作與維護

- `lib/google-auth.ts`：OAuth state、PKCE、nonce 與 JWT 簽章驗證，使用 oauth4webapi 與 jose。
- `auth_requests`：十分鐘的單次登入流程，消耗後刪除；同一 IP 限制同時有效的登入流程數量。
- `auth_sessions`：二十四小時的伺服器工作階段，只保存隨機 cookie 的 SHA-256 雜湊。
- 正式 cookie 使用 `__Host-` 前綴、HttpOnly、Secure、SameSite=Lax，登出需同源 POST，並立即刪除工作階段。
- 使用 Google `sub` 建立固定帳號 ID；原 Sites 身分標頭不再作為登入依據。
- `.dev.vars` 不會自動成為部署密鑰，正式環境需另設。

## 驗證

```powershell
# 模擬 Google HTTPS 回應，測試簽章、受眾、nonce、重放、過期及登出。
node --experimental-strip-types --test tests/google-auth.test.mjs
# 檢查型別並建置。
npx.cmd --yes pnpm@11.25.0 exec tsc --noEmit --incremental false
npm.cmd run build
# 在隔離的 Miniflare D1/R2 驗證島主、日記、角色與附件權限。
node --experimental-strip-types tests/worker.test.mjs
```

自動測試不使用使用者的 Google 密鑰或正式 D1/R2。Google 提供者回應以測試金鑰模擬；真實帳號登入需要由擁有者在自己的瀏覽器完成。
