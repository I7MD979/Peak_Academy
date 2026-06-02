"use client";

import NavBar from "../NavBar";

export default function AppShell({ title, children }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {title && <h1 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h1>}
        {children}
      </div>
    </main>
  );
}
