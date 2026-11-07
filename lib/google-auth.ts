import * as oauth from 'oauth4webapi';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** 自行託管環境的登入設定；密鑰只從 Worker 的伺服器綁定讀取。 */
export interface AuthEnv {
  DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_ORIGIN?: string;
}
export interface IslandUser { userId: string; displayName: string; email: string; fullName: string | null }
// 使用維護中的 OAuth 與 JOSE 函式庫驗證授權流程及 Google 簽章。
const googleServer: oauth.AuthorizationServer = { issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', token_endpoint: 'https://oauth2.googleapis.com/token' };
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const callbackPath = '/auth/google/callback';
const day = 86400;

/** 導向位置只接受本站路徑；同時排除反斜線、控制字元及登入迴圈。 */
export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  const parsed = new URL(value, 'https://island.invalid');
  if (parsed.origin !== 'https://island.invalid' || parsed.pathname.startsWith('/auth/') || /^\/(signin-with-chatgpt|signout-with-chatgpt|callback)$/.test(parsed.pathname)) return '/';
  return parsed.pathname + parsed.search + parsed.hash;
}

/** 資料庫僅保存隨機憑證的雜湊，降低資料庫外洩時的風險。 */
export async function tokenHash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
}
function secureCookie(env: AuthEnv, local: boolean): boolean {
  return !(local && !env.AUTH_ORIGIN?.startsWith('https://'));
}
function cookieName(kind: string, secure: boolean) { return (secure ? '__Host-' : '') + 'ningverse_' + kind; }
function cookieValue(headers: Headers, name: string): string | null {
  const values = (headers.get('cookie') ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
  // 重複同名 cookie 視為無效，避免不同路徑 cookie 的歧義。
  return values.length === 1 ? values[0].slice(name.length + 1) : null;
}
function cookie(kind: string, value: string, age: number, secure: boolean): string {
  return `${cookieName(kind, secure)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
}
function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return noStore(new Response(null, { status: 303, headers }));
}
function originFor(request: Request, env: AuthEnv, local: boolean): string {
  const origin = new URL(request.url).origin;
  if (local && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)) return origin;
  if (!env.AUTH_ORIGIN) throw new Error('missing_origin');
  const configured = new URL(env.AUTH_ORIGIN);
  if (configured.protocol !== 'https:' || configured.origin !== env.AUTH_ORIGIN || origin !== configured.origin) throw new Error('invalid_origin');
  return configured.origin;
}

/** 每次讀取均檢查伺服器資料庫；登出刪除資料列後，舊 cookie 立即失效。 */
export async function readGoogleUser(headers: Headers, env: AuthEnv, local = false): Promise<IslandUser | null> {
  const raw = cookieValue(headers, cookieName('session', secureCookie(env, local)));
  if (!env.DB || !raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  const row = await env.DB.prepare('SELECT user_id, name, email FROM auth_sessions WHERE token_hash=? AND expires_at>?')
    .bind(await tokenHash(raw), Date.now()).first<{ user_id: string; name: string; email: string }>();
  return row ? { userId: row.user_id, displayName: row.name || row.email, fullName: row.name || null, email: row.email } : null;
}

/** Google OAuth 入口與回呼。既有登入連結保留相容導向，登入狀態不再信任外來身分標頭。 */
export async function googleAuthRoute(request: Request, env: AuthEnv, local = false): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['/auth/google/start', callbackPath, '/auth/logout', '/signin-with-chatgpt', '/signout-with-chatgpt'].includes(url.pathname)) return null;
  if (['/signin-with-chatgpt', '/signout-with-chatgpt'].includes(url.pathname)) {
    return redirect((url.pathname === '/signin-with-chatgpt' ? '/auth/google/start' : '/auth/logout') + '?return_to=' + encodeURIComponent(safeReturnTo(url.searchParams.get('return_to'))));
  }
  if (!['GET', 'POST'].includes(request.method)) return noStore(new Response('不支援此操作', { status: 405 }));
  let origin: string;
  try { origin = originFor(request, env, local); }
  catch { return noStore(new Response('登入網址尚未設定完成。', { status: 503 })); }
  const secure = secureCookie(env, local);
  const clearFlow = cookie('oauth', '', 0, secure);
  if (!env.DB) return noStore(new Response('登入資料庫尚未設定完成。', { status: 503 }));

  if (url.pathname === '/auth/logout') {
    // GET 僅顯示確認表單；POST 需同源，避免其他網站強迫旅人登出。
    if (request.method === 'GET') return noStore(new Response('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>登出作品島</title><body><h1>登出作品島</h1><form method="post" action="/auth/logout"><button>確認登出</button></form><p><a href="/">回到島上</a></p></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } }));
    if (request.headers.get('origin') !== origin) return noStore(new Response('請從島嶼頁面操作。', { status: 403 }));
    const raw = cookieValue(request.headers, cookieName('session', secure));
    if (raw) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await tokenHash(raw)).run();
    return redirect('/', [cookie('session', '', 0, secure), clearFlow, '__Host-island_inner=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0']);
  }
  if (request.method !== 'GET') return noStore(new Response('不支援此操作', { status: 405 }));
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return noStore(new Response('Google 登入尚未設定完成，仍可返回首頁以訪客入島。', { status: 503 }));
  const client: oauth.Client = { client_id: env.GOOGLE_CLIENT_ID, id_token_signed_response_alg: 'RS256' };

  if (url.pathname === '/auth/google/start') {
    const state = oauth.generateRandomState(), verifier = oauth.generateRandomCodeVerifier(), nonce = oauth.generateRandomState();
    const now = Date.now();
    // 清除過期流程；以 IP 雜湊限流，避免任意灌入登入流程資料。
    await env.DB.prepare('DELETE FROM auth_requests WHERE expires_at<=?').bind(now).run();
    await env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now).run();
    const ipHash = await tokenHash((request.headers.get('cf-connecting-ip') ?? 'local') + ':' + env.GOOGLE_CLIENT_SECRET);
    const recent = await env.DB.prepare('SELECT COUNT(*) AS total FROM auth_requests WHERE ip_hash=?').bind(ipHash).first<{ total: number }>();
    if ((recent?.total ?? 0) >= 20) return noStore(new Response('登入嘗試較頻繁，請稍候再試。', { status: 429 }));
    await env.DB.prepare('INSERT INTO auth_requests(state_hash,verifier,nonce,return_to,origin,ip_hash,expires_at) VALUES(?,?,?,?,?,?,?)')
      .bind(await tokenHash(state), verifier, nonce, safeReturnTo(url.searchParams.get('return_to')), origin, ipHash, now + 600000).run();
    const target = new URL(googleServer.authorization_endpoint!);
    target.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: origin + callbackPath, response_type: 'code', scope: 'openid email profile', state, code_challenge_method: 'S256', code_challenge: await oauth.calculatePKCECodeChallenge(verifier) }).toString();
    target.searchParams.set('nonce', nonce);
    return redirect(target.toString(), [cookie('oauth', state, 600, secure)]);
  }

  const state = url.searchParams.get('state');
  const stored = cookieValue(request.headers, cookieName('oauth', secure));
  if (!state || state !== stored || url.searchParams.getAll('state').length !== 1) return noStore(new Response('登入驗證失效，請重新從島上開始登入。', { status: 400, headers: { 'Set-Cookie': clearFlow } }));
  // 先消耗單次流程資料；相同回呼不能重複建立登入狀態。
  const flow = await env.DB.prepare('DELETE FROM auth_requests WHERE state_hash=? AND expires_at>? AND origin=? RETURNING verifier,nonce,return_to')
    .bind(await tokenHash(state), Date.now(), origin).first<{ verifier: string; nonce: string; return_to: string }>();
  if (!flow) return noStore(new Response('登入連結已過期或已使用，請重新登入。', { status: 400, headers: { 'Set-Cookie': clearFlow } }));
  if (url.searchParams.has('error')) return noStore(new Response('已取消 Google 登入。可返回首頁以訪客入島。', { status: 400, headers: { 'Set-Cookie': clearFlow } }));
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.getAll('code').length !== 1) return noStore(new Response('登入回應不完整，請重新登入。', { status: 400, headers: { 'Set-Cookie': clearFlow } }));
  try {
    // OAuth 函式庫處理授權碼交換與 PKCE；jose 再驗證 Google 簽章。
    const parameters = oauth.validateAuthResponse(googleServer, client, url, state);
    const tokenResponse = await oauth.authorizationCodeGrantRequest(googleServer, client, oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET), parameters, origin + callbackPath, flow.verifier, { signal: AbortSignal.timeout(10000) });
    const tokens = await oauth.processAuthorizationCodeResponse(googleServer, client, tokenResponse, { expectedNonce: flow.nonce, requireIdToken: true });
    if (!tokens.id_token) throw new Error('missing_id_token');
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: env.GOOGLE_CLIENT_ID, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'nonce', 'email', 'email_verified'], maxTokenAge: '10m', clockTolerance: 5 });
    if (payload.nonce !== flow.nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 || typeof payload.email !== 'string' || payload.email.length > 320 || (payload.azp !== undefined && payload.azp !== env.GOOGLE_CLIENT_ID)) throw new Error('invalid_identity');
    const raw = oauth.generateRandomState();
    // Google 的固定 sub 用作帳號識別碼，名稱或 Email 變更不會改變角色歸屬。
    const name = typeof payload.name === 'string' ? payload.name.slice(0, 120) : '';
    await env.DB.prepare('INSERT INTO auth_sessions(token_hash,user_id,name,email,expires_at) VALUES(?,?,?,?,?)')
      .bind(await tokenHash(raw), 'google:' + payload.sub, name, payload.email, Date.now() + day * 1000).run();
    return redirect(safeReturnTo(flow.return_to), [cookie('session', raw, day, secure), clearFlow]);
  } catch {
    // 不將 Google 回傳的憑證、授權碼或內部例外顯示給瀏覽器或寫入日誌。
    return noStore(new Response('Google 登入未完成，請返回首頁重新登入。', { status: 400, headers: { 'Set-Cookie': clearFlow } }));
  }
}
