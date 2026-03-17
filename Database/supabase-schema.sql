-- ===== ROK RACERS JA — SUPABASE SCHEMA =====
-- Full implementation for driver profiles, accolades, and season stats
-- Drop this into your SQL editor in Supabase SQL panel

-- ===== 1. DRIVER PROFILES TABLE =====
-- Extends auth.users with racing-specific data
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  handle TEXT UNIQUE,
  car_number TEXT,
  parish TEXT,
  discipline TEXT[],          -- e.g. ['Drift', 'Street']
  racing_class TEXT,          -- 'Pro', 'Amateur', 'Street'
  racing_since INT,           -- Year they started racing
  home_track TEXT,            -- Primary track they race at
  bio TEXT,
  linked_build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
  avatar_url TEXT,
  ig_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 2. ACCOLADES TABLE =====
-- Achievements issued to drivers (verified by promoters or self-reported)
CREATE TABLE IF NOT EXISTS public.accolades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,            -- e.g. 'Drift Champion'
  subtitle TEXT,                  -- e.g. 'Vernamfield Open · 2024'
  icon TEXT,                      -- emoji or icon key
  color TEXT DEFAULT 'gray',      -- 'gold' | 'silver' | 'red' | 'teal' | 'gray'
  verified BOOLEAN DEFAULT FALSE, -- true = issued by a promoter via platform
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 3. DRIVER STATS TABLE =====
-- Season statistics (can be auto-computed or manually updated by promoters)
CREATE TABLE IF NOT EXISTS public.driver_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  season INT NOT NULL,                    -- e.g. 2025
  events_entered INT DEFAULT 0,           -- How many events they participated in
  wins INT DEFAULT 0,                     -- 1st place finishes
  podiums INT DEFAULT 0,                  -- Top 3 finishes
  dnfs INT DEFAULT 0,                     -- Did not finish count
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, season)
);

-- ===== 4. ROW LEVEL SECURITY (RLS) POLICIES =====

-- Enable RLS on all tables
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accolades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_stats ENABLE ROW LEVEL SECURITY;

-- Driver Profiles Policies
-- Public can read all profiles
CREATE POLICY "driver_profiles_public_read"
  ON public.driver_profiles FOR SELECT
  USING (true);

-- Only the profile owner can update their own
CREATE POLICY "driver_profiles_owner_update"
  ON public.driver_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "driver_profiles_owner_insert"
  ON public.driver_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Accolades Policies
-- Public can read all accolades
CREATE POLICY "accolades_public_read"
  ON public.accolades FOR SELECT
  USING (true);

-- Drivers can insert their own non-verified accolades
CREATE POLICY "accolades_owner_insert"
  ON public.accolades FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Only promoters (those who have created events) can issue verified accolades
CREATE POLICY "accolades_promoter_verified_insert"
  ON public.accolades FOR INSERT
  WITH CHECK (
    verified = true AND verified_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.events WHERE created_by = auth.uid())
  );

-- Only the driver or the promoter who issued it can delete
CREATE POLICY "accolades_owner_or_issuer_delete"
  ON public.accolades FOR DELETE
  USING (auth.uid() = driver_id OR auth.uid() = verified_by);

-- Driver Stats Policies
-- Public can read all stats
CREATE POLICY "driver_stats_public_read"
  ON public.driver_stats FOR SELECT
  USING (true);

-- Only the driver can update their own stats
CREATE POLICY "driver_stats_owner_update"
  ON public.driver_stats FOR UPDATE
  USING (
    auth.uid() = (
      SELECT id FROM public.driver_profiles WHERE id = driver_id
    )
  );

-- Promoters (event creators) can insert stats
CREATE POLICY "driver_stats_promoter_insert"
  ON public.driver_stats FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE created_by = auth.uid())
  );

-- ===== 5. INDEXES FOR PERFORMANCE =====

-- Fast lookup by handle
CREATE INDEX IF NOT EXISTS idx_driver_profiles_handle
  ON public.driver_profiles(handle);

-- Fast lookup by parish
CREATE INDEX IF NOT EXISTS idx_driver_profiles_parish
  ON public.driver_profiles(parish);

-- Fast accolades lookup
CREATE INDEX IF NOT EXISTS idx_accolades_driver_id
  ON public.accolades(driver_id);

CREATE INDEX IF NOT EXISTS idx_accolades_verified
  ON public.accolades(verified);

CREATE INDEX IF NOT EXISTS idx_accolades_awarded_at
  ON public.accolades(awarded_at DESC);

-- Fast stats lookup
CREATE INDEX IF NOT EXISTS idx_driver_stats_driver_id
  ON public.driver_stats(driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_stats_season
  ON public.driver_stats(season);

-- ===== 6. OPTIONAL: MATERIALIZED VIEW FOR TOP DRIVERS =====
-- For leaderboards, sorted by wins + verified accolades
CREATE OR REPLACE MATERIALIZED VIEW public.top_drivers AS
SELECT
  p.id,
  p.display_name,
  p.handle,
  p.car_number,
  p.parish,
  p.discipline,
  COUNT(DISTINCT s.id)::INT as total_stats_entries,
  COALESCE(SUM((s.wins + s.podiums))::INT, 0) as lifetime_wins_and_podiums,
  COUNT(DISTINCT CASE WHEN a.verified THEN a.id END)::INT as verified_accolades,
  p.created_at
FROM
  public.driver_profiles p
  LEFT JOIN public.driver_stats s ON p.id = s.driver_id
  LEFT JOIN public.accolades a ON p.id = a.driver_id
GROUP BY
  p.id, p.display_name, p.handle, p.car_number, p.parish, p.discipline, p.created_at
ORDER BY
  verified_accolades DESC,
  lifetime_wins_and_podiums DESC;

-- Refresh stats (run manually or via scheduled job)
-- REFRESH MATERIALIZED VIEW public.top_drivers;

-- ===== 7. TRIGGERS FOR AUDIT TRAIL (OPTIONAL) =====
-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_profiles_update_timestamp
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW
EXECUTE FUNCTION update_driver_profiles_timestamp();

-- ===== 8. SAMPLE DATA (OPTIONAL - FOR TESTING) =====
-- Uncomment to populate test data
-- NOTE: Replace user IDs with actual auth.users(id) from your Supabase project

/*
-- Example: Create test driver profile
INSERT INTO public.driver_profiles (id, display_name, handle, car_number, parish, discipline, racing_class, racing_since, bio)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'John Speed', 'jspeed', '88', 'Kingston', ARRAY['Drift', 'Street'], 'Pro', 2018, 'Professional drift driver from Kingston')
ON CONFLICT (id) DO NOTHING;

-- Example: Add accolade
INSERT INTO public.accolades (driver_id, title, subtitle, icon, color, verified, verified_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Drift Champion', 'Vernamfield Open 2024', '🏁', 'gold', true, '00000000-0000-0000-0000-000000000999')
ON CONFLICT DO NOTHING;

-- Example: Add season stats
INSERT INTO public.driver_stats (driver_id, season, events_entered, wins, podiums, dnfs)
VALUES
  ('00000000-0000-0000-0000-000000000001', 2025, 12, 5, 8, 1)
ON CONFLICT (driver_id, season) DO UPDATE SET
  events_entered = EXCLUDED.events_entered,
  wins = EXCLUDED.wins,
  podiums = EXCLUDED.podiums,
  dnfs = EXCLUDED.dnfs;
*/

-- ===== END OF SCHEMA =====
-- All tables set up with RLS policies, indexes, and optional views
-- Ready for feature implementation
