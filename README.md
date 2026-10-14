# DevJSON Studio

A local-first engineering workbench for inspecting, transforming, validating, and diffing API payloads. All parsing, schema generation, and comparisons run entirely in the browser using Web standard APIs and local AST parsers. Data never leaves your machine.

---

## Capabilities

### Smart Input Processing
- **Syntax Auto-Repair:** Corrects unquoted keys, trailing commas, single-quoted strings, unescaped characters, and missing delimiters without losing object structures.
- **Payload Unwrapper:** Automatically detects and unpacks common non-standard inputs:
  - Escaped / stringified JSON (`"{\"user\": ...}"`)
  - JWT tokens (extracts header and decoded payload claims)
  - cURL commands (extracts request body, headers, method, and endpoint URL)
  - URL query strings (decodes encoded JSON parameters)
- **Inline Editing & PII Redaction:** One-click mask for sensitive fields (`password`, `token`, `secret`, `email`, `ssn`) and instant formatting/minification.

### Multi-Engine Inspector
- **Interactive Tree Explorer:** Collapsible nodes with item counters, type badges, inline key/value copy, and JSONPath breadcrumbs.
- **TypeScript Generator:** Generates strict interfaces or type aliases with automatic nested type extraction, root name configuration, and optional readonly qualifiers.
- **Zod Schema Generator:** Infers runtime schemas with type guards, including email, URL, UUID, and ISO 8601 datetime format detection.
- **HTTP Client Code:** Generates production-ready client snippets for native `fetch()`, `axios`, and Mock Service Worker (MSW v2) request handlers.
- **JSONPath Query Workbench:** Evaluates client-side queries against large payloads with microsecond execution telemetry.

### Semantic Diff Workbench
- Dedicated dual-column inspector comparing API revisions (v1 vs v2, staging vs production).
- Categorizes changes into structural additions, deletions, and scalar value mutations with line-by-line breadcrumb navigation.

### Local-First Persistence & Sharing
- **Scratchpad Workspaces:** Up to 6 isolated scratchpad tabs persisted locally in IndexedDB.
- **Snapshot History:** Automatic revision history stored locally without hitting `localStorage` quota limits.
- **Zero-Backend Sharing:** Payload states compress into standard URL hash fragments using `lz-string`. If a payload exceeds standard URL limits (4 KB), it falls back to a standalone `.devjson` file download.

---

## Architecture & Privacy Guarantee

DevJSON Studio has no backend server, no telemetry trackers, and no external API dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Sandbox                       │
│                                                             │
│  ┌───────────────────┐               ┌───────────────────┐  │
│  │    Raw Input      │ ────────────> │  AST & Repair     │  │
│  │ (JSON/cURL/JWT)   │               │   Engine          │  │
│  └───────────────────┘               └─────────┬─────────┘  │
│                                                │            │
│                 ┌──────────────────────────────┼──────────┐ │
│                 ▼                              ▼          ▼ │
│       ┌──────────────────┐           ┌──────────────┐ ┌───┴──────────┐
│       │ Tree & JSONPath  │           │ TS / Zod Gen │ │ Semantic Diff│
│       └──────────────────┘           └──────────────┘ └──────────────┘
│                 │                              │          │ │
│                 └──────────────┬───────────────┴──────────┘ │
│                                ▼                            │
│                      ┌───────────────────┐                  │
│                      │ Local Storage     │                  │
│                      │ (IndexedDB)       │                  │
│                      └───────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

1. **Network Sandbox:** All calculations occur within the client runtime thread. Disconnecting your internet connection does not interrupt any feature.
2. **Storage:** Snapshots, scratchpad buffers, and preferences are written exclusively to the browser's `IndexedDB` storage via a scoped key-value store.
3. **PWA Compliance:** Includes web manifest and standalone display configuration for desktop app installation.

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl+K` / `Cmd+K` | Open Command Palette | Global |
| `Ctrl+S` / `Cmd+S` | Save Snapshot to History | Global |
| `Ctrl+Enter` / `Cmd+Enter` | Format & Prettify Input | Editor |
| `Alt+Shift+F` | Run Syntax Auto-Repair | Editor |
| `Ctrl+Z` / `Cmd+Z` | Undo Input Edit | Editor |
| `Ctrl+Y` / `Cmd+Shift+Z` | Redo Input Edit | Editor |
| `Esc` | Close Modal / Dismiss Overlay | Global |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/open-devtools/devjson-studio.git
cd devjson-studio

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

### Production Build
```bash
# Typecheck and compile bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Tech Stack

- **Framework:** React 19, TypeScript
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS 3 with calibrated slate-charcoal engineering palette
- **Icons:** Lucide React (14px–16px vector strokes)
- **Local Database:** idb-keyval (IndexedDB)
- **Compression:** lz-string (URL hash state encoding)
