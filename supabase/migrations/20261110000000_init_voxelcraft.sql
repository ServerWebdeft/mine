-- Migration: Initialize VoxelCraft 1.24.X tables and RLS policies
CREATE TABLE IF NOT EXISTS public.voxel_players (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  room_id TEXT DEFAULT 'SALA-ESMERALDA-1',
  dimension TEXT DEFAULT 'overworld',
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.voxel_world_blocks (
  room_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  block_id INT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_voxel_players_room ON public.voxel_players (room_id);
CREATE INDEX IF NOT EXISTS idx_voxel_world_blocks_room ON public.voxel_world_blocks (room_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.voxel_players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.voxel_world_blocks TO anon, authenticated;

ALTER TABLE public.voxel_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voxel_world_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso publico jugadores" ON public.voxel_players;
CREATE POLICY "Acceso publico jugadores" ON public.voxel_players
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso publico bloques" ON public.voxel_world_blocks;
CREATE POLICY "Acceso publico bloques" ON public.voxel_world_blocks
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
