const noopRule = {
  meta: { type: "problem", schema: [] },
  create() {
    return {};
  },
};

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        URLSearchParams: "readonly",
      },
    },
    plugins: {
      "react-hooks": {
        rules: {
          "exhaustive-deps": noopRule,
        },
      },
    },
    rules: {},
  },
];
