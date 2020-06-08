drop table if exists channels;

create table channels (
  id text not null primary key,
  name text not null,
  is_joinable boolean not null default 'false'
);