# DevJSON Studio v2.0 (Flagship API Response Studio)

[![Studio v2](https://img.shields.io/badge/DevJSON-Studio%20v2.0-indigo.svg)](https://github.com/open-devtools/devjson-studio)
[![Zero-DB Series #1](https://img.shields.io/badge/Zero--DB-Series%20%231-6366f1.svg)](https://github.com/open-devtools/devjson-studio)
[![Offline Ready](https://img.shields.io/badge/Offline-100%25%20Local-10B981.svg)](https://github.com/open-devtools/devjson-studio)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-5.x%20AST-blue.svg)](https://github.com/open-devtools/devjson-studio)

A studio-grade, flagship developer desktop web application inspired by **Linear, Raycast, Vercel Geist, and VS Code**.
100% Free, Client-Side, and Zero-Database.

---

## 💎 Design & Visual Philosophy

- **Zinc/Obsidian Dark Theme:**
  - App Canvas: `#09090B` (`bg-zinc-950`)
  - Elevated Header/Toolbar: `#141418`
  - Panel Surfaces: `#0F0F12`
  - Hairline Borders: `1px solid rgba(255, 255, 255, 0.07)`
  - Accents: Emerald (`#10B981` valid RFC 8259), Amber (`#F59E0B` repairable warnings), Indigo (`#6366F1` active engines), Rose (`#EF4444` syntax errors)
- **Typography:**
  - UI Font: `Inter` with tight tracking (`tracking-tight`)
  - Code & Telemetry: `JetBrains Mono`, `Fira Code` (`text-[13px] leading-relaxed`)
- **Viewport Locked:** Full-screen IDE feel (`h-screen w-screen overflow-hidden`), internal scroll containers only with sleek custom scrollbars.

---

## 🎛️ 3-Tier IDE Architecture

### Tier 1: Unified Global Header (`h-12`)
- **Brand Title & Badges:** `DevJSON STUDIO v2` + `Zero-DB Series #1`.
- **Preset Switcher Dropdown:**
  1. `SaaS Production Response (Complex)`
  2. `Broken JS Object (Test Auto-Fix ✨)`
  3. `Stripe Webhook Payload (Deep Nesting)`
- **Interactive Privacy Pill:** `🟢 100% Local • 0 Network Calls` (popover proving local AST execution and IndexedDB storage).
- **⌘K Command Palette Button:** Keyboard-driven modal for instant actions, tab navigation, presets, and exports.
- **History (IndexedDB) Drawer:** Stores up to 15 snapshots with diff preview, formatted byte size, relative timestamp, and 1-click restore/delete.
- **Share Snapshot:** Encodes state into URL hash `#state=...` via `lz-string`. Safely provides `.devjson` export if >4KB.

### Tier 2: Resizable Split-Pane Workbench
- **Draggable Vertical Divider:** Adjust layout between 25% and 75% width (double-click to reset 50/50).

#### LEFT PANE: Smart Input Editor
- **Header:** Label `INPUT PAYLOAD` + detected format badge (`Strict JSON`, `Repairable JS Object`, `Invalid Syntax`).
- **Toolbar:** `Auto-Repair ✨`, `Prettify (2sp)`, `Minify`, `Sort Keys A-Z`, `Paste`, `Clear`.
- **Editor Body:** Synced line numbers, active line tracking, and tab indentation (2 spaces).
- **Intelligent Diagnostic Card:** Displays exact line & column, human-friendly explanation, snippet pointer (`^`), and a 1-click `Fix & Format Automatically ✨` button.

#### RIGHT PANE: Multi-Engine Inspector (5 Segmented Tabs)
1. 🌲 **Tree Explorer:** Interactive collapsible graph with item counters (`{ 5 keys }`, `[ 12 items ]`), color-coded primitives, live search filtering, and hover micro-buttons for **`Copy Path`** (e.g. `root.organization.members[0].email`) and **`Copy Value`**.
2. 📘 **TypeScript:** AST generator with recursive decomposition of nested objects into distinct named interfaces, heterogeneous array schema merging (`optional ?`), ISO 8601 date comments, and toggleable `interface` vs `type`.
3. 🛡️ **Zod Schema:** Runtime schema with pattern inference (`.email()`, `.url()`, `.datetime()`, `.uuid()`) and `z.infer` typing.
4. 🔍 **Query / Filter:** Live client-side JSONPath and wildcard query evaluation (e.g. `$.organization.members[*].name`, `..billing`) with real-time execution telemetry (`0.12 ms • 2 matched`).
5. 🚀 **API & Mock:** Ready-to-use native `fetch()`, `axios`, and **Mock Service Worker (MSW v2)** handler boilerplate.

### Tier 3: Bottom Telemetry & Status Bar (`h-7`)
- **Live Status Dot:** `Valid RFC 8259 JSON` / `Auto-Repair Ready ✨` / `Syntax Error at Ln X, Col Y`.
- **Real-Time Telemetry:** `Size: X.XX KB` • `Total Keys: X` • `Max Depth: X` • `Arrays: X` • `Parse Time: X.X ms`.
- **Storage & Layout:** `💾 Saved to IndexedDB` + 1-click layout quick switches (`Focus Left`, `50/50`, `Focus Right`).

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build production bundle
npm run build
```
