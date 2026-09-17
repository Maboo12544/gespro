import type { Plugin } from "vite";

type SitesOptions = {
  mockAuth?: boolean;
};

const MOCK_USER_HEADERS = {
  "oai-authenticated-user-id": "local-dev-user",
  "oai-authenticated-user-email": "dev@local",
  "oai-authenticated-user-full-name": "Local Dev",
  "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
};

export function sites(options: SitesOptions = {}): Plugin {
  const mockAuth = options.mockAuth ?? false;

  return {
    name: "sites-vite-plugin",
    configureServer(server) {
      if (!mockAuth) return;
      server.middlewares.use((_req, res, next) => {
        const headers = res.getHeader("Vary");
        if (headers) {
          res.setHeader("Vary", `${headers}, oai-authenticated-user-id`);
        }
        for (const [key, value] of Object.entries(MOCK_USER_HEADERS)) {
          res.setHeader(key, value);
        }
        next();
      });
    },
  };
}
