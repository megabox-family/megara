create type role_type as enum('color', 'other');

create table roles (
  id text not null primary key,
  name text not null,
  role_type role_type default 'other'
);