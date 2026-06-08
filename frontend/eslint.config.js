const coreWebVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...coreWebVitals,
  {
    rules: {
      // Async data-fetch pattern (useEffect → useCallback → setState) is valid
      // throughout this codebase; setState is called async, not synchronously.
      "react-hooks/set-state-in-effect": "off"
    }
  }
];
