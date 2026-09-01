// eslint-config-next 15.5 ships legacy (eslintrc-style) configs. Bridge them
// into ESLint 9 flat config with FlatCompat; Next 16 exports flat configs
// natively and this file can then import them directly.
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
];

export default config;
