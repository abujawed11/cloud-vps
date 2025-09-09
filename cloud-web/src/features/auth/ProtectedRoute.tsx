import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const loc = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc }} />
  }
  return <Outlet />
}
