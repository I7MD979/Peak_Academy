/** Prevent static caching of auth pages (login, register, etc.). */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }) {
  return children;
}
