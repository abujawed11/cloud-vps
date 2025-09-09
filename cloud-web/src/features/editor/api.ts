import { api } from "@/lib/axios"

export async function readText(path: string): Promise<string> {
  const { data } = await api.get("/fs/text", { params: { path } })
  // backend returns text directly or { text }; support both:
  if (typeof data === "string") return data
  return data?.text ?? ""
}

export async function writeText(path: string, text: string): Promise<void> {
  await api.put("/fs/text", { path, text })
}
