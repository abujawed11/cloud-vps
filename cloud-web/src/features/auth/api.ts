import { api } from "@/lib/axios"

export async function loginApi(email: string, password: string): Promise<{ token: string }> {
  const { data } = await api.post("/auth/login", { email, password })
  // Backend route is POST /api/auth/login — baseURL already includes /api
  return data
}
