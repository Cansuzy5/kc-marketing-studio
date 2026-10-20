# KC Marketing Studio

Marketing workspace for four KC business units and eleven subunits. Hosted on Vercel, with Supabase Auth, Postgres and private Storage.

## Usage

The main URL requires email/password login. New accounts confirm their email, sign in, and wait for administrator approval. Admins manage memberships; marketing sees all units; branch users see only their assigned unit. Database RLS enforces these scopes.

Create/edit content, attach images/PDFs, plan publication and record advertising budget, spend, views, replies, comments and clicks manually. Trash is recoverable. Database audit history records actor, time and before/after values. Admins and marketing can read history; browser clients cannot change it.

Version checks prevent silent concurrent overwrites. Use the refresh button for shared updates. No live push yet. The separate `?demo=1` workspace uses browser-local sample data; previous local data is not automatically imported.

## Development

Node >=22.14. Run `npm ci`, `npm run build`, `npm test`, `npm run dev`. Build copies the pinned Supabase SDK into public/vendor. Vercel builds and serves public/. Do not commit generated vendor output or credentials.

## Database

`database/schema.sql` is the initial one-time schema for an empty project; already applied to KC. Do not rerun on an initialized database. `database/verify.sql` tests roles, scope, versions, audit, trash and restore inside a rolled-back transaction.

Only a publishable key is in the browser. Never expose database passwords, secret keys or service-role keys. The first admin must be explicitly assigned by a project owner after checking the selected user's confirmed email. There is no automatic first-user promotion.

Set Auth Site URL to production and allow only intended redirects. Keep email confirmation enabled. Configure an email provider before broader onboarding if the built-in service rejects recipients or reaches limits.

## Operational limits

- Private file links expire in one hour; refresh to renew. Upload limit: 5 MB each, 12 per item. Removed files are retained for recovery; a retention policy is still needed. Failed saves after upload can leave unused private files.
- History UI shows latest 200 events; complete history remains in database. Role changes are audited. Supabase Auth separately logs sign-ins.
- No offline cloud cache, Google Sheets sync or automatic advertising-platform connection.
- Vercel Hobby has use restrictions; choose a suitable plan before business production. No paid upgrade is made here.

## Demo photos

[Pool / Unsplash](https://unsplash.com/pt-br/fotografias/casa-branca-moderna-com-piscina-e-palmeira-mCQ-ykj6tQk), [Solar / Pujanak, public domain](https://commons.wikimedia.org/wiki/File:Solar_panels_on_a_roof.jpg). Not actual KC properties.

## Lead tracking

Apply database/leads.sql once after schema.sql. It adds scoped leads and append-only followup records, with an invoker-rights transactional followup function. Verify with database/verify-leads.sql. Content-linked leads must stay in the same unit; moving a content item with linked leads is rejected by the database. Lead unit reassignment is intentionally unavailable.

Results show cumulative post metrics separately from opportunities. Only confirmed post attribution contributes to sales and funnel totals. Cost per paid lead divides spend by confirmed paid-source leads. Unknown sale values remain unavailable, not zero. Source attribution is manual, not causal proof. Lead contact information stays out of the public demo. The demo uses a separate local storage key.
# Content scope and response reporting

Content can select multiple related BUs or all BUs. It remains one record, with one owning unit for permissions, files and lead ownership. Related BU selections do not expand branch access. Overall totals count each content once; budget breakdowns use the owning BU.

Organic response counts are separate from paid advertising counts and remain editable without enabling Ads. Blank means not reported; zero means measured with no response. Enter Organic-only values to avoid double counting a platform's combined total.

Apply `database/member-directory.sql` after the existing schema. Opening Members refreshes the directory from email-confirmed Auth users, inserting inactive pending profiles only. Existing permissions remain unchanged. `database/verify-member-directory.sql` verifies the admin guard and pending isolation in a transaction that rolls back all fixtures. Users who have not confirmed email are excluded.


## Administrator-created usernames
Apply `database/managed-accounts.sql` and reapply `database/member-directory.sql`. Deploy `supabase/functions/manage-accounts/index.ts` as `manage-accounts` with platform legacy JWT verification off: the handler validates each caller with Auth getUser and an active admin profile before provisioning. Credentials are read only from the function environment. Public signup should be disabled in Auth settings. Existing email accounts continue working.

Managed usernames map to an internal non-deliverable Auth identifier, not a verified external email. Admins choose initial passwords in the UI; no email is sent. Members must change their initial password, enforced by database RLS helpers until the service confirms completion. Passwords are never returned or included in the application audit log. Existing usernames are never overwritten/reset by create requests. Failed profile provisioning attempts clean up only the Auth user just created. Lost-password recovery for these usernames requires administrator assistance; email recovery is unavailable.
