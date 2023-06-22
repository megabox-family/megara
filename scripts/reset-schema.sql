--guilds
drop table if exists guilds;

create table guilds (
  id text not null primary key,
  guild_name text not null,
  channel_sorting boolean not null default false,
  role_sorting boolean not null default false,
  rules text,
  name_guidelines text,
  admin_channel text,
  announcement_channel text,
  verification_channel text,
  welcome_channel text,
  active_world text,
  pause_channel_notifications boolean not null,
  vip_assign_message text,
  vip_remove_message text,
  server_subscription_button_text text,
  active_voice_category_id text,
  inactive_voice_category_id text
  vip_role_id text,
  verified_role_id text,
  undergoing_verification_role_id text,
  admin_role_id text
);


--channels
drop table if exists channels;

create table channels (
  id text not null primary key,
  name text not null,
  guild_id text not null,
  category_id text, 
  channel_type text not null,
  position_override integer,
  position integer,
  active_voice_channel_id text
);

-- vip-user-overrides
drop table if exists vip_user_overrides;

create table vip_user_overrides (
  id uuid not null primary key,
  user_id text not null,
  guild_id text not null
);

-- worlds
drop table if exists worlds;

create table worlds (
  id uuid not null primary key,
  name text not null,
  guild_id text not null
);

-- coordinates
drop table if exists coordinates;

create table coordinates (
  id uuid not null primary key,
  name text not null,
  world_id uuid not null,
  created_by text not null,
  x integer not null,
  y integer not null,
  z integer not null,
  dimension text not null
);

-- lists
drop table if exists lists;

create table lists (
  id text not null primary key,
  title text not null,
  description text,
  page_data text not null,
  records_per_page integer not null,
  group_by text not null,
  filters text
);

-- pins
drop table if exists pinned_messages;

create table pinned_messages (
  id text not null primary key,
  pinned_by text not null
);

-- users
drop table if exists users;

create table users (
  id uuid not null primary key,
  discord_id text not null,
  discord_username text,
  last_seen_at timestamp without time zone
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

-- polls
drop table if exists polls;

create table polls (
  id text not null primary key,
  channel_id text not null,
  started_by text not null,
  start_time bigint not null,
  end_time bigint not null,
  candidates text not null,
  total_choices integer not null,
  required_choices integer not null,
  ranked_choice_voting boolean not null
);

drop table if exists poll_data;

create table poll_data (
  id uuid not null primary key,
  voter_id text not null,
  poll_id text not null,
  choices text not null
);

drop table if exists movie_invites;

create table movie_invites (
  id text not null primary key,
  last_updated bigint not null
);

drop table if exists voice;

create table voice (

);