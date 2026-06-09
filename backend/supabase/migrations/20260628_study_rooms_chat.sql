-- Peak Academy — Study Rooms: Chat, Voice & Roles
-- Adds: role on members, messages table, voice sessions, raise hand queue

-- ═══════════════════════════════════════════════════════════════
-- 1. Add role column to study_room_members
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.study_room_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student'
  CHECK (role IN ('owner', 'ta', 'student', 'moderator'));

-- ═══════════════════════════════════════════════════════════════
-- 2. Messages (General + Q&A channels)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text        NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  channel     text        NOT NULL DEFAULT 'general'
              CHECK (channel IN ('general', 'qa')),

  type        text        NOT NULL DEFAULT 'text'
              CHECK (type IN ('text', 'image', 'voice_note', 'question', 'official_reply')),

  content     text,
  voice_url   text,
  image_url   text,

  -- Q&A threading
  reply_to    uuid        REFERENCES public.study_room_messages(id) ON DELETE SET NULL,
  is_resolved boolean     NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT message_has_content CHECK (
    content IS NOT NULL OR voice_url IS NOT NULL OR image_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_channel
  ON public.study_room_messages(room_id, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_messages_reply_to
  ON public.study_room_messages(reply_to) WHERE reply_to IS NOT NULL;

ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

-- Active room members can read messages
DO $$ BEGIN
  CREATE POLICY "room members can read messages"
    ON public.study_room_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.study_room_members
        WHERE room_id = study_room_messages.room_id
          AND user_id = auth.uid()
          AND left_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Active members can send messages (backend validates type restrictions)
DO $$ BEGIN
  CREATE POLICY "members can send messages"
    ON public.study_room_messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.study_room_members
        WHERE room_id = study_room_messages.room_id
          AND user_id = auth.uid()
          AND left_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Voice sessions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.study_room_voice_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          text        NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  started_by       uuid        NOT NULL REFERENCES public.users(id),
  livekit_room_id  text        NOT NULL UNIQUE,
  status           text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'ended')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_room
  ON public.study_room_voice_sessions(room_id) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════
-- 4. Raise hand queue
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.raise_hand_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES public.study_room_voice_sessions(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting', 'granted', 'dismissed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 5. Enable Realtime
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.raise_hand_queue;
EXCEPTION WHEN others THEN NULL; END $$;
