-- Esquema de la base de datos en Supabase para "Mis Pendientes"
-- (Ya está aplicado en tu proyecto. Se incluye por si necesitas recrearlo.)

create table if not exists public.notas_pendientes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'tarea',        -- tarea | responder | enviar | nota
  fecha date,                                 -- fecha límite (opcional)
  prioridad text not null default 'media',    -- alta | media | baja
  nota text,                                  -- detalle opcional
  hecha boolean not null default false,       -- completada
  hecha_en date,                              -- fecha en que se completó (historial)
  eliminada boolean not null default false,   -- en la papelera (borrado seguro)
  eliminada_en timestamptz,                   -- fecha/hora en que se envió a la papelera
  creado timestamptz not null default now()
);

alter table public.notas_pendientes enable row level security;

-- Acceso por link (sin login). Cuando agregues inicio de sesión,
-- reemplaza esta política por una basada en auth.uid().
drop policy if exists "acceso_publico_notas_pendientes" on public.notas_pendientes;
create policy "acceso_publico_notas_pendientes"
  on public.notas_pendientes
  for all
  to anon, authenticated
  using (true)
  with check (true);
