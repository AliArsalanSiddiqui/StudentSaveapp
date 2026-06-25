-- Run this in Supabase SQL Editor (or as a migration)

-- 1. Store each user's Expo push token (one device per user, simplest approach)
alter table public.users
  add column if not exists push_token text;

-- 2. Helpful index since we'll query notifications by user often (bell screen, unread count)
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, read);

-- That's it for SQL. The "send push on insert" behavior is wired via a
-- Database Webhook (Dashboard > Database > Webhooks) pointing at the
-- `send-push` edge function, configured to fire on INSERT into `notifications`.
-- No DB trigger/extension needed — the webhook UI handles it for us.
