// Supabase Leaderboard — REST API wrapper
// SQL zum Erstellen der Tabelle (einmalig im Supabase SQL-Editor ausführen):
//
//   CREATE TABLE IF NOT EXISTS leaderboard (
//     id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
//     name       text        NOT NULL,
//     score      integer     NOT NULL,
//     skin       integer     DEFAULT 0,
//     created_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "anon_read"   ON leaderboard FOR SELECT USING (true);
//   CREATE POLICY "anon_insert" ON leaderboard FOR INSERT WITH CHECK (true);

const Leaderboard = (() => {
  const BASE = 'https://supabase.schneider-stack.de/rest/v1';
  const KEY  = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NDYzOTM4MCwiZXhwIjo0OTMwMzEyOTgwLCJyb2xlIjoiYW5vbiJ9.bA0tvfq4k7YvKmxtmb3jeAuCx0O5yry3BL7xYdsBQgM';
  const HDR  = {
    'apikey':        KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type':  'application/json',
  };

  async function submit(name, score, skin) {
    try {
      const r = await fetch(BASE + '/leaderboard', {
        method:  'POST',
        headers: { ...HDR, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({
          name:  String(name).trim().slice(0, 20) || 'Anonym',
          score: Math.round(score),
          skin:  skin || 0,
        }),
      });
      return r.ok;
    } catch { return false; }
  }

  async function fetchTop10() {
    try {
      const r = await fetch(
        BASE + '/leaderboard?select=name,score,skin&order=score.desc&limit=10',
        { headers: HDR }
      );
      return r.ok ? await r.json() : [];
    } catch { return []; }
  }

  return { submit, fetchTop10 };
})();
