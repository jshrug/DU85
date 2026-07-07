# City A Ranked Vote, handoff brief

The visual voting mechanism is built. This brief is everything an agent needs to wire the backend and ship it. Nothing here changes the ballot's look.

## The method (do not change, it is decided and researched)
- Each member ranks their **top 3** of the 8 City A cities. Drag tiles or tap.
- Scoring, in the background: **1st choice = 3 pts, 2nd = 2, 3rd = 1.** Total across all ballots; the **two highest-point cities advance.**
- Tiebreak, pre-declared: most first-choice votes, then alphabetical.
- **Anonymous** to members (never show who ranked what, and do not show points while voting). The full points scoreboard is published only when voting closes (the receipts).
- **One-shot vote:** the admin (jshrug, keyed off member login) OPENS it July 10 in class, then CLOSES to reveal the top 2. No early voting.

## What is already built
- `src/components/features/RankVoteBallot.jsx` — the ballot UI (rank top 3, drag/tap, lock, confirm, submit). Self-contained, no backend.
- `src/lib/vote.js` — the data + 3/2/1 scoring layer. Use it for everything. Exports:
  - `fetchVoteStatus()` → `{ status, results }` (status: `closed` | `open` | `final`)
  - `subscribeVoteStatus(onChange)` → live status/results updates
  - `fetchMyBallot(voterId)` → the member's saved ranking (array of names) or null
  - `submitBallot(voterId, ranking)` → upserts their ballot
  - `fetchVotedCount()` → anonymous count of ballots in
  - `setVoteStatus("open"|"closed")` — admin open/close
  - `closeAndTally()` — admin: reads all ballots, applies 3/2/1, writes results + `status:"final"`
- `api/porter.js` — Porter already knows the ranked method and will explain it if asked.

## Step 1 (jshrug): run this once in the Supabase SQL editor
```sql
create table if not exists cohort_ballots (
  id uuid primary key default gen_random_uuid(),
  cohort_id text not null,
  round text not null default 'city_a',
  voter_id uuid not null default auth.uid(),
  ranking text[] not null,
  submitted_at timestamptz not null default now(),
  unique (cohort_id, round, voter_id)
);
alter table cohort_ballots enable row level security;
create policy ballot_write on cohort_ballots for insert with check (voter_id = auth.uid());
create policy ballot_update on cohort_ballots for update using (voter_id = auth.uid()) with check (voter_id = auth.uid());
create policy ballot_admin_read on cohort_ballots for select
  using (exists (select 1 from admins a where a.id = auth.uid()::text and a.enabled));

create or replace function ballot_count(p_cohort text, p_round text)
  returns integer language sql security definer stable as $$
    select count(*)::int from cohort_ballots where cohort_id = p_cohort and round = p_round;
  $$;
grant execute on function ballot_count(text, text) to anon, authenticated;

create table if not exists cohort_vote_status (
  cohort_id text not null,
  round text not null default 'city_a',
  status text not null default 'closed',
  results jsonb,
  updated_at timestamptz not null default now(),
  primary key (cohort_id, round)
);
alter table cohort_vote_status enable row level security;
create policy status_read on cohort_vote_status for select using (true);
create policy status_admin_write on cohort_vote_status for all
  using (exists (select 1 from admins a where a.id = auth.uid()::text and a.enabled))
  with check (exists (select 1 from admins a where a.id = auth.uid()::text and a.enabled));
```

## Step 2 (agent): mount the ballot in the vote screen
In the vote page, drive three states off `fetchVoteStatus()` + `subscribeVoteStatus()`:
- `closed` → a "Voting opens July 10" panel.
- `open` → `<RankVoteBallot cities={ANCHOR_COUNTRIES} initialRanking={myBallot} votedCount={n} onSubmit={(r) => submitBallot(voterId, r)} />`. Poll `fetchVotedCount()` every ~5s for the live count.
- `final` → a results panel: `results.top2` as the two finalists, plus an expandable full scoreboard from `results.ranked` (`[{city, points, firstPicks}]`).

`voterId` = the signed-in Supabase user id (`useAuth().user.id`). Cities come from `ANCHOR_COUNTRIES` in `src/data/cityData.js` (has name, emoji).

## Step 3 (agent): admin controls
Detect admin by querying the `admins` table for the current user id (see `useIsAdmin` in `src/App.jsx`). Show admins:
- when not open: "Open voting" → `setVoteStatus("open")`
- when open: "Close & reveal top 2" → `closeAndTally()` (with a confirm)
- when final: "Reopen voting" → `setVoteStatus("open")`

## Ship gate
Do NOT deploy the vote screen to production until Step 1's migration is live, or `/votes` will point at tables that do not exist. After the migration: dry-run (admin opens, members rank + submit, admin closes, top 2 reveal), then ship.
