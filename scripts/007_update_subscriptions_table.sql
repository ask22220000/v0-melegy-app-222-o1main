-- Update subscriptions table to add kashier payment tracking
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS kashier_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS user_ip TEXT,
ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_kashier_payment_id ON subscriptions(kashier_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_ip ON subscriptions(user_ip);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Update status field to have proper defaults
ALTER TABLE subscriptions 
ALTER COLUMN status SET DEFAULT 'pending';

COMMENT ON COLUMN subscriptions.kashier_payment_id IS 'Payment ID from Kashier payment gateway';
COMMENT ON COLUMN subscriptions.payment_status IS 'Status: pending, completed, failed';
COMMENT ON COLUMN subscriptions.user_ip IS 'User IP address for tracking';
COMMENT ON COLUMN subscriptions.payment_link IS 'Kashier payment page link used';
