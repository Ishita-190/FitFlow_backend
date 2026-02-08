-- Users table for authentication
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Workout sessions table
CREATE TABLE WorkoutSessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(id),
    workout_date DATE NOT NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2,
    duration_minutes INT,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Exercise types table
CREATE TABLE ExerciseTypes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    description NVARCHAR(500)
);

-- Individual exercises within workout sessions
CREATE TABLE WorkoutExercises (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT FOREIGN KEY REFERENCES WorkoutSessions(id),
    exercise_type_id INT FOREIGN KEY REFERENCES ExerciseTypes(id),
    sets INT,
    reps INT,
    duration_seconds INT,
    notes NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Daily activity summary for heatmap
CREATE TABLE DailyActivity (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(id),
    activity_date DATE NOT NULL,
    workout_count INT DEFAULT 0,
    total_duration_minutes INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    UNIQUE(user_id, activity_date)
);

-- Insert default exercise types
INSERT INTO ExerciseTypes (name, category, description) VALUES
('Bicep Curl', 'Upper Body', 'Arm strengthening exercise'),
('Squats', 'Lower Body', 'Leg and glute strengthening'),
('Shoulder Press', 'Upper Body', 'Shoulder and arm strengthening'),
('Push-ups', 'Upper Body', 'Chest and arm strengthening'),
('Planks', 'Core', 'Core stability exercise'),
('Lunges', 'Lower Body', 'Leg strengthening and balance');