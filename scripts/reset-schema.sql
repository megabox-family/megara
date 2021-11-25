drop table if exists channels;
-- drop table if exists roles;
-- drop table if exists coordinates;

drop type if exists channel_type;
-- drop type if exists role_type;

create type channel_type as enum('category', 'joinable', 'private', 'public', 'voice');
-- create type role_type as enum('admin', 'color', 'other');

create table channels (
  id text not null primary key,
  category_id text, 
  name text not null,
  channel_type channel_type,
  active_voice_channel_id text
);

-- create table roles (
--   id text not null primary key,
--   name text not null,
--   role_type role_type default 'other'
-- );

-- create table coordinates (
--   id uuid not null primary key,
--   name text not null,
--   owner text not null,
--   x integer not null,
--   y integer not null,
--   z integer not null
-- );