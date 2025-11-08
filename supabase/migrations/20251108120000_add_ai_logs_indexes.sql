-- Migration: Add performance indexes for ai_logs table
-- Date: 2025-11-08
-- Description: Creates indexes to optimize GET /api/v1/internal/ai/logs queries

-- Index dla filtrowania po event + sortowanie po created_at DESC
-- Używany przez query: WHERE event = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_logs_event_created
  ON public.ai_logs (event, created_at DESC);

-- Index dla filtrowania po level + sortowanie po created_at DESC
-- Używany przez query: WHERE level = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_logs_level_created
  ON public.ai_logs (level, created_at DESC);

-- Częściowy index dla filtrowania po user_id (tylko dla nie-null values)
-- Używany przez query: WHERE user_id = ?
-- Partial index oszczędza miejsce - pomija null values
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON public.ai_logs (user_id)
  WHERE user_id IS NOT NULL;

-- Komentarze dla dokumentacji
COMMENT ON INDEX idx_ai_logs_event_created IS 'Optimizes GET /api/v1/internal/ai/logs filtered by event';
COMMENT ON INDEX idx_ai_logs_level_created IS 'Optimizes GET /api/v1/internal/ai/logs filtered by level';
COMMENT ON INDEX idx_ai_logs_user_id IS 'Optimizes GET /api/v1/internal/ai/logs filtered by user_id (partial index, null values excluded)';
