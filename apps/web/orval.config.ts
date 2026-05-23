import { defineConfig } from "orval";

export default defineConfig({
  polypad: {
    input: {
      target: "../server/openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints",
      schemas: "./src/api/generated/model",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/api/mutator/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
          version: 5,
        },
      },
    },
  },
});
