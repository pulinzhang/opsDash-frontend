## OpsDash Frontend

React-based dashboard application for the OpsDash platform.  
This project provides the web UI for managing users, logs, and handover records, and for viewing operational metrics and tables.

---

### Features

- **Authentication UI**: Login page and authentication guard integration.
- **User Management**: Users table, create/edit dialogs, and role management UI.
- **Handover Logs**: Create, edit, and view handover logs with rich filtering.
- **System Logs View**: Paginated, filterable logs table for operational events.
- **Dashboards & Charts**: Data visualization using Recharts and AG Grid.
- **Responsive Layout**: Works across common desktop resolutions.

---

### Tech Stack

- **Core**
  - React 19
  - TypeScript
  - Vite
  - React Router DOM

- **UI & Styling**
  - Tailwind CSS
  - `tailwindcss-animate`
  - Radix UI Dialog (`@radix-ui/react-dialog`)

- **Data & Charts**
  - @tanstack/react-query
  - AG Grid (`ag-grid-community`, `ag-grid-react`)
  - Recharts

---

### Project Structure (Frontend)

```text
OpsDash-Front/
  ├─ src/
  │  ├─ auth/          # Auth context / hooks (e.g., useAuth)
  │  ├─ components/    # Reusable UI components
  │  ├─ pages/         # Page components (Users, Logs, HandoverLogs, Login, etc.)
  │  ├─ services/      # API client(s) for talking to OpsDash-API
  │  ├─ App.tsx        # Root app component and routing
  │  ├─ main.tsx       # Vite/React entry point
  │  └─ style.css      # Global styles and Tailwind entry
  ├─ index.html
  ├─ tailwind.config.js
  ├─ tsconfig.json
  ├─ vite.config.ts
  └─ package.json
```

---

### Prerequisites

- Node.js **18+** (recommended)
- A running instance of the **OpsDash API** (backend)  
  The frontend expects an API base URL configured via environment variables.

---

### Installation

From the project root of the repository:

```bash
cd OpsDash-Front
npm install
```

---

### Environment Variables

If an `env.example` file is present, copy it to `.env` and adjust values:

```bash
cd OpsDash-Front
cp env.example .env   # On Windows PowerShell: copy env.example .env
```

Typical variables (names may differ depending on implementation):

- **`VITE_API_BASE_URL`**: Base URL of the OpsDash API  
  Example: `http://localhost:3000/api`

Make sure the frontend URL and backend CORS configuration match in production.

---

### Scripts

All commands are run from `OpsDash-Front`:

- **Development server**

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement.

- **Build for production**

```bash
npm run build
```

Outputs the production build to the `dist` folder.

- **Preview production build**

```bash
npm run preview
```

Serve the built `dist` bundle locally for verification.

- **Type check**

```bash
npm run typecheck
```

Runs TypeScript in no-emit mode to check types.

- **Code formatting**

```bash
npm run format
npm run format:check
```

Uses Prettier to format or verify code style.

---

### Development Notes

- **Routing**: Implemented with React Router DOM. The main routes live in `App.tsx`, with nested routes for pages such as `UsersPage`, `LogsPage`, and `HandoverLogsPage`.
- **State & Data Fetching**: Server data is typically managed via @tanstack/react-query; components subscribe to queries for caching and automatic refetching.
- **Dialogs & Modals**: Built with Radix UI Dialog and styled via Tailwind utility classes (including custom `z-index`, `backdrop`, and animation utilities).
- **Tables & Grids**: Complex tables (sorting, filtering, pagination) are built with AG Grid.

---

### Building & Deploying

1. Ensure environment variables for the API base URL are set appropriately in `.env`.
2. Run the production build:

```bash
npm run build
```

3. Deploy the contents of the `dist` folder to any static hosting solution (Nginx, Apache, CDN, etc.).
4. Configure the server to route all unmatched paths to `index.html` (SPA fallback) so React Router can handle client-side routing.

---

### Conventions

- Use TypeScript types and interfaces consistently for props and API responses.
- Prefer reusable components in `src/components` for shared UI patterns.
- Keep pages in `src/pages` focused on composition and orchestration (wiring data + components).
- Run **typecheck** and **format:check** before committing changes where possible.

