// End-to-end API check for the PrintOps backend, mirroring every call made by src/services/*.ts.
//
// Usage (backend must run against a THROWAWAY database, never your dev one):
//   E2E_BASE_URL=http://localhost:8083 E2E_BACKEND_LOG=<path to backend stdout log> node e2e/api-e2e.mjs
//
// E2E_BACKEND_LOG is needed because invites / password-reset codes are only e-mailed; with no
// RESEND_API_KEY the dev profile writes the e-mail body to the backend log, and we read the code there.
// Without it those checks are SKIPPED (and so is everything that depends on a TECNICO).
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8083';
const LOG = process.env.E2E_BACKEND_LOG || join(tmpdir(), 'e2e-boot.log');
const RUN = Date.now().toString(36);
const PASSWORD = 'Passw0rd!e2e';
// 1x1 JPEG
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

let passed = 0, failed = 0, skipped = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`FAIL  ${name}${detail ? '  -> ' + detail : ''}`); }
  return ok;
}
function skip(name, why) { skipped++; console.log(`SKIP  ${name}  (${why})`); }

async function call(method, path, { token, body, form, headers = {}, raw = false } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers: h, body: payload });
  if (raw) return res;
  const text = await res.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  return { status: res.status, data, headers: res.headers };
}
// El refresh token viaja en la cookie httpOnly printops_rt (no en el JSON).
function rtFrom(headers) {
  const cookies = typeof headers?.getSetCookie === 'function' ? headers.getSetCookie() : [headers?.get?.('set-cookie') ?? ''];
  for (const c of cookies) {
    const m = /(?:^|,\s*)printops_rt=([^;]+)/.exec(c);
    if (m) return m[1];
  }
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10);

function readLog() { return existsSync(LOG) ? readFileSync(LOG, 'utf8') : ''; }
// Last UUID that appears after "Para: <email>" in the backend log.
function codeFromLog(email) {
  const txt = readLog();
  const idx = txt.lastIndexOf(`Para: ${email}`);
  if (idx < 0) return null;
  const m = txt.slice(idx).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  return m ? m[0] : null;
}

async function registerAndLogin(email, extra = {}, deviceId = `dev-${RUN}-${email}`) {
  const r = await call('POST', '/api/auth/register', { body: { email, password: PASSWORD, ...extra } });
  const l = await call('POST', '/api/auth/login', { body: { email, password: PASSWORD, deviceId, rememberMe: true } });
  return { reg: r, login: l, deviceId };
}

// ---- minimal STOMP over the global WebSocket (what @stomp/stompjs does) ----
function stompConnect(token, userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws', ['v12.stomp']);
    const out = { messages: [], ws, error: null };
    const send = (cmd, headers, body = '') =>
      ws.send(`${cmd}\n${Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n')}\n\n${body}\0`);
    const timer = setTimeout(() => reject(new Error('STOMP connect timeout')), 8000);
    ws.onopen = () => send('CONNECT', { 'accept-version': '1.2', host: 'localhost', Authorization: `Bearer ${token}`, 'heart-beat': '0,0' });
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error('ws error ' + (e.message || ''))); };
    ws.onmessage = (ev) => {
      for (const frame of String(ev.data).split('\0').filter((f) => f.trim())) {
        const cmd = frame.trimStart().split('\n')[0];
        if (cmd === 'CONNECTED') { clearTimeout(timer); send('SUBSCRIBE', { id: 'sub-0', destination: `/queue/user-${userId}` }); resolve(out); }
        else if (cmd === 'MESSAGE') out.messages.push(frame.split('\n\n').slice(1).join('\n\n'));
        else if (cmd === 'ERROR') { clearTimeout(timer); out.error = frame; reject(new Error(frame.split('\n\n')[0])); }
      }
    };
  });
}

