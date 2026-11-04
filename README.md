# 白語寧的城堡島嶼

私人建置中的互動作品島。主畫面以 Three.js 呈現，支援拖曳視角、點地面行走、鍵盤與觸控搖桿；無 WebGL 環境使用 Three.js 的 SVG 投影相容模式。

## 已實作

- 主島依 Asia/Taipei 自動切換六時段的局部天空、光線與植栽，沒有公開的手動換景入口。城堡結構、地理位置、橋樑不變；其他六座島採固定的既有外觀與照明，室內原有的採光系統仍獨立運作。
- 八個預設專案；進度未知的專案標示「待設定」，可改為地基、施工或完工。
- 外圈社群海岸：三個 Instagram、一個公開 Facebook、Threads、LINE、霓光遊戲基地。私人 Facebook 由伺服器提供，只在島主解鎖城門後傳回。
- 後台可新增／移除作品與社群建築，以地圖點選、拖曳、方向鍵、座標或自動選位決定位置。伺服器再次驗證海岸、城牆、保留區與建築碰撞；每座建築獨立存座標，刪除後不重排。
- 每專案一棟建築，後台可新增、修改、移除，支援文字、圖片、影片、音訊、PDF、外部互動示範與下載。
- 訪客角色儲存於裝置；登入後將角色保存於 D1。帳號使用 Sites 管理的 ChatGPT 登入。
- 島主分身、三個隱藏碎光、訪客留言與島主隱藏留言。
- 日記的文字、圖片、心情與日期，D1 / R2 持久儲存；可匯出含 JSON、Markdown、原圖的 ZIP。
- 私人城門使用島主身分 + PBKDF2 密碼驗證，通行 cookie 為 HttpOnly / Secure / SameSite=Strict，效期一小時。城堡不提供進入功能。
- 島嶼 MCP 提供 owner-only 的 list_island_projects 與 update_island_project，支援建築位置、社群帳號與公開範圍，沒有私人日記工具。

## 管理社群與建築

解鎖私人城門後，進入齒輪後台 → 建築與位置。選擇既有建築或新增一棟，填入平台、帳號名稱／遊戲 ID、網址與公開範圍；帳號連結預設留空，不能推測使用者的帳號。遊戲基地可用更多外部連結收藏多個平台。

下方選位圖可以點選或拖曳圖釘，方向鍵以 0.5 單位微調，Shift＋方向鍵以 2 單位移動。保存後位置同步到立體島嶼。私人建築只能置於城牆內的空地，社群建築位於海岸。更改公開範圍時，內部附件須以對應的公開範圍重新上傳，避免把私人檔案意外公開。

## 首次島主設定

由擁有者開啟附有 `#setup=<一次性設定憑證>` 的私人網址，在網站內設定自己的城門密碼。憑證只存在受保護的執行環境，不包含在原始碼。設定完成後，owner_id 會綁定該 Site 的登入帳號，其他帳號無法成為島主。

## 目前限制

- 網站仍須維持擁有者私人存取；本次不開放公開。
- 日記可下載備份後存入 Google Drive；網站端直接寫入 Drive 尚未取得可用的 Sites connector eligibility，因此未假接、未放入用戶端憑證。
- GitHub / Cloudflare 帳號尚未接入；目前來源由 Sites 的受控 Git 倉庫保存。若遷往自行管理的 Cloudflare，需要配置該環境的身分驗證，不能把來源部署後就假設 Sites 登入會跟著生效。
- 目前為原創微縮場景與角色。作品尚無正式封面、圖片或檔案；展館保留待補狀態。
- 作品附件每檔 20 MB，日記圖片每張 5 MB、每篇 12 張；應用層總上傳上限 200 MB。單次日記匯出原圖上限 32 MB。這些是應用程式限制，不是平台免費額度保證。
- 僅隱藏下載入口無法防止瀏覽器使用者另存已公開素材。

## 開發與驗證

依 Sites skill 使用 project-setup、install-dependencies、build-site 與 site-workflow helper。不可提交 `.dev.vars`、`.sites-runtime` 或執行環境憑證。

```sh
node --experimental-strip-types --test tests/core.test.mjs
pnpm exec tsc --noEmit --incremental false
node tests/worker.test.mjs
pnpm run db:generate
```

`tests/worker.test.mjs` 使用 Miniflare 的隔離測試資料庫與 dispatchFetch 驗證已建置的 Worker，涵蓋帳號、城門權限、作品寫入、更新衝突、日記保存與 ZIP 匯出。正式資料庫與測試資料分開。

## 公開前

補上實際作品與社群連結；完成島主設定；驗證手機上的 WebGL 效果與操作；確認公開作品區、密碼區與不開放城堡符合預期。公開狀態由 Sites 存取設定控制，程式碼不會自行放寬。
