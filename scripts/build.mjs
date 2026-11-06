// Genera data/noticias.json uniendo:
//   1) las publicaciones de Instagram (API oficial de Instagram, si hay token), y
//   2) las notas manuales de la carpeta manual/*.json
// Uso: node scripts/build.mjs   (Node 18+)
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TOKEN = (process.env.IG_TOKEN || '').trim();
const BEHOLD_URL = (process.env.BEHOLD_FEED_URL || '').trim();
const MAX_POSTS =Number(process.env.IG_MAX || 200);
const API = process.env.IG_API || 'https://graph.instagram.com'; // IG_API solo se usa para pruebas
const IG_FILE = path.join(ROOT, 'data', 'instagram.json');
const IG_IMG_DIR = path.join(ROOT, 'img', 'ig');
const MANUAL_DIR = path.join(ROOT, 'manual');
const OUT_FILE = path.join(ROOT, 'data', 'noticias.json');

const warn = (m) => console.log(`::warning::${m}`);
const exists = async (p) => fs.access(p).then(() => true, () => false);
const readJson = async (p, d) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return d; } };
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/* ---------------- Instagram ---------------- */
function titleAndSummary(caption) {
  const clean = (caption || '').replace(/\r/g, '');
  const lines = clean.split('\n').map((l) => l.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  let title = lines[0] || 'Publicación de Instagram';
  let rest = lines.slice(1).join(' ');
  if (title.length > 110) {
    const cut = title.slice(0, 110);
    title = cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : 110) + '…';
    rest = lines.join(' ');
  }
  let summary = rest.length > 220 ? rest.slice(0, 220).replace(/\s+\S*$/, '') + '…' : rest;
  return { title, summary };
}

