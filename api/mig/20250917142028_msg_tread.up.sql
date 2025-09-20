create table msg_threads (
    id uuid primary key not null,
    user_hash bytea not null,
    -- takes the id of user_a and user_b hashes them together and this is used as the identifier of the thread
    user_a uuid not null references users(id) on delete cascade,
    user_b uuid not null references users(id) on delete cascade,
    constraint user_pair_unique unique(user_a, user_b),
    constraint user_pair_order check (user_a < user_b)
);