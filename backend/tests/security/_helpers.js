import { vi } from "vitest";

export function mockReq(overrides = {}) {
  return {
    method: "GET",
    originalUrl: "/api/test",
    url: "/api/test",
    path: "/api/test",
    ip: "1.2.3.4",
    headers: {},
    body: {},
    query: {},
    params: {},
    cookies: {},
    user: null,
    ...overrides
  };
}

export function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    _body: null
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res._body = body;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
    return res;
  };
  res.removeHeader = (k) => {
    delete res.headers[k];
    return res;
  };
  res.redirect = (code, url) => {
    res.statusCode = code;
    res._redirect = url;
    return res;
  };
  res.cookie = vi.fn().mockReturnThis();
  res.on = vi.fn();
  return res;
}

export const mockNext = () => vi.fn();
