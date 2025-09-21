create table posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    owner_id uuid not null references users(id) on delete cascade,
    description text not null,
    created timestamptz not null default now()
);