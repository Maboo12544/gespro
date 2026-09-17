import type { Plugin } from "vite";

export function sites(options?: { mockAuth?: boolean }): Plugin {
  const mockAuth = options?.mockAuth ?? false;

  return {
    name: "sites-vite-plugin",
    enforce: "pre",
    configureServer(server) {
      if (!mockAuth) return;

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";

        if (url.startsWith("/signin-with-chatgpt")) {
          const returnTo = new URL(url, "http://localhost").searchParams.get("return_to") || "/";
          res.setHeader("Set-Cookie", [
            "chatgpt-auth=local_seedy; Path=/; HttpOnly; SameSite=Lax",
            "chatgpt-email=seedy%40sites.test; Path=/; HttpOnly; SameSite=Lax",
          ]);
          res.writeHead(302, { Location: returnTo });
          res.end();
          return;
        }

        if (url.startsWith("/signout-with-chatgpt")) {
          const returnTo = new URL(url, "http://localhost").searchParams.get("return_to") || "/";
          res.setHeader("Set-Cookie", [
            "chatgpt-auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            "chatgpt-email=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          ]);
          res.writeHead(302, { Location: returnTo });
          res.end();
          return;
        }

        next();
      });
    },
  };
}
