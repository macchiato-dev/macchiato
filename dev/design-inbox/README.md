# Design inbox

Private local intake for Claude Design exports for the resources-edge redesign.
A static directory app with a declarative `access.uploadDirectories.design`
grant. The gateway streams uploads into
`/root/macchiato-work/design-inbox/<uuid>--<original-name>`.
Original bytes are not extracted, executed, served, or committed. Same names
do not overwrite each other. Limits: 250 MiB per file and 1 GiB in total.

Install with `node packages/macchiato/src/macchiato.js app install design-inbox`
from the repository root. No proxy, child process, custom app request handler,
or separate server is involved. `options.developmentAuth` protects both the
static UI and the upload routes, before gateway dispatch. Use
`macchiato-dev-link get design-inbox` for the private URL.

`GET /-/uploads/design` lists received files. `POST /-/uploads/design?name=…`
streams a raw file body, requiring the same Origin. The grant names, directory
and quotas are in `packages/app/src/app-plugins.js`; the reusable request
implementation is `packages/app/src/directory-uploads.js`.
