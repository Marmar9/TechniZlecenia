create table posts (
    id uuid primary key not null,
    title text not null,
    owner_id uuid not null references users(id) on delete cascade,
    description text not null,
);