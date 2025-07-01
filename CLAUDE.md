# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (starts Vite dev server)
- **Build**: `npm run build` (builds for production using Vite)  
- **Preview**: `npm run preview` (preview production build locally)

## Project Architecture

This is a Preact frontend application for Filedrop, a secure file sharing service with client-side encryption.

### Technology Stack
- **Framework**: Preact with preact-iso for routing
- **Build Tool**: Vite with @preact/preset-vite
- **Styling**: TailwindCSS with shadcn/ui components
- **UI Components**: Radix UI primitives with custom styling
- **Encryption**: Web Crypto API (AES-256 with PBKDF2)
- **Analytics**: Vercel Analytics

### Key Architecture Patterns

**Component Structure**:
- `src/index.tsx` - App entry point with routing and layout
- `src/pages/Home/index.tsx` - Main application logic for upload/download
- `src/components/` - Reusable UI components
- `src/components/ui/` - shadcn/ui component library

**Encryption Implementation**:
- Client-side AES-256-CBC encryption using Web Crypto API
- PBKDF2 key derivation (100,000 iterations, SHA-256)
- Random IV and salt generation for each upload
- Files encrypted before upload, decrypted after download

**State Management**:
- Component-level state using Preact hooks
- URL parameter handling for direct file access (`?ac=...&sw=...`)
- Theme management via ThemeProvider context

### Important Implementation Details

**File Upload Flow**:
1. File selected or text entered
2. Random BIP-39 word selected as secret word
3. Data encrypted client-side with secret word
4. Encrypted data + metadata sent to backend
5. Access code returned and displayed with QR code

**File Download Flow**:
1. Access code and secret word entered (or from URL)
2. Encrypted data retrieved from backend
3. Data decrypted client-side using secret word
4. File downloaded or text displayed

**Backend API Endpoints**:
- Base URL: `https://dropit-backend-production.up.railway.app/`
- Upload: `POST /upload` (multipart form with encrypted file + metadata)
- Retrieve: `GET /retrieve?accessCode=xxx` (returns encrypted data + headers)

### Styling and UI

**Theme System**:
- CSS custom properties for theming in `src/style.css`
- Dark/light mode support via class-based theming
- Responsive design with mobile-first approach

**Component Libraries**:
- shadcn/ui components configured in `components.json`
- TailwindCSS with custom animations and utilities
- Radix UI for accessible component primitives

### File Organization

**Import Aliases**:
- `@/` maps to `src/` directory
- Use absolute imports for components and utilities

**Component Conventions**:
- TSX for TypeScript components
- JSX for legacy/simple components  
- UI components in `src/components/ui/`
- Page components in `src/pages/`

### Security Considerations

- All encryption/decryption happens client-side
- Server never has access to unencrypted data
- Files auto-delete after 24 hours (mentioned in UI)
- BIP-39 wordlist used for secure secret word generation