async function download(url, name) {
  if (!url) return null;
  await fs.mkdir(IG_IMG_DIR, { recursive: true });
  for (const ext of ['jpg', 'png', 'webp']) {
    if (await exists(path.join(IG_IMG_DIR, `${name}.${ext}`))) return `img/ig/${name}.${ext}`;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar imagen`);
  const ct = r.headers.get('content-type') || '';
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  await fs.writeFile(path.join(IG_IMG_DIR, `${name}.${ext}`), Buffer.from(await r.arrayBuffer()));
  return `img/ig/${name}.${ext}`;
}

async function fetchInstagram() {
  // Mantiene vivo el token de larga duración (60 días). Si falla, no es grave.
  try {
    const r = await fetch(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(TOKEN)}`);
    if (!r.ok) console.log(`Aviso: no se pudo renovar el token (HTTP ${r.status}).`);
  } catch { /* ignorar */ }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}';
  let url = `${API}/me/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(TOKEN)}`;
  const raw = [];
  while (url && raw.length < MAX_POSTS) {
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`);
    raw.push(...(j.data || []));
    url = j.paging?.next || null;
  }

  const items = [];
  for (const m of raw) {
    const frames = m.media_type === 'CAROUSEL_ALBUM' && m.children?.data?.length
      ? m.children.data.map((c) => ({ id: c.id, src: c.media_type === 'VIDEO' ? c.thumbnail_url : c.media_url }))
      : [{ id: m.id, src: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url }];
    const images = [];
    for (const f of frames) {
      try { const p = await download(f.src, f.id); if (p) images.push(p); }
      catch (e) { warn(`Imagen ${f.id}: ${e.message}`); }
    }
    const { title, summary } = titleAndSummary(m.caption);
    items.push({
      id: `ig-${m.id}`,
      source: 'instagram',
      title,
      summary,
      body: m.caption || '',
      date: m.timestamp,
      images,
      url: m.permalink,
      tags: [...new Set(((m.caption || '').match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1)))].slice(0, 6),
    });
  }
  return items;
}

// Alternativa sin app de Meta: feed JSON de Behold (https://behold.so), que se conecta a la cuenta desde su panel.
async function fetchBehold() {
  const r = await fetch(BEHOLD_URL);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const posts = Array.isArray(j) ? j : j.posts || [];
  const items = [];
  for (const m of posts) {
    const isVideo = m.mediaType === 'VIDEO';
    const frames = m.mediaType === 'CAROUSEL_ALBUM' && m.children?.length
      ? m.children.map((c) => ({ id: String(c.id), src: c.mediaType === 'VIDEO' ? c.thumbnailUrl : c.mediaUrl }))
      : [{ id: String(m.id), src: isVideo ? m.thumbnailUrl : m.mediaUrl }];
    const images = [];
    for (const f of frames) {
      try { const p = await download(f.src, f.id); if (p) images.push(p); }
      catch (e) { warn(`Imagen ${f.id}: ${e.message}`); }
    }
    const { title, summary } = titleAndSummary(m.caption);
    items.push({
      id: `ig-${m.id}`, source: 'instagram', title, summary, body: m.caption || '', date: m.timestamp, images, url: m.permalink,
      tags: [...new Set((m.hashtags || []).map((t) => String(t).replace(/^#/, '')))].slice(0, 6),
    });
  }
  return items;
}

async function loadInstagram() {
  const prev = await readJson(IG_FILE, { items: [] });
  if (!TOKEN && !BEHOLD_URL) {
    console.log('Sin IG_TOKEN ni BEHOLD_FEED_URL: se usan las publicaciones de Instagram ya guardadas.');
    return prev.items || [];
  }
  try {
    let items;
    if (TOKEN) items = await fetchInstagram();
    else {
      // El plan gratuito de Behold devuelve pocas publicaciones: se acumulan con las ya guardadas.
      const fresh = await fetchBehold();
      const byId = new Map((prev.items || []).map((i) => [i.id, i]));
      fresh.forEach((i) => byId.set(i.id, i));
      items = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    await fs.mkdir(path.dirname(IG_FILE), { recursive: true });
    await fs.writeFile(IG_FILE, JSON.stringify({ fetched: new Date().toISOString(), items }, null, 2) + '\n');
    console.log(`Instagram: ${items.length} publicaciones.`);
    return items;
  } catch (e) {
    warn(`No se pudo leer Instagram (${e.message}). Revisá el secreto IG_TOKEN; se mantienen las publicaciones guardadas.`);
    return prev.items || [];
  }
}

/* ---------------- Notas manuales ---------------- */
async function loadManual() {
  if (!(await exists(MANUAL_DIR))) return [];
  const files = (await fs.readdir(MANUAL_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
  const items = [];
  for (const f of files) {
    try {
      const m = JSON.parse(await fs.readFile(path.join(MANUAL_DIR, f), 'utf8'));
      const title = str(m.title);
      if (!title) { warn(`manual/${f}: falta "title"; se omite.`); continue; }
      const base = f.replace(/\.json$/, '');
      let date = str(m.date) || (base.match(/^\d{4}-\d{2}-\d{2}/) || [''])[0];
      if (!date || isNaN(new Date(date))) { warn(`manual/${f}: fecha inválida; se usa la actual.`); date = new Date().toISOString(); }
      items.push({
        id: `m-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        source: 'manual',
        title,
        summary: str(m.summary),
        body: str(m.body),
        category: str(m.category),
        author: str(m.author),
        date: new Date(date).toISOString(),
        images: str(m.image) ? [str(m.image)] : Array.isArray(m.images) ? m.images.map(str).filter(Boolean) : [],
        instagram_url: str(m.instagram_url),
        tags: Array.isArray(m.tags) ? m.tags.map(str).filter(Boolean) : [],
      });
    } catch (e) { warn(`manual/${f}: JSON inválido (${e.message}); se omite.`); }
  }
  return items;
}

/* ---------------- Salida ---------------- */
const [ig, manual] = [await loadInstagram(), await loadManual()];
const items = [...ig, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));
await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify({ generated: new Date().toISOString(), items }, null, 2) + '\n');
console.log(`Listo: ${items.length} noticias (${ig.length} de Instagram, ${manual.length} manuales).`);
