# React + TypeScript + Vite

## SINAS agent integration

This frontend is wired to use SINAS as the primary backend for:

- workout schedule / sessions
- exercise sets updates during training
- user profile + goal updates
- daily check-ins
- fitness app sync triggers

### 1) Configure environment

Create a `.env` file in this folder (`front-end`) with:

```bash
VITE_SINAS_BASE_URL=https://via-5.sinas.wearebrain.com
VITE_SINAS_API_KEY=your-key
# Optional: if your SINAS gateway needs a specific path
VITE_SINAS_ENDPOINT=
# Optional: user id sent with each request
VITE_SINAS_USER_ID=demo-user
VITE_SINAS_AGENT_NAMESPACE=gym-trainer
VITE_SINAS_AGENT_NAME=Personal_Trainer
```

### 2) Run the app

```bash
pnpm install
pnpm dev
```

### 3) How requests are sent

The app sends agent tasks from [src/app/lib/sinasAgent.ts](src/app/lib/sinasAgent.ts), for example:

- `get_workout_sessions`
- `generate_workout_plan`
- `update_workout_set`
- `get_user_profile`
- `update_user_profile`
- `submit_daily_check_in`
- `get_daily_check_ins`
- `sync_fitness_app`

If no explicit endpoint is set, the client tries these paths in order:

1. `${VITE_SINAS_BASE_URL}/${VITE_SINAS_ENDPOINT}` (if configured)
2. `${VITE_SINAS_BASE_URL}/agent/run`
3. `${VITE_SINAS_BASE_URL}/run`
4. `${VITE_SINAS_BASE_URL}`

The app now requires SINAS for runtime data (no mock fallback).

### 4) Account flow

- Accounts are app-local (email + password), like a normal app account.
- On login, the app binds a stable app `userId` to SINAS requests.
- This `userId` is used for workouts, check-ins, progress, and profile data.
- Current Google login button is UI-only and not wired to backend OAuth yet.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
