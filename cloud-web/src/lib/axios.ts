import axios from "axios"

const baseURL = import.meta.env.VITE_API_BASE_URL || ""

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("auth_token")
      // optional: redirect to login
      if (location.pathname !== "/login") location.href = "/login"
    }
    return Promise.reject(err)
  }
)
