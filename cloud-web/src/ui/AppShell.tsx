import type { ReactNode } from "react"

type Props = {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      {/* Header */}
      <header className="bg-brand text-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">☁️ Cloud VPS</h1>
          <nav className="space-x-4">
            <a href="#" className="hover:underline">
              Home
            </a>
            <a href="#" className="hover:underline">
              Explorer
            </a>
            <a href="#" className="hover:underline">
              Settings
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
