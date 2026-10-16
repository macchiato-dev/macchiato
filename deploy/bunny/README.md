# Bunny deployment

Deployment has two steps that never share a credential.

1. **Build** (development container, no keys) produces one directory:

   ```sh
   deno run -A scripts/build-resources-bunny.js
   ```

   `dist/resources-bunny/` then contains `release/` (the Edge script and
   revisioned Storage objects, with a hashed `deployment.json` inventory),
   `bunny-deploy` (this directory's `deploy.js`, compiled) and a
   `Containerfile`. The build checks the inventory and the application's
   structural invariants before it finishes.

2. **Deploy** (host, the only place `BUNNY_API_KEY` exists) builds a narrow
   image from that directory and runs it once:

   ```sh
   podman cp macchiato-vibe:/root/macchiato/dist/resources-bunny .
   podman build -t resources-bunny-deploy resources-bunny
   printf %s "$BUNNY_API_KEY" | podman secret create --replace bunny_api_key -
   podman run --rm \
     --secret bunny_api_key,type=env,target=BUNNY_API_KEY \
     -e BUNNY_STORAGE_ZONE_ID=… -e BUNNY_EDGE_SCRIPT_ID=… \
     resources-bunny-deploy
   ```

   Add `--dry-run` after the image name to re-verify the release without
   network access or a key.

The deploy client:

- re-verifies every file against the inventory and refuses unlisted files;
- reads the Storage zone's hostname and upload password through the account
  API, so the API key is the only secret it receives;
- refuses to continue if the Edge Script's `BUNNY_STORAGE_ORIGIN` variable
  names a different Storage zone;
- uploads the revisioned objects with SHA-256 checksums, then the public
  `manifest.json` last, because the manifest is publication authority;
- sets the Edge Script code and publishes a release noted with the revision.

The compiled client may only read `/release`, read its three environment
variables, and connect to `api.bunny.net` and the regional Storage hosts. The
image contains nothing else from the repository. Build the directory on the
same CPU architecture as the host that runs the image.

Each revision uploads to a new `resources-co-<revision>/` Storage prefix, so a
partial upload never changes what the live script serves. To roll back, run an
older image again; its objects are already in Storage.

## Environment configuration

The Edge Script's own variables and secrets (`BUNNY_STORAGE_ORIGIN`, the
read-only `STORAGE_API_KEY`, OAuth, session and database settings) are set once
in Bunny, not by this client. They are listed under "First Edge Script setup"
in [`packages/website/README.md`](../../packages/website/README.md).

Staging and production are separate Storage zones, Edge Scripts and databases;
they differ only in the IDs passed to `podman run`. Run the database migration
in `docs/bunny-database-operations.md` before deploying a release that needs
it; that step uses the database token, not the Bunny API key.
