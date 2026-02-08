# Frontend Setup Guide

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── core/
│   │   ├── api/
│   │   │   ├── client.js       - HTTP client with auto-refresh
│   │   │   └── errorHandler.js - Error classes
│   │   ├── constants/
│   │   │   └── api.js           - API endpoints, WebSocket config
│   │   ├── storage/
│   │   │   └── auth.js          - JWT token storage
│   │   └── ws/
│   │       └── wsManager.js     - WebSocket manager
│   ├── hooks/
│   │   └── useApi.js            - React API hooks
│   ├── pages/
│   │   ├── LoginPage.jsx        - Login/Signup
│   │   ├── OAuthConnectPage.jsx - Initiate Deriv OAuth
│   │   ├── OAuthCallbackPage.jsx- Handle OAuth callback
│   │   ├── DashboardPage.jsx    - Main dashboard
│   │   └── TradingPage.jsx      - Trading interface
│   ├── providers/
│   │   ├── AuthProvider.jsx     - Auth context
│   │   ├── WSProvider.jsx       - WebSocket context
│   │   └── RootProvider.jsx     - Combines all providers
│   ├── router/
│   │   └── config.js            - Route configuration
│   ├── App.jsx                  - Main app with routing
│   ├── main.jsx                 - React entry point
│   └── index.css                - Tailwind CSS
├── .env.example                 - Environment variables template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

```bash
cp .env.example .env
```

Then update with your values:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_DERIV_APP_ID=your_deriv_app_id
VITE_ENVIRONMENT=development
```

### 3. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Integration

All API calls use the centralized `apiClient` from `src/core/api/client.js`:

### useQuery Hook (GET requests)

```jsx
const { data, loading, error, refetch } = useQuery("/accounts", {
  refetchInterval: 10000, // Auto-refetch every 10s
  enabled: true,          // Conditionally fetch
  onSuccess: (data) => console.log(data),
  onError: (error) => console.error(error),
});
```

### useMutation Hook (POST/PUT/PATCH/DELETE)

```jsx
const { data, loading, error, mutate } = useMutation(
  (data) => console.log("Success:", data),
  (error) => console.error("Error:", error)
);

// Execute mutation
await mutate("/trades/execute", {
  method: "POST",
  body: { symbol: "EURUSD", stake: 10 }
});
```

### Direct API Client Usage

```jsx
import { apiClient } from "@/core/api/client.js";

// GET
const response = await apiClient.get("/accounts");

// POST
const response = await apiClient.post("/trades/execute", {
  symbol: "EURUSD",
  stake: 10
});

// PUT/PATCH
const response = await apiClient.patch("/users/profile", {
  email: "new@example.com"
});

// DELETE
const response = await apiClient.delete("/accounts/123");
```

## Authentication Flow

### Email/Password Login

```jsx
const { login } = useAuth();

const result = await login("username", "password");
// {success: true, user: {...}} or {success: false, error: "..."}
```

### Email/Password Signup (with referral)

```jsx
const { signup } = useAuth();

const result = await signup("username", "email@example.com", "password", "dangote_fx");
// dangote_fx is optional affiliate code
```

### Deriv OAuth

1. User clicks "Continue with Deriv" button
2. Frontend redirects to Deriv authorization page
3. User authorizes in Deriv
4. Deriv redirects to `http://localhost:5173/oauth/callback?code=XXX&state=nexus`
5. Frontend exchanges code for JWT token
6. User is logged in and redirected to dashboard

```jsx
const { getDerivAuthUrl, handleDerivCallback } = useAuth();

// Get Deriv OAuth URL
const result = await getDerivAuthUrl();
window.location.href = result.url;

// Handle callback (automatic in OAuthCallbackPage)
const result = await handleDerivCallback(code, state);
```

## WebSocket Integration

### Connect to WebSocket

```jsx
const { connected, onMessage, sendMessage } = useWebSocket();

if (!connected) {
  return <div>Connecting...</div>;
}
```

### Listen for Messages

```jsx
// Subscribe to specific message type
const unsubscribe = onMessage("tick", (tick) => {
  console.log("Price update:", tick);
});

// Unsubscribe
unsubscribe();
```

### Send Messages

```jsx
// Send execute command
wsManager.send("execute", {
  symbol: "EURUSD",
  type: "CALL",
  stake: 10
});
```

## Error Handling

All errors are automatically caught and can be handled:

```jsx
import { handleAPIError } from "@/core/api/errorHandler.js";

try {
  const response = await apiClient.get("/accounts");
} catch (error) {
  const handled = handleAPIError(error);
  console.error(handled.message);
}
```

## State Management

### Global Auth State

```jsx
import { useAuth } from "@/providers/AuthProvider.jsx";

const { user, isAuthenticated, login, logout } = useAuth();
```

### WebSocket State

```jsx
import { useWebSocket } from "@/providers/WSProvider.jsx";

const { connected, onMessage, sendMessage } = useWebSocket();
```

### Local Storage

```jsx
import { useLocalStorage } from "@/hooks/useApi.js";

const [value, setValue] = useLocalStorage("key", defaultValue);
```

## Styling

Frontend uses **Tailwind CSS** for styling. Configure in `tailwind.config.js`:

```js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: { /* Dark theme */ }
      }
    }
  }
};
```

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Environment Variables

Create `.env` file (copy from `.env.example`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:8000/api/v1`) |
| `VITE_WS_URL` | WebSocket base URL (e.g., `ws://localhost:8000/ws`) |
| `VITE_DERIV_APP_ID` | Deriv OAuth app ID |
| `VITE_ENVIRONMENT` | Environment (development/production) |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Common Issues

### Token Refresh Errors

The `apiClient` automatically handles token refresh on 401 responses. If token refresh fails:
1. User is redirected to login
2. Previous tokens are cleared from localStorage
3. New authentication is required

### WebSocket Connection Issues

The `wsManager` automatically reconnects on disconnect with exponential backoff:
1. Initial retry: 5 seconds
2. Max retries: 10 attempts
3. Heartbeat: Every 30 seconds

### CORS Errors

Ensure backend has CORS properly configured in FastAPI:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Next Steps

1. **Create Chart Component**: Use TradingView Lightweight Charts for candlestick viewing
2. **Create Accounts Page**: List and manage accounts
3. **Create Profile Page**: User profile and settings
4. **Create Affiliate Page**: Show referral stats and code
5. **Integration Testing**: Test OAuth flow end-to-end
6. **Docker Deployment**: Create Docker container and docker-compose setup

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [MDN Web Docs - WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
