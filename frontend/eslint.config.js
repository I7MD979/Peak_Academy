import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...coreWebVitals,
  {
    rules: {
      // Async data-fetch pattern (useEffect → useCallback → setState) is valid
      // throughout this codebase; setState is called async, not synchronously.
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
