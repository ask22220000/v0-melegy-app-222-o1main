-- Add media_urls column to chat_messages to store images and videos per message
-- This replaces the old [image:url] prefix-in-content approach
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS media_urls jsonb DEFAULT NULL;

-- Index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_chat_messages_media_urls
  ON chat_messages USING gin (media_urls)
  WHERE media_urls IS NOT NULL;
