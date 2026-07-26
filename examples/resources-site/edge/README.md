# Resources.co Bunny edge security model

## Modules

- `../bunny-server.js`: trusted composition root; no routing or policy logic.
- `models.js`: pure validation and policy models with no SDK dependency.
- `app.js`: Fetch API orchestration with injected configuration, clock, fetch,
  and logger.
- `../auth/`: signed cookie, PKCE, GitHub/GitLab exchange, and identity validation.
- `../models/accounts.js`: provider-neutral SQLite identity model behind a
  libSQL-compatible client boundary.
- `../seed.js`: route/view model and authored UI.
- `../export-static.js`: trusted publisher that runs strict `use-*` validation.

This division makes the deployed request path reviewable without reading the
large page renderer, and makes the renderer unable to grant itself new edge
routes after publication.

## Trust flow

```text
repository route/view models
  -> style-use validates the complete stylesheet
  -> dom-use + html-use strictly sanitize document-profile markup
  -> exporter writes immutable objects and manifest evidence
  -> operator uploads one export prefix to private Bunny Storage
  -> edge validates manifest structure and security profile
  -> request path canonicalizes to an exact allowlisted key
  -> authenticated, non-redirecting HTTPS Storage request
  -> fixed public response policy and CSP
  -> optional signed session renders one escaped account-status island
```

The generated manifest is publication authority, not user input. Anyone able to
write both the export objects and manifest can publish content; protect that
credential separately from the read-only credential used by the edge script.

## What is intentionally absent

- No QuickJS or other nested JavaScript sandbox at the edge.
- No edge-side HTML templating or interpretation of arbitrary route data.
- No public Storage proxy and no prefix-only authorization.
- No provider token in cookies, Storage, logs, or browser responses.
- No mutations, SQL, durable user records, or user-authored HTML.
- No executable JavaScript in the document-profile export.
- No passthrough of upstream response headers except ETag and Last-Modified.

## Remaining deployment work

- Add a least-privilege upload job and keep its write credential out of the Edge
  Script environment.
- Confirm the chosen Storage endpoint and read credential with a staging zone.
- Add deployment provenance/signing if the manifest must defend against a
  compromised Storage writer; hashes currently support audit and accidental
  corruption diagnosis, not an independent signature root.
- Add production log sampling and alerting without logging secrets or full URLs.
- Exercise Bunny Database migration and rollback behavior in staging, then add
  organization/project models. Keep its token separate from the Storage read
  key and session signing key.
- Decide whether future mutation APIs belong in a separate edge script/origin
  so the publication path retains its tiny read-only authority.
- Reconsider a native browser client only when an interaction needs it. Keep its
  code and CSP capability separate from the current document-only profile.
