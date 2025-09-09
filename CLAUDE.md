# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack cloud storage application with two main components:

- **cloud-server**: Node.js/Express backend with file system operations, video transcoding, and remote downloads
- **cloud-web**: React + TypeScript frontend with Vite, using React Query and React Router

## Development Commands

### Frontend (cloud-web)
```bash
cd cloud-web
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (cloud-server)
```bash
cd cloud-server
node server.js       # Start the server (no dev script defined)
```

## Architecture Overview

### Backend (cloud-server/server.js)
- **Express server** with security middleware (helmet, CORS, rate limiting)
- **Authentication**: Simple JWT-based auth with hardcoded demo credentials
- **File operations**: List, upload, download, mkdir, rm, mv operations
- **Video processing**: FFmpeg integration for HLS transcoding and thumbnail generation
- **Background jobs**: BullMQ with Redis for video transcoding queue
- **Remote downloads**: Secure URL validation and streaming downloads
- **Storage paths**:
  - `/srv/storage/library` - Main file storage
  - `/srv/storage/hls` - HLS video output
  - `/srv/storage/thumbs` - Generated thumbnails
  - `/srv/storage/tmp` - Temporary files

### Frontend (cloud-web/src)
- **App structure**: Provider pattern with QueryClient and AuthProvider
- **Routing**: React Router with protected routes
- **State management**: React Query for server state, Context for auth
- **Styling**: Tailwind CSS v4+ with custom theme configuration

#### Key Feature Modules:
- **auth/**: JWT authentication with context and protected routes
- **fs/**: File system operations with hooks and API calls
- **video/**: Video player and transcode functionality
- **editor/**: Text file editing capabilities
- **remote/**: Remote URL download functionality

#### UI Components:
- **App shell**: Header, sidebar, and page layout components
- **File explorer**: Directory navigation and file operations
- **Dialogs**: Reusable confirm and input dialogs for file operations

## Key Configuration

### Backend Environment Variables
- `JWT_SECRET`: JWT signing secret (default: 'change-me')
- `REDIS_URL`: Redis connection URL (default: redis://127.0.0.1:6379)
- `FFMPEG`: Path to FFmpeg binary (default: /usr/bin/ffmpeg)
- `PORT`: Server port (default: 5000)

### Frontend Configuration
- **Vite config**: Uses React plugin and proxy for development
- **TypeScript**: Strict type checking enabled
- **Path aliases**: `@/` maps to `src/` directory

## API Patterns

### File System API
- GET `/fs/list?path=/folder` - List directory contents
- POST `/fs/mkdir` - Create directory
- POST `/fs/rm` - Remove files/directories
- POST `/fs/mv` - Move/rename files
- POST `/fs/upload` - File upload with auto-transcode
- GET `/fs/download?path=/file` - Download with range support

### Video API
- POST `/video/transcode` - Queue video for HLS conversion
- GET `/video/job/:id` - Check transcode job status
- GET `/hls/:folder/:file` - Serve HLS segments

### Authentication
- POST `/auth/login` - Login with email/password
- All other endpoints require `Authorization: Bearer <token>` header

## Development Notes

- **File operations** support both single-item and batch operations
- **Video transcoding** generates multiple quality levels (1080p/720p/480p)
- **Security**: Private IP blocking for remote downloads, path traversal protection
- **Error handling**: Consistent error responses across all endpoints
- **File uploads** are processed through multer with temporary storage