async function main() {
  console.log(`# base=${BASE} run=${RUN} log=${LOG}`);
  const mEmail = `mgr-${RUN}@e2e.test`;
  const tEmail = `tec-${RUN}@e2e.test`;
  const m2Email = `mgr2-${RUN}@e2e.test`;

  // ---------- Auth: register / login ----------
  const m = await registerAndLogin(mEmail, { workspaceName: `Taller ${RUN}` });
  check('POST /api/auth/register (MANAGER, new workspace)', m.reg.status === 200, JSON.stringify(m.reg.data));
  check('POST /api/auth/register duplicate email -> 4xx', (await call('POST', '/api/auth/register', { body: { email: mEmail, password: PASSWORD } })).status >= 400);
  check('POST /api/auth/login (deviceId, rememberMe) returns access token + user', m.login.status === 200 && m.login.data?.accessToken && m.login.data?.user?.role === 'MANAGER', JSON.stringify(m.login.data));
  check('login: refresh token only in httpOnly cookie, not in JSON', !m.login.data?.refreshToken && !!rtFrom(m.login.headers)
    && /HttpOnly/i.test(m.login.headers.getSetCookie().join(';')) && /SameSite=Strict/i.test(m.login.headers.getSetCookie().join(';')));
  if (m.login.status !== 200) throw new Error('cannot continue without manager login');
  let mTok = m.login.data.accessToken;
  const mUser = m.login.data.user;
  let mRefresh = rtFrom(m.login.headers);
  check('login user has id/email/role/workspaceId (no /me endpoint exists; app uses the login payload)', mUser.id && mUser.email === mEmail && mUser.workspaceId);
  check('no token -> 401', (await call('GET', '/api/printers')).status === 401);
  check('login wrong password -> 401', (await call('POST', '/api/auth/login', { body: { email: mEmail, password: 'wrongwrong', deviceId: 'x', rememberMe: false }, headers: { 'X-Forwarded-For': `10.9.${RUN.length}.1` } })).status === 401);

  // ---------- Second tenant (isolation) ----------
  const m2 = await registerAndLogin(m2Email, { workspaceName: `Otro ${RUN}` });
  const m2Tok = m2.login.data?.accessToken;
  check('second MANAGER/workspace registered', !!m2Tok && m2.login.data.user.workspaceId !== mUser.workspaceId);

  // ---------- Workspace ----------
  let r = await call('GET', '/api/workspaces/me', { token: mTok });
  check('GET /api/workspaces/me', r.status === 200 && r.data?.id === mUser.workspaceId, JSON.stringify(r.data));
  r = await call('PUT', '/api/workspaces/me', { token: mTok, body: { name: `Taller ${RUN} v2`, phone: '123', contactEmail: 'c@e2e.test', address: 'Calle 1', currency: 'ARS' } });
  check('PUT /api/workspaces/me', r.status === 200 && r.data?.name === `Taller ${RUN} v2` && r.data?.currency === 'ARS', JSON.stringify(r.data));
  r = await call('GET', '/api/workspaces/quote-defaults', { token: mTok });
  check('GET /api/workspaces/quote-defaults', r.status === 200 && 'defaultMarginPercent' in (r.data || {}), JSON.stringify(r.data));
  const qd = { defaultEnergyPriceKwh: 0.15, defaultOperatorHourlyRate: 12, defaultDesignHourlyRate: 18, defaultMarginPercent: 40, quoteValidityDays: 20 };
  r = await call('PUT', '/api/workspaces/quote-defaults', { token: mTok, body: qd });
  check('PUT /api/workspaces/quote-defaults persists', r.status === 200 && r.data?.defaultMarginPercent === 40 && r.data?.quoteValidityDays === 20, JSON.stringify(r.data));
  r = await call('GET', '/api/workspaces/canvas', { token: mTok });
  check('GET /api/workspaces/canvas (empty layout ok)', r.status === 200, JSON.stringify(r.data));

  // ---------- Printers ----------
  const mkPrinter = async (tok, tag, extra = {}) => {
    const form = new FormData();
    form.append('printer', new Blob([JSON.stringify({ name: `P-${tag}`, brand: 'Creality', model: 'Ender 3', serialNumber: `SN-${RUN}-${tag}`, purchaseDate: '2025-01-15', status: 'OPERATIVE', location: 'Sala A', nextMaintenanceDate: ymd(new Date(Date.now() + 30 * 864e5)), ...extra })], { type: 'application/json' }));
    if (tag.endsWith('photo')) form.append('photo', new Blob([JPEG], { type: 'image/jpeg' }), 'photo.jpg');
    return call('POST', '/api/printers', { token: tok, form });
  };
  r = await mkPrinter(mTok, 'a-photo', { watts: 250 });
  check('POST /api/printers multipart (printer JSON part + photo JPEG)', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const printer = r.data;
  check('printer response has photoUrl, qrCodeData', !!printer?.photoUrl && !!printer?.qrCodeData, JSON.stringify(printer));
  r = await mkPrinter(mTok, 'b');
  const printerB = r.data;
  check('POST /api/printers multipart without photo', (r.status === 201 || r.status === 200) && printerB?.id, `${r.status}`);
  r = await mkPrinter(mTok, 'b');
  check('POST /api/printers duplicate serial -> 4xx', r.status >= 400 && r.status < 500, `${r.status}`);
  r = await call('GET', '/api/printers', { token: mTok });
  check('GET /api/printers lists both', r.status === 200 && r.data.length === 2);
  r = await call('GET', '/api/printers?location=Sala%20A', { token: mTok });
  check('GET /api/printers?location= filter', r.status === 200 && r.data.length === 2);
  r = await call('GET', '/api/printers?location=Nope', { token: mTok });
  check('GET /api/printers?location= no match', r.status === 200 && r.data.length === 0);
  r = await call('GET', `/api/printers/${printer.id}`, { token: mTok });
  check('GET /api/printers/{id}', r.status === 200 && r.data.id === printer.id);
  r = await call('GET', `/api/printers/by-serial/${encodeURIComponent(printer.serialNumber)}`, { token: mTok });
  check('GET /api/printers/by-serial/{serial}', r.status === 200 && r.data.id === printer.id);
  r = await call('PATCH', `/api/printers/${printerB.id}/status`, { token: mTok, body: { status: 'MAINTENANCE' } });
  check('PATCH /api/printers/{id}/status', r.status === 200 && r.data.status === 'MAINTENANCE', JSON.stringify(r.data));
  await call('PATCH', `/api/printers/${printerB.id}/status`, { token: mTok, body: { status: 'OPERATIVE' } });
  const nmd = ymd(new Date(Date.now() + 60 * 864e5));
  r = await call('PATCH', `/api/printers/${printer.id}/next-maintenance-date`, { token: mTok, body: { nextMaintenanceDate: nmd } });
  check('PATCH /api/printers/{id}/next-maintenance-date', r.status === 200 && r.data.nextMaintenanceDate === nmd, JSON.stringify(r.data));
  r = await call('GET', '/api/printers/due-maintenance', { token: mTok });
  check('GET /api/printers/due-maintenance', r.status === 200 && Array.isArray(r.data));

  // components
  r = await call('GET', `/api/printers/${printer.id}/components`, { token: mTok });
  check('GET /api/printers/{id}/components (5 components)', r.status === 200 && r.data.length === 5, JSON.stringify(r.data)?.slice(0, 200));
  r = await call('PUT', `/api/printers/${printer.id}/components/NOZZLE`, { token: mTok, body: { quality: 'CUSTOM', customLifespanHours: 500 } });
  check('PUT components/NOZZLE CUSTOM lifespan', r.status === 200 && r.data.lifespanHours === 500, JSON.stringify(r.data));
  r = await call('PUT', `/api/printers/${printer.id}/components/NOZZLE`, { token: mTok, body: { quality: 'PREMIUM', customLifespanHours: null } });
  check('PUT components/NOZZLE PREMIUM', r.status === 200 && r.data.quality === 'PREMIUM', JSON.stringify(r.data));
  r = await call('POST', `/api/printers/${printer.id}/components/NOZZLE/replace`, { token: mTok });
  check('POST components/NOZZLE/replace', r.status === 200 && r.data.hoursUsed === 0, JSON.stringify(r.data));

  // canvas (needs printers)
  const layout = { nodes: [{ printerId: printer.id, x: 10, y: 20 }, { printerId: printerB.id, x: 110, y: 120 }], edges: [{ id: 'e1', fromId: printer.id, toId: printerB.id }] };
  r = await call('PUT', '/api/workspaces/canvas', { token: mTok, body: JSON.stringify(layout) });
  check('PUT /api/workspaces/canvas (JSON string body as app sends)', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  r = await call('GET', '/api/workspaces/canvas', { token: mTok });
  check('GET /api/workspaces/canvas round-trips', r.status === 200 && (typeof r.data === 'string' ? JSON.parse(r.data) : r.data)?.nodes?.length === 2, JSON.stringify(r.data));

  // rules
  r = await call('POST', '/api/rules', { token: mTok, body: { printerId: printer.id, triggerType: 'TIME_BASED', triggerValue: 30, alertDaysBefore: 3, maintenanceType: 'PREVENTIVE', checklistItems: ['Lubricar ejes', 'Limpiar boquilla'] } });
  check('POST /api/rules', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const rule = r.data;
  r = await call('GET', `/api/rules?printerId=${printer.id}`, { token: mTok });
  check('GET /api/rules?printerId=', r.status === 200 && r.data.length === 1);
  r = await call('GET', `/api/rules/${rule.id}`, { token: mTok });
  check('GET /api/rules/{id}', r.status === 200 && r.data.id === rule.id);
  r = await call('PATCH', `/api/rules/${rule.id}/pause`, { token: mTok });
  check('PATCH /api/rules/{id}/pause', r.status === 200 && r.data.active === false, JSON.stringify(r.data));
  r = await call('PATCH', `/api/rules/${rule.id}/resume`, { token: mTok });
  check('PATCH /api/rules/{id}/resume', r.status === 200 && r.data.active === true, JSON.stringify(r.data));

  // ---------- Spare parts ----------
  const partBody = (n, extra = {}) => ({ name: `Boquilla ${n}`, partNumber: `PN-${RUN}-${n}`, description: 'desc', brand: 'E3D', category: 'Hotend', stock: 5, minStock: 3, unitPrice: 12.5, supplierUrl: 'https://example.com', ...extra });
  r = await call('POST', '/api/parts', { token: mTok, body: partBody('A') });
  check('POST /api/parts', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const partA = r.data;
  r = await call('POST', '/api/parts', { token: mTok, body: partBody('B', { name: 'Correa GT2', category: 'Movimiento', stock: 20, minStock: 2 }) });
  const partB = r.data;
  // On a fresh DB the DataSeeder puts demo parts in workspace 1 (= the first registered tenant),
  // so assertions are relative / by id instead of exact counts.
  r = await call('GET', '/api/parts', { token: mTok });
  check('GET /api/parts includes the created parts', r.status === 200 && [partA.id, partB.id].every((id) => r.data.some((p) => p.id === id)));
  r = await call('GET', '/api/parts?search=GT2%20v', { token: mTok });
  check('GET /api/parts?search= (no match yet)', r.status === 200 && r.data.length === 0);
  r = await call('GET', `/api/parts?search=${encodeURIComponent('Boquilla A')}`, { token: mTok });
  check('GET /api/parts?search=', r.status === 200 && r.data.length === 1 && r.data[0].id === partA.id, JSON.stringify(r.data));
  r = await call('GET', '/api/parts?category=Hotend', { token: mTok });
  check('GET /api/parts?category=', r.status === 200 && r.data.some((p) => p.id === partA.id) && r.data.every((p) => p.category === 'Hotend'));
  r = await call('GET', '/api/parts?lowStock=true', { token: mTok });
  check('GET /api/parts?lowStock=true excludes part A (stock 5 > min 3)', r.status === 200 && !r.data.some((p) => p.id === partA.id));
  r = await call('PATCH', `/api/parts/${partA.id}/stock`, { token: mTok, body: { type: 'ADJUSTMENT', quantity: 3, note: 'ajuste' } });
  check('PATCH /api/parts/{id}/stock ADJUSTMENT sets stock to 3', r.status === 200 && r.data.stock === 3, JSON.stringify(r.data));
  r = await call('GET', '/api/parts?lowStock=true', { token: mTok });
  check('GET /api/parts?lowStock=true now returns part A', r.status === 200 && r.data.some((p) => p.id === partA.id) && r.data.every((p) => p.isLowStock));
  r = await call('PATCH', `/api/parts/${partA.id}/stock`, { token: mTok, body: { type: 'PURCHASE', quantity: 7 } });
  check('PATCH /api/parts/{id}/stock PURCHASE adds', r.status === 200 && r.data.stock === 10, JSON.stringify(r.data));
  r = await call('GET', '/api/parts/categories', { token: mTok });
  check('GET /api/parts/categories', r.status === 200 && r.data.includes('Hotend') && r.data.includes('Movimiento'), JSON.stringify(r.data));
  r = await call('GET', `/api/parts/${partA.id}`, { token: mTok });
  check('GET /api/parts/{id}', r.status === 200 && r.data.id === partA.id);
  r = await call('GET', `/api/parts/${partA.id}/movements`, { token: mTok });
  check('GET /api/parts/{id}/movements (ADJUSTMENT + PURCHASE recorded)', r.status === 200 && r.data.length >= 2 && r.data.some((x) => x.type === 'ADJUSTMENT') && r.data.some((x) => x.type === 'PURCHASE'), JSON.stringify(r.data));
  r = await call('PUT', `/api/parts/${partB.id}`, { token: mTok, body: partBody('B', { name: 'Correa GT2 v2', category: 'Movimiento', stock: 20, minStock: 2 }) });
  check('PUT /api/parts/{id}', r.status === 200 && r.data.name === 'Correa GT2 v2', JSON.stringify(r.data));
  r = await call('POST', '/api/parts', { token: mTok, body: partBody('C') });
  const partC = r.data;
  r = await call('DELETE', `/api/parts/${partC.id}`, { token: mTok });
  check('DELETE /api/parts/{id}', r.status === 200 || r.status === 204, `${r.status}`);
  r = await call('GET', `/api/parts/${partC.id}`, { token: mTok });
  check('GET deleted part -> 404', r.status === 404, `${r.status}`);

  // ---------- Quotes ----------
  const qIn = { filamentGrams: 100, filamentPricePerGram: 0.03, filamentType: 'PLA', printerWatts: 250, energyPriceKwh: 0.15, printingHours: 5, designHours: 1, designHourlyRate: 18, operatorHourlyRate: 12, marginPercent: 40, discountPercent: 0, units: 2, printerId: printer.id, clientName: 'Cliente E2E', jobDescription: 'Pieza' };
  r = await call('POST', '/api/quotes/calculate', { token: mTok, body: qIn });
  check('POST /api/quotes/calculate', r.status === 200 && r.data.totalPrice > 0 && r.data.componentWear, JSON.stringify(r.data)?.slice(0, 300));
  r = await call('POST', '/api/quotes/calculate', { token: mTok, body: { ...qIn, marginPercent: 0 } });
  check('POST /api/quotes/calculate invalid (margin 0) -> 400 list of {field,message}', r.status === 400 && Array.isArray(r.data), JSON.stringify(r.data));
  r = await call('POST', '/api/quotes', { token: mTok, body: qIn });
  check('POST /api/quotes', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
  const quote = r.data;
  check('quote has quoteNumber and status DRAFT', !!quote?.quoteNumber && quote?.status === 'DRAFT');
  r = await call('PUT', `/api/quotes/${quote.id}`, { token: mTok, body: { ...qIn, units: 3 } });
  check('PUT /api/quotes/{id}', r.status === 200 && r.data.units === 3, JSON.stringify(r.data)?.slice(0, 200));
  r = await call('GET', `/api/quotes/${quote.id}`, { token: mTok });
  check('GET /api/quotes/{id}', r.status === 200 && r.data.id === quote.id);
  r = await call('GET', '/api/quotes?clientName=cliente', { token: mTok });
  check('GET /api/quotes?clientName= (search)', r.status === 200 && r.data.length === 1);
  r = await call('GET', `/api/quotes?status=DRAFT&printerId=${printer.id}&from=2020-01-01&to=2099-01-01`, { token: mTok });
  check('GET /api/quotes?status&printerId&from&to', r.status === 200 && r.data.length === 1, `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
  r = await call('GET', '/api/quotes?status=PAID', { token: mTok });
  check('GET /api/quotes?status=PAID -> empty', r.status === 200 && r.data.length === 0);
  r = await call('POST', `/api/quotes/${quote.id}/duplicate`, { token: mTok });
  check('POST /api/quotes/{id}/duplicate', (r.status === 201 || r.status === 200) && r.data.id !== quote.id && r.data.quoteNumber !== quote.quoteNumber, `${r.status}`);
  const quoteDup = r.data;
  for (const s of ['SENT', 'ACCEPTED', 'PAID']) {
    r = await call('PATCH', `/api/quotes/${quote.id}/status`, { token: mTok, body: { status: s } });
    check(`PATCH /api/quotes/{id}/status -> ${s}`, r.status === 200 && r.data.status === s, `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
  }
  r = await call('GET', `/api/quotes/${quote.id}/pdf`, { token: mTok, raw: true });
  const pdf = Buffer.from(await r.arrayBuffer());
  check('GET /api/quotes/{id}/pdf -> 200 application/pdf %PDF', r.status === 200 && /pdf/.test(r.headers.get('content-type') || '') && pdf.slice(0, 4).toString() === '%PDF', `${r.status} ${r.headers.get('content-type')}`);
  r = await call('DELETE', `/api/quotes/${quoteDup.id}`, { token: mTok });
  check('DELETE /api/quotes/{id}', r.status === 200 || r.status === 204, `${r.status}`);
  skip('corrective order from quote', 'no such endpoint in backend controllers nor in frontend services');

  // ---------- Invite -> TECNICO ----------
  let tTok = null, tUser = null, tDevice = null, tRefresh = null;
  const tEmailLogged = existsSync(LOG);
  r = await call('POST', '/api/workspaces/invites', { token: mTok, body: { email: tEmail } });
  check('POST /api/workspaces/invites', r.status === 200 && 'emailSent' in (r.data || {}), `${r.status} ${JSON.stringify(r.data)}`);
  let inviteCode = null;
  if (tEmailLogged) { await sleep(500); inviteCode = codeFromLog(tEmail); }
  if (!inviteCode) {
    skip('TECNICO register/login + all TECNICO-dependent checks (orders, role restrictions)', `invite code not found in backend log (${LOG}); set E2E_BACKEND_LOG`);
  } else {
    const t = await registerAndLogin(tEmail, { inviteToken: inviteCode });
    check('POST /api/auth/register with inviteToken -> TECNICO', t.reg.status === 200, JSON.stringify(t.reg.data));
    check('login as TECNICO, same workspace', t.login.status === 200 && t.login.data.user.role === 'TECNICO' && t.login.data.user.workspaceId === mUser.workspaceId, JSON.stringify(t.login.data));
    check('invite is single use', (await call('POST', '/api/auth/register', { body: { email: `x-${tEmail}`, password: PASSWORD, inviteToken: inviteCode } })).status >= 400);
    tTok = t.login.data.accessToken; tUser = t.login.data.user; tDevice = t.deviceId; tRefresh = rtFrom(t.login.headers);
  }

  if (tTok) {
    // role restrictions
    r = await call('GET', '/api/metrics/dashboard', { token: tTok });
    check('TECNICO GET /api/metrics/dashboard -> 403', r.status === 403, `${r.status}`);
    r = await call('POST', '/api/orders', { token: mTok, body: { printerId: printer.id, type: 'PREVENTIVE', checklistItems: [], parts: [] } });
    check('MANAGER POST /api/orders -> 403 (only TECNICO creates)', r.status === 403, `${r.status}`);
    r = await call('GET', '/api/printers', { token: tTok });
    check('TECNICO can list printers', r.status === 200 && r.data.length === 2);
    r = await call('GET', '/api/notifications', { token: tTok });
    check('TECNICO GET /api/notifications', r.status === 200 && Array.isArray(r.data));

    // WebSocket: manager subscribes, then TECNICO flow triggers notification
    let ws = null;
    try {
      ws = await stompConnect(mTok, mUser.id);
      check('WebSocket STOMP CONNECT with Bearer + SUBSCRIBE own queue', true);
    } catch (e) { check('WebSocket STOMP CONNECT with Bearer + SUBSCRIBE own queue', false, e.message); }
    try {
      await stompConnect('garbage.token.value', mUser.id);
      check('WebSocket STOMP rejects bad token', false, 'connected');
    } catch { check('WebSocket STOMP rejects bad token', true); }

    // dashboard baseline
    r = await call('GET', '/api/metrics/dashboard', { token: mTok });
    check('MANAGER GET /api/metrics/dashboard', r.status === 200 && 'totalOrders' in r.data, JSON.stringify(r.data)?.slice(0, 200));
    const m0 = r.data;
    r = await call('GET', `/api/metrics/dashboard?from=2020-01-01&to=2099-12-31`, { token: mTok });
    check('GET /api/metrics/dashboard?from&to', r.status === 200);

    // ---------- Orders ----------
    // Part A has stock 10, min 3. Use 8 so completion drops it to 2 (<= min) -> low stock notification.
    const orderBody = { printerId: printer.id, type: 'PREVENTIVE', description: 'Mantenimiento e2e', estimatedTimeMinutes: 60, checklistItems: [{ text: 'Lubricar', done: true, na: false }, { text: 'Limpiar', done: false, na: true }], parts: [{ partId: partA.id, quantity: 8 }, { externalPartName: 'Tornillo', quantity: 2, externalUnitPrice: 0.5 }] };
    r = await call('POST', '/api/orders', { token: tTok, body: orderBody });
    check('TECNICO POST /api/orders (checklist + parts)', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data)?.slice(0, 300)}`);
    const order = r.data;
    check('order has 2 checklist items, 2 parts, status PENDING', order?.checklistItems?.length === 2 && order?.parts?.length === 2 && order?.status === 'PENDING', JSON.stringify(order)?.slice(0, 300));
    const pForm = new FormData();
    pForm.append('photos', new Blob([JPEG], { type: 'image/jpeg' }), 'p1.jpg');
    pForm.append('photos', new Blob([JPEG], { type: 'image/jpeg' }), 'p2.jpg');
    r = await call('POST', `/api/orders/${order.id}/photos`, { token: tTok, form: pForm });
    check('POST /api/orders/{id}/photos (2 files, field "photos")', r.status === 200 && r.data.photos?.length === 2, `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
    const photoUrl = r.data?.photos?.[0]?.url;
    r = await call('GET', `/api/orders/${order.id}`, { token: tTok });
    check('GET /api/orders/{id}', r.status === 200 && r.data.id === order.id && r.data.photos.length === 2);
    r = await call('GET', `/api/orders?printerId=${printer.id}&status=PENDING`, { token: tTok });
    check('GET /api/orders?printerId&status', r.status === 200 && r.data.length === 1);
    r = await call('GET', `/api/orders?status=COMPLETED`, { token: tTok });
    check('GET /api/orders?status=COMPLETED -> empty', r.status === 200 && r.data.length === 0);
    r = await call('POST', `/api/orders/${order.id}/parts`, { token: tTok, body: { partId: partB.id, quantity: 1 } });
    check('POST /api/orders/{id}/parts', r.status === 200 && r.data.parts.length === 3, `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
    const addedPart = r.data?.parts?.find((p) => p.partId === partB.id);
    if (addedPart) {
      r = await call('DELETE', `/api/orders/${order.id}/parts/${addedPart.id}`, { token: tTok });
      check('DELETE /api/orders/{id}/parts/{partId}', r.status === 200 || r.status === 204, `${r.status}`);
    }

    // status flow
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: tTok, body: { newStatus: 'COMPLETED' } });
    check('invalid transition PENDING->COMPLETED -> 400', r.status === 400, `${r.status}`);
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: tTok, body: { newStatus: 'IN_PROGRESS' } });
    check('TECNICO PENDING->IN_PROGRESS', r.status === 200 && r.data.status === 'IN_PROGRESS', `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: tTok, body: { newStatus: 'IN_REVIEW' } });
    check('TECNICO IN_PROGRESS->IN_REVIEW', r.status === 200 && r.data.status === 'IN_REVIEW', `${r.status}`);
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: tTok, body: { newStatus: 'COMPLETED' } });
    check('TECNICO cannot complete -> 403', r.status === 403, `${r.status}`);
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: mTok, body: { newStatus: 'IN_PROGRESS' } });
    check('MANAGER reject without comment -> 400', r.status === 400, `${r.status}`);
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: mTok, body: { newStatus: 'IN_PROGRESS', comment: 'Falta revisar' } });
    check('MANAGER reject with comment IN_REVIEW->IN_PROGRESS', r.status === 200 && r.data.status === 'IN_PROGRESS', `${r.status}`);
    await call('PATCH', `/api/orders/${order.id}/status`, { token: tTok, body: { newStatus: 'IN_REVIEW' } });
    r = await call('PATCH', `/api/orders/${order.id}/status`, { token: mTok, body: { newStatus: 'COMPLETED' } });
    check('MANAGER IN_REVIEW->COMPLETED', r.status === 200 && r.data.status === 'COMPLETED', `${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
    r = await call('GET', `/api/parts/${partA.id}`, { token: mTok });
    check('stock deducted on completion (10 - 8 = 2)', r.status === 200 && r.data.stock === 2 && r.data.isLowStock === true, JSON.stringify(r.data));
    r = await call('GET', `/api/parts/${partA.id}/movements`, { token: mTok });
    check('ORDER_USE movement recorded', r.status === 200 && r.data.some((x) => x.type === 'ORDER_USE'), JSON.stringify(r.data)?.slice(0, 300));
    r = await call('GET', `/api/orders/${order.id}/history`, { token: mTok });
    check('GET /api/orders/{id}/history (>=6 entries)', r.status === 200 && r.data.length >= 6, `${r.data?.length}`);
    r = await call('POST', `/api/orders/${order.id}/parts`, { token: tTok, body: { partId: partB.id, quantity: 1 } });
    check('add part to closed order -> 400', r.status === 400, `${r.status}`);

    // notifications
    r = await call('GET', '/api/notifications', { token: mTok });
    check('MANAGER GET /api/notifications (low-stock + order events)', r.status === 200 && r.data.length > 0, JSON.stringify(r.data)?.slice(0, 300));
    const notifs = r.data || [];
    check('low-stock notification present', notifs.some((n) => /stock/i.test(`${n.type} ${n.message}`)), JSON.stringify(notifs.map((n) => n.type)));
    if (notifs.length) {
      r = await call('PATCH', `/api/notifications/${notifs[0].id}/read`, { token: mTok });
      check('PATCH /api/notifications/{id}/read', r.status === 200 && r.data.read === true, JSON.stringify(r.data));
    }
    await sleep(500);
    if (ws) {
      check('WebSocket received >=1 pushed notification for manager', ws.messages.length >= 1, `received ${ws.messages.length}`);
      ws.ws.close();
    }

    // dashboard after completion (cache eviction)
    r = await call('GET', '/api/metrics/dashboard', { token: mTok });
    check('dashboard reflects completed order (cache evicted after commit)', r.status === 200 && r.data.totalOrders === m0.totalOrders + 1 && r.data.closedOrders === m0.closedOrders + 1, `before total=${m0.totalOrders} closed=${m0.closedOrders}; after total=${r.data.totalOrders} closed=${r.data.closedOrders}`);
    check('dashboard lists low-stock part', (r.data.lowStockParts || []).some((p) => p.name === partA.name || p.id === partA.id || p.partId === partA.id), JSON.stringify(r.data.lowStockParts));

    // printer history
    r = await call('GET', `/api/printers/${printer.id}/history`, { token: mTok });
    check('GET /api/printers/{id}/history', r.status === 200 && r.data.orders.length === 1 && r.data.currentPage === 0, JSON.stringify(r.data)?.slice(0, 300));
    r = await call('GET', `/api/printers/${printer.id}/history?type=CORRECTIVE`, { token: mTok });
    check('history ?type=CORRECTIVE filter -> empty', r.status === 200 && r.data.orders.length === 0);
    r = await call('GET', `/api/printers/${printer.id}/history?type=PREVENTIVE&from=2020-01-01&to=2099-01-01&page=0&size=1`, { token: mTok });
    check('history type+from+to+page+size', r.status === 200 && r.data.orders.length === 1 && r.data.totalPages === 1);
    r = await call('GET', `/api/printers/${printer.id}/history?page=5&size=1`, { token: mTok });
    check('history page beyond range -> 200 empty', r.status === 200 && r.data.orders.length === 0, `${r.status}`);
    r = await call('GET', `/api/printers/${printer.id}/history/metrics`, { token: mTok });
    check('GET history/metrics', r.status === 200 && r.data.totalInterventions === 1 && r.data.preventiveCount === 1, JSON.stringify(r.data));
    r = await call('GET', `/api/printers/${printer.id}/history/parts`, { token: mTok });
    check('GET history/parts (usage summary)', r.status === 200 && r.data.length >= 1, JSON.stringify(r.data));

    // static uploads + compression
    if (photoUrl) {
      const url = photoUrl.startsWith('http') ? photoUrl : BASE + photoUrl;
      const pr = await fetch(url);
      check('GET uploaded order photo -> 200 + Cache-Control max-age', pr.status === 200 && /max-age=\d+/.test(pr.headers.get('cache-control') || ''), `${pr.status} ${pr.headers.get('cache-control')}`);
    }
    if (printer.photoUrl) {
      const url = printer.photoUrl.startsWith('http') ? printer.photoUrl : BASE + printer.photoUrl;
      const pr = await fetch(url);
      check('GET uploaded printer photo -> 200 + Cache-Control max-age', pr.status === 200 && /max-age=\d+/.test(pr.headers.get('cache-control') || ''), `${pr.status} ${pr.headers.get('cache-control')}`);
    }
    // Need a >=1KB JSON: dashboard or order list. Use raw http to see the real Content-Encoding.
    for (const p of ['/api/metrics/dashboard', '/api/orders', '/api/printers']) {
      const gr = await call('GET', p, { token: mTok, headers: { 'Accept-Encoding': 'gzip' }, raw: true });
      const buf = Buffer.from(await gr.arrayBuffer());
      const enc = gr.headers.get('content-encoding');
      // fetch (undici) transparently decodes, so the header is the reliable signal
      if (enc === 'gzip') { check(`gzip compression on ${p}`, true); break; }
      if (p === '/api/printers') check('gzip compression on a >=1KB JSON response', false, `content-encoding=${enc} (size ${buf.length})`);
    }
  }

  // ---------- Notification preferences ----------
  r = await call('GET', '/api/users/me/notification-preferences', { token: mTok });
  check('GET /api/users/me/notification-preferences', r.status === 200 && 'dailySummaryTime' in r.data, JSON.stringify(r.data));
  const prefs = { maintenanceDue: false, lowStock: true, assignedOrders: false, ordersInReview: true, dailySummary: true, dailySummaryTime: '07:30' };
  r = await call('PUT', '/api/users/me/notification-preferences', { token: mTok, body: prefs });
  check('PUT /api/users/me/notification-preferences', r.status === 200 && r.data.dailySummaryTime === '07:30' && r.data.maintenanceDue === false, JSON.stringify(r.data));
  r = await call('GET', '/api/users/me/notification-preferences', { token: mTok });
  check('preferences persisted', r.status === 200 && r.data.dailySummaryTime === '07:30' && r.data.dailySummary === true);

  // ---------- Cross-tenant isolation ----------
  if (m2Tok) {
    const iso = async (name, method, path, body) => {
      const x = await call(method, path, { token: m2Tok, body });
      check(`isolation: ${name} -> 403/404`, x.status === 404 || x.status === 403, `${x.status} ${JSON.stringify(x.data)?.slice(0, 120)}`);
    };
    await iso('GET printer', 'GET', `/api/printers/${printer.id}`);
    await iso('PATCH printer status', 'PATCH', `/api/printers/${printer.id}/status`, { status: 'OUT_OF_SERVICE' });
    await iso('GET printer by serial', 'GET', `/api/printers/by-serial/${printer.serialNumber}`);
    await iso('GET printer components', 'GET', `/api/printers/${printer.id}/components`);
    await iso('GET printer history', 'GET', `/api/printers/${printer.id}/history`);
    await iso('GET printer history/metrics', 'GET', `/api/printers/${printer.id}/history/metrics`);
    await iso('GET printer history/parts', 'GET', `/api/printers/${printer.id}/history/parts`);
    await iso('GET rule', 'GET', `/api/rules/${rule.id}`);
    await iso('GET rules by printerId', 'GET', `/api/rules?printerId=${printer.id}`).catch(() => {});
    await iso('GET part', 'GET', `/api/parts/${partA.id}`);
    await iso('PATCH part stock', 'PATCH', `/api/parts/${partA.id}/stock`, { type: 'PURCHASE', quantity: 1 });
    await iso('GET part movements', 'GET', `/api/parts/${partA.id}/movements`);
    await iso('DELETE part', 'DELETE', `/api/parts/${partA.id}`);
    await iso('GET quote', 'GET', `/api/quotes/${quote.id}`);
    await iso('GET quote pdf', 'GET', `/api/quotes/${quote.id}/pdf`);
    await iso('PATCH quote status', 'PATCH', `/api/quotes/${quote.id}/status`, { status: 'REJECTED' });
    await iso('DELETE quote', 'DELETE', `/api/quotes/${quote.id}`);
    if (tTok) {
      const orders = (await call('GET', '/api/orders', { token: mTok })).data;
      const oid = orders[0].id;
      await iso('GET order', 'GET', `/api/orders/${oid}`);
      await iso('GET order history', 'GET', `/api/orders/${oid}/history`);
      await iso('PATCH order status', 'PATCH', `/api/orders/${oid}/status`, { newStatus: 'CANCELLED' });
      await iso('POST order part', 'POST', `/api/orders/${oid}/parts`, { partId: partA.id, quantity: 1 });
      const x = await call('POST', '/api/orders', { token: tTok, body: { printerId: printer.id, type: 'CORRECTIVE', description: 'x', checklistItems: [], parts: [] } });
      check('sanity: own-tenant tecnico still ok', x.status === 200 || x.status === 201);
    }
    // list endpoints must not leak
    const lp = await call('GET', '/api/printers', { token: m2Tok });
    const lq = await call('GET', '/api/quotes', { token: m2Tok });
    const lpa = await call('GET', '/api/parts', { token: m2Tok });
    const lo = await call('GET', '/api/orders', { token: m2Tok });
    check('isolation: second tenant lists are empty (printers, quotes, parts, orders)', [lp, lq, lpa, lo].every((x) => x.status === 200 && x.data.length === 0), [lp, lq, lpa, lo].map((x) => x.data?.length).join(','));
    const qm = await call('POST', '/api/quotes', { token: m2Tok, body: { ...qIn, printerId: printer.id } });
    check('isolation: quote created with foreign printerId is NOT linked to it (id ignored by design)', (qm.status === 200 || qm.status === 201) ? qm.data.printerId == null : (qm.status === 404 || qm.status === 403 || qm.status === 400), `${qm.status} printerId=${qm.data?.printerId}`);
    const cm = await call('GET', '/api/workspaces/canvas', { token: m2Tok });
    check('isolation: canvas of other tenant is not visible', cm.status === 200 && !JSON.stringify(cm.data).includes(`"printerId":${printer.id}`));
  }

  // ---------- Funciones nuevas: bobinas, presupuesto con extras, link público, cola, telemetría ----------
  r = await call('POST', '/api/spools', { token: mTok, body: { material: 'PETG', color: 'Negro', initialGrams: 1000, costPerKg: 25000 } });
  check('POST /api/spools', r.status === 200 && r.data.pricePerGram === 25 && r.data.remainingGrams === 1000, JSON.stringify(r.data));
  const spool = r.data;
  r = await call('POST', '/api/quotes', { token: mTok, body: {
    filamentGrams: 50, filamentPricePerGram: 25, filamentType: 'PETG', printerWatts: 150, energyPriceKwh: 100, printingHours: 2,
    marginPercent: 50, units: 2, printerId: printer.id, clientName: 'Cliente E2E', jobDescription: 'Engranajes', spoolId: spool.id,
    extraCosts: [{ description: 'Rodamiento 608', amount: 4500 }], draftWatermark: false } });
  check('POST /api/quotes with extra costs, spool and watermark off', r.status === 200 && r.data.extraCostsTotal === 4500
    && r.data.extraCosts?.[0]?.description === 'Rodamiento 608' && r.data.draftWatermark === false && r.data.spoolId === spool.id, JSON.stringify(r.data));
  const eq = r.data;
  r = await call('GET', `/api/quotes/${eq.id}/pdf`, { token: mTok, raw: true });
  check('GET quote PDF (with extras) -> application/pdf', r.status === 200 && (r.headers.get('content-type') || '').includes('pdf'), `${r.status}`);
  r = await call('POST', `/api/quotes/${eq.id}/share`, { token: mTok });
  check('POST /api/quotes/{id}/share -> SENT + public URL', r.status === 200 && r.data.status === 'SENT' && /\/q\/[A-Za-z0-9_-]{16,}$/.test(r.data.publicUrl || ''), JSON.stringify(r.data));
  const pubToken = (r.data.publicUrl || '').split('/q/')[1];
  r = await call('GET', `/api/public/quotes/${pubToken}`);
  check('GET public quote without login, no internal costs', r.status === 200 && r.data.totalPrice === eq.totalPrice && !('totalCost' in r.data) && !('marginPercent' in r.data), JSON.stringify(r.data));
  r = await call('POST', `/api/public/quotes/${pubToken}/accept`, { body: { name: 'Ana', note: 'Ok' } });
  check('client accepts from public link -> ACCEPTED', r.status === 200 && r.data.status === 'ACCEPTED', JSON.stringify(r.data));
  r = await call('GET', '/api/jobs', { token: mTok });
  const job = Array.isArray(r.data) ? r.data.find((j) => j.quoteId === eq.id) : null;
  check('accepted quote entered the print queue', r.status === 200 && job && job.status === 'QUEUED' && job.estimatedHours === 4 && job.filamentGrams === 100, JSON.stringify(r.data));

  // El agente arranca el trabajo en espera más antiguo de la impresora: se cancelan los demás.
  for (const other of (await call('GET', `/api/jobs?printerId=${printer.id}`, { token: mTok })).data) {
    if (other.id !== job?.id) await call('POST', `/api/jobs/${other.id}/cancel`, { token: mTok });
  }
  r = await call('POST', `/api/printers/${printer.id}/integration`, { token: mTok, body: { type: 'MOONRAKER' } });
  check('POST printer integration -> device token', r.status === 200 && /^pod_/.test(r.data.token || ''), JSON.stringify(r.data));
  const device = `Device ${r.data.token}`;
  r = await call('POST', '/api/agent/telemetry', { headers: { Authorization: device }, body: { state: 'PRINTING', progress: 10, nozzleTemp: 240 } });
  check('agent telemetry PRINTING -> starts the queued job', r.status === 200 && (await call('GET', '/api/jobs', { token: mTok })).data.some((j) => j.id === job?.id && j.status === 'PRINTING'));
  r = await call('POST', '/api/agent/telemetry', { headers: { Authorization: device }, body: { state: 'FINISHED', progress: 100, usage: { printSeconds: 14400, filamentGrams: 96 } } });
  const doneJob = (await call('GET', '/api/jobs?active=false', { token: mTok })).data.find((j) => j.id === job?.id);
  check('agent telemetry FINISHED -> job DONE with real usage', r.status === 200 && doneJob?.status === 'DONE' && doneJob.actualHours === 4 && doneJob.actualGrams === 96, JSON.stringify(doneJob));
  r = await call('GET', '/api/spools', { token: mTok });
  check('spool consumed by the finished job', r.data.find((x) => x.id === spool.id)?.remainingGrams === 904, JSON.stringify(r.data));
  r = await call('GET', '/api/printers/telemetry', { token: mTok });
  check('GET /api/printers/telemetry', r.status === 200 && r.data.some((t) => t.printerId === printer.id && t.state === 'FINISHED'), JSON.stringify(r.data));
  check('agent with wrong token -> 401', (await call('POST', '/api/agent/telemetry', { headers: { Authorization: 'Device pod_nope' }, body: { state: 'IDLE' } })).status === 401);

  r = await call('POST', '/api/suppliers', { token: mTok, body: { name: 'Proveedor E2E', email: 'ventas@proveedor.test' } });
  check('POST /api/suppliers', r.status === 200 && r.data.id, JSON.stringify(r.data));
  r = await call('POST', '/api/purchase-orders/suggest', { token: mTok });
  check('POST /api/purchase-orders/suggest', r.status === 200 && Array.isArray(r.data), JSON.stringify(r.data));
  r = await call('GET', '/api/metrics/profitability', { token: mTok });
  check('GET /api/metrics/profitability', r.status === 200 && r.data.totals && Array.isArray(r.data.printers), JSON.stringify(r.data).slice(0, 200));
  r = await call('GET', '/api/metrics/predictions', { token: mTok });
  check('GET /api/metrics/predictions', r.status === 200 && Array.isArray(r.data), `${r.status}`);
  r = await call('GET', '/api/activity?page=0&size=10', { token: mTok });
  check('GET /api/activity (paged)', r.status === 200 && Array.isArray(r.data.content) && r.data.content.length > 0, `${r.status}`);
  r = await call('GET', '/api/exports/quotes.csv', { token: mTok, raw: true });
  const csvBytes = r.status === 200 ? new Uint8Array(await r.arrayBuffer()) : new Uint8Array();
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csvBytes);
  // BOM UTF-8 (EF BB BF) para que Excel muestre bien los acentos; Response.text() lo descartaría.
  check('GET /api/exports/quotes.csv (Excel friendly)', csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf
    && csv.includes('Número;Fecha') && csv.includes('Cliente E2E'), `${r.status}`);
  r = await call('GET', '/api/orders?page=0&size=2', { token: mTok });
  check('GET /api/orders?page (paged response)', r.status === 200 && Array.isArray(r.data.content) && typeof r.data.totalElements === 'number', `${r.status}`);

  // ---------- Auth: refresh, sessions, logout ----------
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: mRefresh, deviceId: m.deviceId } });
  check('POST /api/auth/refresh', r.status === 200 && r.data.accessToken && r.data.user.id === mUser.id, `${r.status}`);
  if (r.status === 200) { mTok = r.data.accessToken; mRefresh = rtFrom(r.headers) ?? mRefresh; }
  check('refreshed access token works', (await call('GET', '/api/printers', { token: mTok })).status === 200);
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: mRefresh, deviceId: 'other-device' } });
  check('refresh with wrong deviceId -> 401', r.status === 401, `${r.status}`);
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: 'nope', deviceId: m.deviceId } });
  check('refresh with unknown token -> 401', r.status === 401, `${r.status}`);

  const dev2 = `dev2-${RUN}`;
  const l2 = await call('POST', '/api/auth/login', { body: { email: mEmail, password: PASSWORD, deviceId: dev2, rememberMe: false } });
  r = await call('GET', '/api/auth/sessions', { token: mTok });
  check('GET /api/auth/sessions lists 2 devices', r.status === 200 && r.data.length === 2, JSON.stringify(r.data));
  r = await call('DELETE', `/api/auth/sessions/${dev2}`, { token: mTok });
  check('DELETE /api/auth/sessions/{deviceId}', r.status === 200, `${r.status}`);
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: rtFrom(l2.headers), deviceId: dev2 } });
  check('revoked session cannot refresh -> 401', r.status === 401, `${r.status}`);
  r = await call('GET', '/api/auth/sessions', { token: mTok });
  check('sessions now 1', r.status === 200 && r.data.length === 1);

  // logout keepSession=true (soft: refresh stays valid), then hard
  const staleTok = mTok;
  r = await call('POST', `/api/auth/logout?deviceId=${encodeURIComponent(m.deviceId)}&keepSession=true`, { token: mTok, body: {} });
  check('POST /api/auth/logout?keepSession=true', r.status === 200, `${r.status}`);
  check('blacklisted access token -> 401 after logout', (await call('GET', '/api/printers', { token: staleTok })).status === 401);
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: mRefresh, deviceId: m.deviceId } });
  check('soft logout: refresh token still valid (Face ID flow)', r.status === 200, `${r.status}`);
  mTok = r.data?.accessToken; mRefresh = rtFrom(r.headers) ?? mRefresh;
  r = await call('POST', `/api/auth/logout?deviceId=${encodeURIComponent(m.deviceId)}&keepSession=false`, { token: mTok, body: {} });
  check('POST /api/auth/logout?keepSession=false', r.status === 200, `${r.status}`);
  check('hard logout: access token -> 401', (await call('GET', '/api/printers', { token: mTok })).status === 401);
  r = await call('POST', '/api/auth/refresh', { body: { refreshToken: mRefresh, deviceId: m.deviceId } });
  check('hard logout: refresh token revoked -> 401', r.status === 401, `${r.status}`);

  // forgot / reset password (code comes from the backend log)
  r = await call('POST', '/api/auth/forgot-password', { body: { email: mEmail } });
  check('POST /api/auth/forgot-password', r.status === 200, `${r.status}`);
  r = await call('POST', '/api/auth/forgot-password', { body: { email: `nobody-${RUN}@e2e.test` } });
  check('forgot-password unknown email -> 200 (no enumeration)', r.status === 200);
  await sleep(500);
  const resetCode = existsSync(LOG) ? codeFromLog(mEmail) : null;
  if (!resetCode) skip('POST /api/auth/reset-password', 'reset code not found in backend log');
  else {
    const NEWPW = 'NewPassw0rd!e2e';
    r = await call('POST', '/api/auth/reset-password', { body: { token: resetCode, newPassword: NEWPW } });
    check('POST /api/auth/reset-password', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
    r = await call('POST', '/api/auth/login', { body: { email: mEmail, password: NEWPW, deviceId: m.deviceId, rememberMe: false } });
    check('login with new password', r.status === 200, `${r.status}`);
    r = await call('POST', '/api/auth/login', { body: { email: mEmail, password: PASSWORD, deviceId: m.deviceId, rememberMe: false }, headers: { 'X-Forwarded-For': '10.1.1.1' } });
    check('login with old password -> 401', r.status === 401);
    r = await call('POST', '/api/auth/reset-password', { body: { token: resetCode, newPassword: NEWPW } });
    check('reset code is single use -> 401/400', r.status === 401 || r.status === 400, `${r.status}`);
  }
  r = await call('POST', '/api/auth/verify-email', { body: { token: '000000' } });
  check('POST /api/auth/verify-email bad code -> 400', r.status === 400, `${r.status}`);
  r = await call('POST', '/api/auth/resend-verification', { body: { email: mEmail } });
  check('POST /api/auth/resend-verification -> 200', r.status === 200, `${r.status}`);

  // ---------- Google ----------
  r = await call('POST', '/api/auth/google', { body: { idToken: 'garbage.not.a.token', deviceId: `g-${RUN}`, rememberMe: false }, headers: { 'X-Forwarded-For': '10.2.2.2' } });
  check('POST /api/auth/google garbage idToken -> 401', r.status === 401, `${r.status} ${JSON.stringify(r.data)}`);
  r = await call('POST', '/api/auth/google/complete', { body: { onboardingToken: 'garbage', deviceId: `g-${RUN}`, rememberMe: false, inviteToken: null, workspaceName: 'x' }, headers: { 'X-Forwarded-For': '10.2.2.3' } });
  check('POST /api/auth/google/complete garbage onboardingToken -> 401', r.status === 401, `${r.status}`);
  skip('Google happy path (200 / 202 onboarding)', 'a real Google ID token cannot be produced offline');

  // ---------- IP lockout (last; distinct X-Forwarded-For, which the backend honours) ----------
  const ip = `10.77.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const codes = [];
  for (let i = 0; i < 6; i++) {
    const x = await call('POST', '/api/auth/login', { body: { email: mEmail, password: 'wrongwrong', deviceId: 'lock', rememberMe: false }, headers: { 'X-Forwarded-For': ip } });
    codes.push(x.status);
  }
  check('IP lockout: 5 bad logins -> 401, 6th blocked', codes.slice(0, 5).every((c) => c === 401) && codes[5] !== 401 && codes[5] >= 400, codes.join(','));
  r = await call('POST', '/api/auth/login', { body: { email: mEmail, password: 'NewPassw0rd!e2e', deviceId: 'lock', rememberMe: false }, headers: { 'X-Forwarded-For': ip } });
  check('IP lockout: even correct credentials blocked from that IP', r.status !== 200, `${r.status}`);
  r = await call('POST', '/api/auth/login', { body: { email: mEmail, password: 'NewPassw0rd!e2e', deviceId: 'lock', rememberMe: false }, headers: { 'X-Forwarded-For': '10.200.200.200' } });
  check('IP lockout: other IP unaffected', r.status === 200 || !resetCode, `${r.status}`);
}

main()
  .catch((e) => { failed++; failures.push('UNCAUGHT: ' + e.message); console.log('FAIL  uncaught: ' + (e.stack || e)); })
  .finally(() => {
    console.log(`\n==== ${passed} passed, ${failed} failed, ${skipped} skipped ====`);
    if (failures.length) console.log('Failures:\n - ' + failures.join('\n - '));
    process.exit(failed ? 1 : 0);
  });
