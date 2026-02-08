import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, sql } from './database.js';

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const request = new sql.Request();
    await request
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .query(
        'INSERT INTO Users (name, email, password_hash) VALUES (@name, @email, @password_hash)'
      );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    console.error('Signup error:', error);
    console.error('Error details:', {
      message: error.message,
      number: error.number,
      code: error.code,
      state: error.state,
      class: error.class,
      lineNumber: error.lineNumber,
      serverName: error.serverName,
      procName: error.procName
    });
    
    if (error.number === 2627 || error.message?.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Email already exists' });
    } else if (error.number === 208 || error.message?.includes('Invalid object name')) {
      res.status(503).json({ error: 'Database not set up. Run schema.sql.' });
    } else {
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const request = new sql.Request();
    const result = await request
      .input('email', sql.NVarChar, email)
      .query(
        'SELECT id, name, email, password_hash FROM Users WHERE email = @email'
      );

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Workout routes
app.post('/api/workouts', authenticateToken, async (req: any, res) => {
  try {
    const { exercises, duration } = req.body;
    const userId = req.user.userId;
    const workoutDate = new Date().toISOString().split('T')[0];

    const request = new sql.Request();
    const sessionResult = await request
      .input('user_id', sql.Int, userId)
      .input('workout_date', sql.Date, workoutDate)
      .input('start_time', sql.DateTime2, new Date())
      .input('duration_minutes', sql.Int, duration)
      .query(`
        INSERT INTO WorkoutSessions (user_id, workout_date, start_time, duration_minutes)
        OUTPUT INSERTED.id
        VALUES (@user_id, @workout_date, @start_time, @duration_minutes)
      `);

    const sessionId = sessionResult.recordset[0].id;

    for (const exercise of exercises) {
      await new sql.Request()
        .input('session_id', sql.Int, sessionId)
        .input('exercise_name', sql.NVarChar, exercise.name)
        .input('sets', sql.Int, exercise.sets || 0)
        .input('reps', sql.Int, exercise.reps || 0)
        .input('duration_seconds', sql.Int, exercise.duration || 0)
        .query(`
          INSERT INTO WorkoutExercises (session_id, exercise_type_id, sets, reps, duration_seconds)
          SELECT @session_id, id, @sets, @reps, @duration_seconds
          FROM ExerciseTypes WHERE name = @exercise_name
        `);
    }

    // Update DailyActivity for heatmap
    await new sql.Request()
      .input('user_id', sql.Int, userId)
      .input('activity_date', sql.Date, workoutDate)
      .input('duration_minutes', sql.Int, duration)
      .query(`
        IF EXISTS (SELECT 1 FROM DailyActivity WHERE user_id = @user_id AND activity_date = @activity_date)
          UPDATE DailyActivity 
          SET workout_count = workout_count + 1, 
              total_duration_minutes = total_duration_minutes + @duration_minutes
          WHERE user_id = @user_id AND activity_date = @activity_date
        ELSE
          INSERT INTO DailyActivity (user_id, activity_date, workout_count, total_duration_minutes)
          VALUES (@user_id, @activity_date, 1, @duration_minutes)
      `);

    res.status(201).json({ message: 'Workout recorded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/heatmap/:userId', authenticateToken, async (req: any, res) => {
  try {
    const request = new sql.Request();
    const result = await request
      .input('user_id', sql.Int, req.params.userId)
      .query(`
        SELECT activity_date, workout_count
        FROM DailyActivity
        WHERE user_id = @user_id
        ORDER BY activity_date
      `);

    res.json(result.recordset);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user-stats/:userId', authenticateToken, async (req: any, res) => {
  try {
    const request = new sql.Request();
    const result = await request
      .input('user_id', sql.Int, req.params.userId)
      .query(`
        SELECT COUNT(*) AS totalWorkouts
        FROM WorkoutSessions
        WHERE user_id = @user_id
      `);

    res.json(result.recordset[0] || { totalWorkouts: 0 });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (_, res) => {
  res.send('AI Fitness Trainer Backend is running');
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/test', (_, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// 🚀 Azure-safe startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  connectDB().catch(err => {
    console.error('Database connection error:', err);
  });
});
