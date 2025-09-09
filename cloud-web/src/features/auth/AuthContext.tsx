import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { loginApi } from "./api"

type AuthCtx = {
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem("auth_token"))
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    token,
    isAuthenticated: !!token,
    async login(email: string, password: string) {
      const { token } = await loginApi(email, password)
      localStorage.setItem("auth_token", token)
      setToken(token)
    },
    logout() {
      localStorage.removeItem("auth_token")
      setToken(null)
    }
  }), [token])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useAuth must be used within AuthProvider")
  return v
}
