CREATE TABLE public.help_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  user_email text,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  needs_human boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_chat_messages_user_idx ON public.help_chat_messages(user_id, created_at);
CREATE INDEX help_chat_messages_created_idx ON public.help_chat_messages(created_at);
GRANT SELECT ON public.help_chat_messages TO authenticated;
GRANT ALL ON public.help_chat_messages TO service_role;
ALTER TABLE public.help_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own help chat" ON public.help_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all help chats" ON public.help_chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.help_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  user_email text,
  question text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, UPDATE ON public.help_tickets TO authenticated;
GRANT ALL ON public.help_tickets TO service_role;
ALTER TABLE public.help_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tickets" ON public.help_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read tickets" ON public.help_tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update tickets" ON public.help_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));