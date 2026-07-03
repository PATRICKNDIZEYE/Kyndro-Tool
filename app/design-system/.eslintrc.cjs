module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["jsx-a11y"],
  extends: ["plugin:jsx-a11y/recommended"],
  rules: {},
};
