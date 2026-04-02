-- ============================================
-- LA CASA DEL CELULAR - Sistema de Seguridad
-- Supabase Database Setup
-- 
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Pega TODO este código y dale "Run"
-- ============================================

-- =============================================
-- 1. CREAR TABLA DE DISPOSITIVOS BLOQUEADOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.device_bans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- Huella digital única del dispositivo
    fingerprint TEXT NOT NULL,
    
    -- Información del navegador/dispositivo
    user_agent TEXT,
    platform TEXT,
    language TEXT,
    languages TEXT,
    screen_resolution TEXT,
    color_depth TEXT,
    pixel_ratio TEXT,
    hardware_concurrency TEXT,
    device_memory TEXT,
    vendor TEXT,
    max_touch_points TEXT,
    timezone TEXT,
    timezone_offset TEXT,
    
    -- Huellas digitales avanzadas
    canvas_hash TEXT,
    webgl_renderer TEXT,
    webgl_vendor TEXT,
    audio_hash TEXT,
    
    -- Información de red
    ip_address TEXT,
    country TEXT,
    city TEXT,
    isp TEXT,
    
    -- Sistema de advertencias
    -- trigger_reason: por qué se activó ('screenshot', 'bot', 'devtools')
    trigger_reason TEXT,
    
    -- warning_level: nivel de advertencia
    --   1 = primera advertencia (24 horas de bloqueo)
    --   2 = segunda advertencia (72 horas de bloqueo)
    --   3 = tercera advertencia (7 días de bloqueo)
    --   4 = BAN PERMANENTE (no se puede desbloquear)
    warning_level INTEGER DEFAULT 1,
    
    -- status: estado actual
    --   'blocked' = dispositivo bloqueado
    --   'allowed' = admin permitió el acceso (por error accidental)
    --   'permanent' = ban permanente, imposible de desbloquear
    status TEXT DEFAULT 'blocked',
    
    -- Notas del admin (para saber por qué desbloqueó)
    admin_notes TEXT,
    
    -- Tiempos
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    
    -- Constraint: un solo registro por fingerprint
    CONSTRAINT device_bans_fingerprint_key UNIQUE(fingerprint)
);

-- =============================================
-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_device_bans_fingerprint 
    ON public.device_bans(fingerprint);

CREATE INDEX IF NOT EXISTS idx_device_bans_status 
    ON public.device_bans(status);

CREATE INDEX IF NOT EXISTS idx_device_bans_ip 
    ON public.device_bans(ip_address);

CREATE INDEX IF NOT EXISTS idx_device_bans_warning 
    ON public.device_bans(warning_level);

-- =============================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.device_bans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. POLÍTICAS RLS
-- Permitir al sistema (cliente anónimo) operar
-- =============================================

-- Permitir INSERT (cuando el sistema detecta y guarda)
CREATE POLICY "permitir_insert_anonimo" ON public.device_bans
    FOR INSERT WITH CHECK (true);

-- Permitir SELECT (para verificar estado del dispositivo)
CREATE POLICY "permitir_select_anonimo" ON public.device_bans
    FOR SELECT USING (true);

-- Permitir UPDATE (para actualizar nivel y estado)
CREATE POLICY "permitir_update_anonimo" ON public.device_bans
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================
-- 5. TRIGGER: actualizar last_seen automáticamente
-- =============================================

CREATE OR REPLACE FUNCTION public.actualizar_ultima_vista()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_ultima_vista ON public.device_bans;
CREATE TRIGGER trigger_actualizar_ultima_vista
    BEFORE UPDATE ON public.device_bans
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_ultima_vista();

-- =============================================
-- NOTAS PARA EL ADMINISTRADOR
-- =============================================
--
-- PARA VER DISPOSITIVOS BLOQUEADOS:
--   SELECT fingerprint, trigger_reason, warning_level, status, 
--          ip_address, country, city, first_seen, blocked_until
--   FROM device_bans 
--   WHERE status = 'blocked' 
--   ORDER BY last_seen DESC;
--
-- PARA VER TODOS LOS REGISTROS:
--   SELECT * FROM device_bans ORDER BY last_seen DESC;
--
-- PARA DESBLOQUEAR UN USUARIO (error accidental):
--   UPDATE device_bans 
--   SET status = 'allowed', 
--       admin_notes = 'Error accidental - el usuario presionó sin querer'
--   WHERE fingerprint = 'REEMPLAZA_CON_EL_FINGERPRINT';
--
-- PARA VER QUÉ PASÓ CON UN DISPOSITIVO:
--   SELECT fingerprint, trigger_reason, warning_level, status,
--          admin_notes, user_agent, platform, screen_resolution,
--          ip_address, country, city
--   FROM device_bans
--   WHERE fingerprint = 'REEMPLAZA_CON_EL_FINGERPRINT';
--
-- SISTEMA DE ADVERTENCIAS:
--   Nivel 1 → Bloqueo 24 horas
--   Nivel 2 → Bloqueo 72 horas
--   Nivel 3 → Bloqueo 7 días
--   Nivel 4 → BAN PERMANENTE (no se puede desbloquear)
--
-- IMPORTANTE: Cuando cambias status a 'allowed', el usuario 
-- vuelve a entrar y ve una advertencia. Si vuelve a tener
-- problemas, se incrementa al siguiente nivel automáticamente.
-- =============================================
