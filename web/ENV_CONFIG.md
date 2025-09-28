# Environment Configuration

## API URL Configuration

The frontend automatically uses different API URLs based on the environment:

### Development Mode
- **Default URL**: `http://localhost:8080`
- **How to run**: `npm run dev`
- The dev script automatically sets `NEXT_PUBLIC_API_URL=http://localhost:8080`

### Production Mode
- **Default URL**: `https://api.oxylize.com`
- **How to build**: `npm run build:prod` (sets production API URL)
- **Alternative build**: `npm run build` (uses fallback logic)

### Custom API URL
You can override the API URL by setting the `NEXT_PUBLIC_API_URL` environment variable:

```bash
# For development with custom URL
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev

# For production with custom URL  
NEXT_PUBLIC_API_URL=https://your-api.com npm run build
```

## Fallback Logic
If no `NEXT_PUBLIC_API_URL` is set, the app will:
1. Use `http://localhost:8080` in development mode
2. Use `https://api.oxylize.com` in production mode

This configuration affects:
- HTTP API calls (`src/lib/api.ts`)
- WebSocket connections (`src/hooks/use-chat.ts`)
