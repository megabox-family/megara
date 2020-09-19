alter table channels
add column is_pending_announcement boolean not null default 'false';