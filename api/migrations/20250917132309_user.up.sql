create table users (
    id uuid primary key not null default gen_random_uuid(),
    username text not null,
    email text not null,
    password_hash bytea not null,
    salt bytea not null,
    token_ver uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    avatar bytea
);