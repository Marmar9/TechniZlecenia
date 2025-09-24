// server.ts

import { createServer } from "node:http";
import next from "next";
import { parse as urlParse } from "url";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, turbo: true, customServer: true });
const handle = app.getRequestHandler();

async function main() {
  const xd = "";
  app.prepare().then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = urlParse(req.url!, true);
      return handle(req, res, parsedUrl);
    });

    server.listen(3000, () => {
      console.log("Next.js server listening on http://localhost:3000");
    });
  });

  Bun.serve({ websocket: {}, port: 3001 });
}

main();
