-- Templates table for pre-built agents and clusters users can fork
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('agent', 'cluster')),
  name text not null,
  description text,
  category text not null default 'general',
  tags text[] default '{}',
  thumbnail_url text,
  source_agent_id uuid references public.agents(id) on delete set null,
  source_cluster_id uuid references public.clusters(id) on delete set null,
  configuration jsonb default '{}',
  cluster_config jsonb default '{}',
  author_id text,
  is_featured boolean default false,
  use_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.template_files (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.templates enable row level security;
alter table public.template_files enable row level security;

create policy "Templates are publicly readable"
  on public.templates for select using (true);

create policy "Template files are publicly readable"
  on public.template_files for select using (true);

create policy "Templates are manageable by their author"
  on public.templates for all using (author_id = auth.jwt()->>'sub');

create policy "Template files are manageable by template author"
  on public.template_files for all using (
    template_id in (select id from public.templates where author_id = auth.jwt()->>'sub')
  );

create index if not exists idx_templates_type on public.templates(type);
create index if not exists idx_templates_category on public.templates(category);
create index if not exists idx_templates_featured on public.templates(is_featured) where is_featured = true;
create index if not exists idx_template_files_template on public.template_files(template_id);
