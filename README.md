# VoxelCraft 1.24.X Release — Biomas 1.24, Trial Chambers, Pale Garden, Maza y Multijugador

Juego 3D estilo Minecraft construido con **Three.js (WebGL)**, generación procedural por chunks, 4 dimensiones (*Overworld*, *El Nether*, *The End*, *El Cielo / Aether*), sistema de crafteo 3×3, comercio con aldeanos, combate con la **Maza 1.24 (Mace)** y **Cargas de Viento (Wind Charge)**, y persistencia híbrida (**Supabase Cloud + Servicio Node.js + IndexedDB**).

## 🚀 Iniciar el Servicio Localmente

```bash
npm start
```

El servidor quedará disponible en `http://localhost:3000`.

### Endpoints del Servicio (`server.js`)
- `GET /` — Cliente 3D de VoxelCraft 1.24.X (`public/index.html`)
- `GET /api/health` — Estado del servicio, conteo de jugadores y bloques sincronizados
- `GET /api/players` / `POST /api/players` — Registro y sincronización de perfiles y estadísticas PvP
- `GET /api/blocks` / `POST /api/blocks` — Persistencia de bloques modificados por sala y semilla
- `GET /api/schema` — Esquema SQL listo para ejecutar en Supabase

## 🗄️ Configuración de la Base de Datos en Supabase

El proyecto está preconfigurado con las credenciales de Supabase:
- **Project URL:** `https://diibkzipwilsboapvhud.supabase.co`
- **Publishable Key:** `sb_publishable_DM67zoUwTg8KoW4RWf9JVA_CE6FmV_H`

Para crear las tablas (`public.voxel_players` y `public.voxel_world_blocks`) y políticas RLS en Supabase:
1. Abre el [SQL Editor de tu proyecto en Supabase](https://supabase.com/dashboard/project/diibkzipwilsboapvhud/sql/new).
2. Pega y ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
