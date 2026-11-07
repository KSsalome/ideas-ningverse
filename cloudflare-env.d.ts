declare namespace Cloudflare {
  interface Env {
    // Google 登入憑證僅由 Worker 伺服器讀取。
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    // 正式環境必須設定精確的 HTTPS 網站來源，不含結尾斜線。
    AUTH_ORIGIN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
