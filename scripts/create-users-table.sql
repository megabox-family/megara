create table users (
  id uuid not null primary key,
  discord_id text not null,
  discord_username text,
  last_seen_at timestamp without time zone
);