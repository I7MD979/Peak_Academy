"use client";

import { useEffect, useState } from "react";
const CSRF_COOKIE_NAME = "csrf_token";

function readCsrfCookie() {
  if (typeof document === "undefined") return "";
  const pattern = new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`);
  const match = document.cookie.match(pattern);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function CsrfField() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(readCsrfCookie());
  }, []);

  if (!token) return null;

  return <input type="hidden" name="csrf_token" value={token} autoComplete="off" />;
}
