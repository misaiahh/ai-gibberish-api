import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export function getOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Todo App API",
      description: "REST API for the Todo App",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3001", description: "Local dev" }],
  });
}

export function getOpenApiComponents() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateComponents();
}
