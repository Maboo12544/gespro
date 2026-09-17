# GesPro static demonstration on Netlify

This separate entrypoint reuses the existing visual workspace with browser-local
example data. It is not the authenticated application and must not be used for
real accounts, wagers, payments or personal information.

Build from the repository root using the existing frozen pnpm dependencies:

```sh
pnpm exec vite build --config demo/netlify/vite.config.ts
```

Publish only `dist-netlify-demo`. The root `netlify.toml` specifies this command
and output directory. No Supabase keys, production secrets, server functions,
database migrations or API routes are required or included. The CSP blocks API
connections and native form submission. Some server-only controls remain
unavailable in the demo. Browser data is not synced or backed up remotely.

Deploy this branch as a separate Netlify demo project. Do not repoint gespro.lol
or replace an existing production deployment without an explicit decision.
For direct folder uploads, use the generated `_headers` file as well as assets.
