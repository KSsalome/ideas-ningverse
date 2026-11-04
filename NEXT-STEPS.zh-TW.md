# ideas-ningverse｜Windows 入門說明

這份下載包是現有成果島的原始碼快照，供你下載到電腦、用 VS Code 開啟，再匯入自己的 GitHub 倉庫。

## 目前階段

- GitHub 倉庫：https://github.com/KSsalome/ideas-ningverse
- 建議倉庫設為 Private。網站對訪客公開，可與程式碼保持私有分別設定。
- 原始碼保留目前的 Sites 登入整合與資料庫綁定。自行部署到 Cloudflare 前，仍須完成登入與雲端資源的遷移。
- 本包不包含正式資料庫、私人日記、帳號資料、實際上傳的檔案或執行環境密鑰。這些內容會在後續搬遷步驟分別處理。
- 不包含已安裝的依賴、建置產物、Git 歷史或開發檢查截圖；網站功能所需的程式碼、套件清單與鎖定檔均保留。

## 這一步先做什麼

1. 解壓縮下載包。
2. 在 VS Code 選「檔案 → 開啟資料夾」。
3. 選取 ideas-ningverse 資料夾；左側應能直接看到 package.json、app、lib、worker。
4. 選「終端機 → 新增終端機」，在 PowerShell 依序執行：

```powershell
node --version
npm.cmd --version
git --version
```

把執行結果貼回對話；如果顯示找不到指令，也照原樣貼回。這一步只確認環境，還不用安裝專案依賴或部署。

## 下一步會做的事

使用目前 pnpm-lock.yaml 對應的套件管理器安裝依賴，初始化本機 D1 資料庫並預覽網站。之後完成登入整合、資料與檔案遷移，再接上 Cloudflare Workers 部署。

專案 package.json 要求 Node.js >= 22.13.0；實際安裝版本將在確認你目前環境後選定。

## 原始碼版本

2fe08b83d24ccadc7b1d8b901e224dad370b0b67
