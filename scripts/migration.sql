-- ============================================================
-- Clarzo Migration — run in Supabase SQL Editor
-- ============================================================

-- 1. Profiles: onboarding flag + risk profile JSON
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_profile jsonb;

-- 2. Holdings: flexible metadata for FD / Gold / Real Estate / Debt
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 3. Family invites
CREATE TABLE IF NOT EXISTS family_invites (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id  uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_email text      NOT NULL,
  token       text        UNIQUE NOT NULL,
  relationship text       NOT NULL DEFAULT 'family',
  status      text        NOT NULL DEFAULT 'pending',   -- pending | accepted | declined
  created_at  timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inviter_can_manage" ON family_invites;
CREATE POLICY "inviter_can_manage" ON family_invites
  FOR ALL USING (auth.uid() = inviter_id);

-- 4. Family members (bi-directional link once invite accepted)
CREATE TABLE IF NOT EXISTS family_members (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship text        NOT NULL DEFAULT 'family',
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(owner_id, member_id)
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_visible_to_both" ON family_members;
CREATE POLICY "members_visible_to_both" ON family_members
  FOR ALL USING (auth.uid() = owner_id OR auth.uid() = member_id);

-- 5. In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text        NOT NULL,  -- overlap | imbalance | debt_high | goal_behind | welcome
  title      text        NOT NULL,
  body       text,
  read       boolean     DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_owns_notifications" ON notifications;
CREATE POLICY "user_owns_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);
