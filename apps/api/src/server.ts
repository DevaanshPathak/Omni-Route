import { createApp } from "./app.js";

const DEFAULT_PORT = 4100;
const portValue = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const port = Number.isFinite(portValue) ? portValue : DEFAULT_PORT;

const server = createApp().listen(port, "0.0.0.0", () => {
  console.info(`Omni-Route API listening on http://0.0.0.0:${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}; stopping Omni-Route API.`);
  server.close((error) => {
    if (error) {
      console.error("API shutdown failed.", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
