# setup-structure.ps1
$folders = @(
  "src/styles",
  "src/app",
  "src/config",
  "src/lib",
  "src/routes",
  "src/ui",
  "src/components/ui",
  "src/features/auth",
  "src/features/fs/components",
  "src/features/video/components",
  "src/features/remote/components",
  "src/features/editor/components",
  "src/pages",
  "src/hooks",
  "src/utils",
  "src/assets",
  "src/types"
)

$files = @(
  "src/styles/globals.css",
  "src/app/router.tsx",
  "src/app/providers.tsx",
  "src/app/queryClient.ts",
  "src/config/index.ts",
  "src/config/theme.ts",
  "src/lib/axios.ts",
  "src/lib/shadcn.ts",
  "src/lib/mime.ts",
  "src/routes/paths.ts",
  "src/ui/AppShell.tsx",
  "src/ui/AppHeader.tsx",
  "src/ui/AppSidebar.tsx",
  "src/ui/Page.tsx",
  "src/ui/icons.tsx",
  "src/features/auth/AuthContext.tsx",
  "src/features/auth/ProtectedRoute.tsx",
  "src/features/auth/api.ts",
  "src/features/auth/storage.ts",
  "src/features/auth/types.ts",
  "src/features/fs/api.ts",
  "src/features/fs/hooks.ts",
  "src/features/fs/utils.ts",
  "src/features/fs/types.ts",
  "src/features/fs/components/FileExplorer.tsx",
  "src/features/video/api.ts",
  "src/features/video/hooks.ts",
  "src/features/video/components/VideoPlayer.tsx",
  "src/features/video/components/TranscodeButton.tsx",
  "src/features/remote/api.ts",
  "src/features/remote/hooks.ts",
  "src/features/remote/components/PasteLinkForm.tsx",
  "src/features/editor/api.ts",
  "src/features/editor/hooks.ts",
  "src/features/editor/components/TextEditor.tsx",
  "src/pages/Login.tsx",
  "src/pages/Explorer.tsx",
  "src/pages/TextEditorPage.tsx",
  "src/pages/NotFound.tsx",
  "src/hooks/useDebounce.ts",
  "src/hooks/useDisclosure.ts",
  "src/utils/formatBytes.ts",
  "src/utils/formatDuration.ts",
  "src/utils/classnames.ts",
  "src/types/index.ts",
  ".env.example"
)

foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

foreach ($file in $files) {
  if (-not (Test-Path $file)) {
    New-Item -ItemType File -Force -Path $file | Out-Null
  }
}
