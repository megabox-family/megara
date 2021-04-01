create type emoji_type as enum('vanilla', 'custom');

alter table channels
add column emoji text;

alter table channels
add column message_id text;

alter table channels
add column emoji_type emoji_type;