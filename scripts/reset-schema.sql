--guilds
drop table if exists guilds;

drop type if exists command_symbol;

create type command_symbol as enum ('!', '$', '%', '^', '&', '(', ')', '-', '+', '=', '{', '}', '[', ']', '?', ',', '.');

create table guilds (
  id text not null primary key,
  guild_name text not null,
  command_symbol command_symbol default '!',
  channel_sorting boolean not null default false,
  role_sorting boolean not null default false,
  rules text,
  name_guidelines text,
  admin_channel text,
  log_channel text,
  announcement_channel text,
  verification_channel text
);


--channels
drop table if exists channels;

drop type if exists channel_type;
drop type if exists command_level;

create type channel_type as enum('category', 'joinable', 'private', 'public', 'voice');
create type command_level as enum('admin', 'unrestricted', 'restricted', 'prohibited');

create table channels (
  id text not null primary key,
  name text not null,
  guild_id text not null,
  category_id text, 
  channel_type channel_type,
  command_level command_level,
  position_override integer,
  position integer,
  active_voice_channel_id text
);


--roles
-- drop table if exists roles;
-- drop type if exists role_type;

-- create type role_type as enum('admin', 'color', 'other');

-- create table roles (
--   id text not null primary key,
--   name text not null,
--   role_type role_type default 'other'
-- );


--coordinates
-- drop table if exists coordinates;

-- create table coordinates (
--   id uuid not null primary key,
--   name text not null,
--   owner text not null,
--   x integer not null,
--   y integer not null,
--   z integer not null
-- );