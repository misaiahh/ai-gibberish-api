import { getOpenApiSpec } from "../openapi";

export default defineEventHandler(() => {
  return getOpenApiSpec();
});
