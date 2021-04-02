alter table channels
drop column emoji_type;

drop type if exists emoji_type;

alter table channels
add column has_priority boolean default 'false';