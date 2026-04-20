import { defineNitroPlugin } from "nitropack/runtime";
import { createLogger, setLogger } from "../lib/logger";

export default defineNitroPlugin((/* nitro */) => {
  const logger = createLogger({
    appName: "todo-app-api",
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
  });

  setLogger(logger);
});
