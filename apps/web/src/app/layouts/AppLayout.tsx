import { Outlet } from "@tanstack/react-router";
import { ReactNode } from "react";

interface AppLayoutProps{
  children: ReactNode
}

export function AppLayout({children}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-white">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold">API 5 Semestre</span>
        </div>

        <nav className="space-y-1 p-4">
          <a
            href="/"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Dashboard
          </a>

          <a
            href="/users"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Usuários
          </a>
        </nav>
      </aside>

      <div className="ml-64">
        <header className="flex h-16 items-center border-b bg-white px-6">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>

        <main className="p-6">
          <Outlet />{children}
        </main>
      </div>
    </div>
  );
}