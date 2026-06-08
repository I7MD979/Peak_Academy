import js from "@eslint/js";

export default [
  { ignores: ["src/data/usersStore.js", "src/utils/audit.js"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-undef": "error"
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setInterval: "readonly",
        setImmediate: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly"
      }
    }
  }
];
