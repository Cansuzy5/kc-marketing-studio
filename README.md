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
