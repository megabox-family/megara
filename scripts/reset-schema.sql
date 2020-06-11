drop table if exists channels;

drop type if exists channel_type;

create type channel_type as enum('category', 'public', 'joinable', 'private');

create table channels (
  id text not null primary key,
  category_id text, 
  name text not null,
  channel_type channel_type,
  is_pending_deletion boolean not null default 'false'
);