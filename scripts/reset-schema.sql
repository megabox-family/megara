drop table if exists channels;
drop table if exists roles;

drop type if exists channel_type;
drop type if exists command_level;
drop type if exists role_type;

create type channel_type as enum('category', 'public', 'joinable', 'private');
create type command_level as enum('admin', 'basic', 'restricted');
create type role_type as enum('color', 'other');

create table channels (
  id text not null primary key,
  category_id text, 
  name text not null,
  channel_type channel_type,
  is_pending_deletion boolean not null default 'false',
  command_level command_level not null default 'restricted'
);

create table roles (
  id text not null primary key,
  name text not null,
  role_type role_type default 'other'
);