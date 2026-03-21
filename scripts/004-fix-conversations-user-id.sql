-- Add mlg_user_id column to melegy_conversations if it doesn't exist
alter table melegy_conversations
add column if not exists mlg_user_id text not null default 'anonymous';

-- Add index for faster queries by user
create index if not exists idx_conversations_user_id
on melegy_conversations(mlg_user_id);

-- Add foreign key constraint if users table exists
-- alter table melegy_conversations
-- add constraint fk_mlg_user_id
-- foreign key (mlg_user_id) references melegy_users(mlg_user_id);
