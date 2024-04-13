-- attendees
drop table if exists attendees;

create table attendees (
  id uuid primary key,
  user_id text not null,
  event_id text not null,
  guest_count int not null
);

-- channels
drop table if exists channels;

create table channels (
  id text primary key,
  name text not null,
  guild_id text not null,
  alpha_type text not null,
  position_override int,
  custom_function text,
  dynamic boolean,
  dynamic_number int,
  temporary boolean,
  always_active boolean,
  parent_text_channel_id text,
  parent_thread_id text,
  parent_voice_channel_id text,
  create_channel_message_id text,
  create_message_id text
);

-- coordinates
drop table if exists coordinates;

create table coordinates (
  id uuid primary key,
  name text not null,
  world_id uuid not null,
  created_by text not null,
  x integer not null,
  y integer not null,
  z integer not null,
  dimension text not null
);

-- events
drop table if exists events;

create table events (
  id text primary key,
  event_title text not null,
  thread_name text not null,
  event_type text not null,
  start_unix bigint not null,
  end_unix bigint not null,
  location text not null,
  allow_guests boolean not null,
  request_venmo boolean not null,
  event_title_override text,
  activities text,
  image_url text,
  imdb_url text,
  account_for_trailers boolean not null,
  channel_id text not null,
  parent_channel_id text not null,
  channel_is_post boolean not null,
  created_by text not null,
  concluded boolean not null
);

-- guilds
drop table if exists guilds;

create table guilds (
  id text primary key,
  guild_name text not null,
  channel_sorting boolean not null default false,
  role_sorting boolean not null default false,
  admin_channel text,
  announcement_channel text,
  welcome_channel text,
  active_world text,
  vip_role_id text,
  pause_channel_notifications boolean not null default false,
  vip_assign_message text,
  vip_remove_message text,
  admin_role_id text,
  channel_notifications_role_id text,
  active_voice_category_id text,
  inactive_voice_category_id text
);

-- lists
drop table if exists lists;

create table lists (
  id text primary key,
  title text not null,
  description text,
  page_data text not null,
  records_per_page integer not null,
  group_by text not null,
  filters text
);

-- pinned messages
drop table if exists pinned_messages;

create table pinned_messages (
  id text primary key,
  pinned_by text not null
);

-- poll-data
drop table if exists poll_data;

create table poll_data (
  id uuid primary key,
  voter_id text not null,
  poll_id text not null,
  choices text not null
);

-- polls
drop table if exists polls;

create table polls (
  id text primary key,
  channel_id text not null,
  started_by text not null,
  start_time bigint not null,
  end_time bigint not null,
  question text not null,
  candidates text not null,
  total_choices integer not null,
  required_choices integer not null,
  ranked_choice_voting boolean not null
);

-- users
drop table if exists users;

create table users (
  id uuid primary key,
  discord_id text not null,
  discord_username text,
  last_seen_at timestamp without time zone
);

-- venmo
drop table if exists venmo;

create table venmo (
  id text primary key,
  tag text not null
);

-- vip user overrides
drop table if exists vip_user_overrides;

create table vip_user_overrides (
  id uuid primary key,
  user_id text not null,
  guild_id text not null
);

-- worlds
drop table if exists worlds;

create table worlds (
  id uuid primary key,
  name text not null,
  guild_id text not null
);