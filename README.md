# The Everything Hub

A personal collection of tools and planners. Vibe coded with [Claude](https://claude.ai).

![React](https://img.shields.io/badge/React-18-61dafb?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite) ![Vibe Coded](https://img.shields.io/badge/Vibe-Coded%20%F0%9F%8E%B6-blueviolet)

## What is this?

A module launcher — a home page that links to individual tools. Each module is a self-contained page with its own route, inputs auto-saved to localStorage, and a back-to-hub button. Currently one module lives here; the architecture is built to make adding new ones trivial.

## Modules

### 💸 Liquiditeitsplanner (`/vermogenplanner`)

A personal liquidity and wealth planner. Models cashflow, expenses, savings, stocks, and student debt simultaneously — projecting net worth over 1–50 years.

**Cash flow**
- Annual gross income with Dutch 2025 tax estimator (net income hint)
- Editable net monthly take-home + annual raise rate
- Itemised monthly expenses by category (housing, food, transport, etc.) with add/edit/delete
- Free budget = net income − expenses − allocations

**Monthly allocation**
- Split free budget across: current account, savings account, stocks, DUO repayment
- Doughnut chart shows allocation breakdown with unallocated remainder
- Budget utilisation bar; over-budget state highlighted in red
- Emergency fund (buffer) with configurable target amount; once full, overflow automatically routes to savings or stocks

**DUO student loan**
- Three repayment plans: manual, SF15 (15-yr, pre-2015), SF35 (35-yr, post-2015)
- SF15/SF35 payment auto-calculated from gross income: `max(0, (gross − €22,452) × 4% / 12)`
- Payment grows each year as gross income rises (fixed threshold means faster growth)
- Forgiveness after plan period; until then, the allocation row is read-only

**One-time events (timeline)**
- Savings goals — set a target amount and year; required monthly set-aside shown inline
- Term deposits — lump sum placed at a fixed rate for a fixed duration
- Stock lump sums — one-off investment into the stock portfolio
- Extra debt repayments

**Simulation**
- Month-by-month simulation across the full horizon
- Tiered interest on current account (two rates with configurable threshold)
- Simple monthly interest on savings and debt
- Salary raises applied to net income and DUO payment each year
- Line chart: net wealth, liquid savings (current + savings, no stocks), stocks, remaining debt

**Optimizer**
- Brute-force search over all valid budget splits (€10–€50 steps)
- Runs in a Web Worker so the UI never freezes
- Enforces a minimum current-account contribution to fill the emergency fund
- Result card shows current vs. optimal per allocation with colour-coded delta badges
- "Apply to my plan" animates all inputs with a cubic ease-out over 600ms

## Themes

Three animated canvas backgrounds, switchable at any time via the top-right controls. Choice is persisted to localStorage.

| Icon | Name | Background |
|------|------|------------|
| 🌌 | **Aurora** | Twinkling starfield with 4 undulating aurora bands (green / violet / cyan / purple) using additive blending |
| 🏑 | **Hockey** | Field hockey pitch — alternating grass stripes, center circle, shooting arcs, goal lines, 5 drifting hockey balls |
| 🌅 | **Safari** | African savanna at night — warm star field, orange horizon glow, a moon, 80 floating dust motes, rolling ground with acacia tree silhouettes |

Each theme also shifts the full design token set: accent colour, background tones, surface tints, border colours, text colours, and glow blob colours (which bleed through the glass cards via `backdrop-filter`).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Package manager | Yarn |
| Routing | React Router v6 |
| Styling | CSS Modules + global design tokens via CSS custom properties |
| Internationalisation | react-i18next + i18next-browser-languagedetector |
| Charts | Chart.js via react-chartjs-2 |
| Optimiser | Web Worker (Vite `?worker` import) |
| State persistence | Custom `useLocalStorage` hook |
| Theme state | React Context (`ThemeProvider`) |

## Architecture

```
src/
├── App.tsx                  # BrowserRouter + ThemeProvider + routes
├── modules.ts               # Module registry — add one object here to register a new module
├── context/
│   └── ThemeContext.tsx     # Single source of truth for theme state
├── hooks/
│   ├── useLocalStorage.ts   # useState that persists to localStorage
│   └── useTheme.ts          # Re-exports from ThemeContext
├── i18n/
│   ├── index.ts             # i18next setup (detects language from localStorage)
│   └── locales/nl.ts|en.ts  # All copy lives here — no hardcoded strings in components
├── styles/
│   └── globals.css          # Design tokens (:root), three theme blocks, glass utility, glow blobs
├── components/
│   ├── DynamicBackground/   # Canvas animation — switches scene based on active theme
│   ├── ModuleLayout/        # Shared wrapper for all modules (back button, glass card)
│   ├── ModuleCard/          # Home page card per module
│   ├── LangThemeToggle/     # Fixed top-right — NL/EN + 🌌/🏑/🌅 theme picker
│   └── [WealthPlanner UI]/  # CashFlowSection, AllocationSection, InputGrid, StatGrid, StrategyChart, OptimizeSection, TimelineEditor
├── pages/
│   ├── Home/                # Module launcher
│   └── WealthPlanner/       # Wealth planner page
├── utils/
│   ├── simulation.ts        # Pure simulation functions (used by page + worker)
│   ├── tax.ts               # Dutch 2025 net income estimator (tax brackets, AHK, arbeidskorting)
│   └── confetti.ts          # Canvas confetti burst
├── workers/
│   └── optimizer.worker.ts  # Brute-force optimizer (runs off main thread)
└── types.ts                 # Shared TypeScript interfaces
```

## Adding a New Module

1. Create `src/pages/YourModule/YourModule.tsx` — wrap content in `<ModuleLayout>`
2. Add a route in `App.tsx`
3. Push one object to `MODULES` in `modules.ts`
4. Add title/description translation keys to both locale files

The module automatically gets: a home page card with icon and tags, a back-to-hub button, input persistence via `useLocalStorage`, and all three themes applied.

## Getting Started

```bash
yarn          # install
yarn dev      # dev server at http://localhost:5173
yarn build    # production build
```

## Design System

All visual values are CSS custom properties. A theme is a single `[data-theme='name']` block in `globals.css` — override the tokens, done.

Key tokens: `--accent`, `--accent-mid/light/dark/darker`, `--bg-base`, `--surface-glass/card/input`, `--border-subtle/base/strong/glass`, `--text-primary/secondary/muted/faint`, `--glow-a/b/c`, `--glass-blur`.

Opacity variants use `color-mix(in srgb, var(--accent) X%, transparent)` so they automatically track theme changes without separate tokens.

## License

Do whatever you want with it.
