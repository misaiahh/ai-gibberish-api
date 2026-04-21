import { defineNitroPlugin } from "nitropack/runtime";
import { seedDatabase } from "../lib/seed";

export default defineNitroPlugin(() => {
  seedDatabase();
});
