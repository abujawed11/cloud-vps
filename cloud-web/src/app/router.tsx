import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "@/pages/Login"
import Explorer from "@/pages/Explorer"
import TextEditorPage from "@/pages/TextEditorPage"
import NotFound from "@/pages/NotFound"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/explorer" replace />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/editor" element={<TextEditorPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
