# FitFlow Backend

Backend API for FitFlow AI Fitness Trainer application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your credentials:
```env
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your-database
AZURE_SQL_USER=your-username
AZURE_SQL_PASSWORD=your-password
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

3. Run database setup:
```bash
npm run setup-db
```

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/signup` - User registration
- `POST /api/login` - User authentication
- `POST /api/workouts` - Record workout (requires auth)
- `GET /api/heatmap/:userId` - Get workout heatmap data (requires auth)
- `GET /api/user-stats/:userId` - Get user statistics (requires auth)
- `GET /api/health` - Health check
