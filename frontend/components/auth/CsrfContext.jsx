"use client";

import { createContext, useContext } from "react";

const CsrfContext = createContext("");

export function CsrfProvider({ token = "", children }) {
  return <CsrfContext.Provider value={token}>{children}</CsrfContext.Provider>;
}

export function useCsrfToken() {
  return useContext(CsrfContext);
}
