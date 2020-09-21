create table coordinates (
  id uuid not null primary key,
  name text not null,
  owner text not null,
  x integer not null,
  y integer not null,
  z integer not null
);