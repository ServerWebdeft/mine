/**
 * VoxelCraft 1.24.X — Servicio Web y API Multijugador (Local + Supabase Cloud Sync)
 * Sirve el cliente 3D WebGL y sincroniza jugadores (`voxel_players`) y bloques (`voxel_world_blocks`)
 * tanto en base de datos local (`data/world-db.json`) como en Supabase (`diibkzipwilsboapvhud`).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://diibkzipwilsboapvhud.supabase.co').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_DM67zoUwTg8KoW4RWf9JVA_CE6FmV_H';

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'world-db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Inicializar almacenamiento persistente local como respaldo inmediato
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let localDb = {
  players: {}, // username -> player record
  blocks: {}   // "room_id|block_key" -> block record
};

function loadLocalDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        localDb.players = parsed.players || {};
        localDb.blocks = parsed.blocks || {};
      }
    }
  } catch (err) {
    console.error('[DB Local] Error cargando world-db.json:', err.message);
  }
}

function saveLocalDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB Local] Error guardando world-db.json:', err.message);
  }
}

loadLocalDb();

function buildSupabaseHeaders(extra = {}) {
  const headers = {
    apikey: SUPABASE_KEY,
    ...extra
  };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

async function forwardToSupabase(tablePath, payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, reason: 'missing_credentials' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
      method: 'POST',
      headers: buildSupabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      }),
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization'
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --- API ENDPOINTS ---
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'VoxelCraft 1.24.X Service',
      supabaseUrl: SUPABASE_URL,
      playersCount: Object.keys(localDb.players).length,
      blocksCount: Object.keys(localDb.blocks).length,
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/schema' && req.method === 'GET') {
    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    const sql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';
    return sendJson(res, 200, { sql });
  }

  if (pathname === '/api/players') {
    if (req.method === 'GET') {
      const roomId = parsedUrl.searchParams.get('room_id');
      let list = Object.values(localDb.players);
      if (roomId) list = list.filter((p) => p.room_id === roomId);
      return sendJson(res, 200, list);
    }
    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const username = String(body.username || 'player_1').trim();
        const record = {
          username,
          display_name: String(body.display_name || username),
          room_id: String(body.room_id || 'SALA-ESMERALDA-1'),
          dimension: String(body.dimension || 'overworld'),
          kills: Number(body.kills || 0),
          deaths: Number(body.deaths || 0),
          updated_at: new Date().toISOString()
        };
        localDb.players[username] = record;
        saveLocalDb();
        const cloud = await forwardToSupabase('voxel_players?on_conflict=username', record);
        return sendJson(res, 200, { ok: true, player: record, supabaseSync: cloud.ok });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'JSON inválido' });
      }
    }
  }

  if (pathname === '/api/blocks') {
    if (req.method === 'GET') {
      const roomId = parsedUrl.searchParams.get('room_id') || 'SALA-ESMERALDA-1';
      const list = Object.values(localDb.blocks).filter((b) => b.room_id === roomId);
      return sendJson(res, 200, list);
    }
    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const room_id = String(body.room_id || 'SALA-ESMERALDA-1');
        const block_key = String(body.block_key || '');
        if (!block_key) return sendJson(res, 400, { ok: false, error: 'block_key requerido' });

        const record = {
          room_id,
          block_key,
          block_id: Number(body.block_id ?? 0),
          updated_by: String(body.updated_by || 'player'),
          updated_at: new Date().toISOString()
        };
        localDb.blocks[`${room_id}|${block_key}`] = record;
        saveLocalDb();
        const cloud = await forwardToSupabase('voxel_world_blocks?on_conflict=room_id,block_key', record);
        return sendJson(res, 200, { ok: true, block: record, supabaseSync: cloud.ok });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'JSON inválido' });
      }
    }
  }

  // --- STATIC FILES ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);
  if (!fs.existsSync(filePath)) {
    // Fallback al archivo HTML raíz si existe
    const rootHtml = path.join(__dirname, 'voxelcraft_1_24_x_release_biomas_1_24_trial_chambers_pale_garden_maza_y_multijugador.html');
    if (safePath === '/index.html' && fs.existsSync(rootHtml)) {
      filePath = rootHtml;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 No encontrado');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('500 Error interno del servidor');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`===================================================================`);
  console.log(`🎮 VoxelCraft 1.24.X Service activo en: http://localhost:${PORT}`);
  console.log(`☁️  Supabase Cloud: ${SUPABASE_URL}`);
  console.log(`🗄️  Base de Datos Local: ${DB_FILE}`);
  console.log(`===================================================================`);
});
