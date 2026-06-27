CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_price_inr INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE mcq_questions (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option VARCHAR(1) NOT NULL,
  explanation TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_interview BOOLEAN NOT NULL DEFAULT FALSE,
  company VARCHAR(120) NOT NULL DEFAULT '',
  topic VARCHAR(160) NOT NULL DEFAULT ''
);

CREATE TABLE coding_questions (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  title VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  constraints TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  solution_code TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_interview BOOLEAN NOT NULL DEFAULT FALSE,
  company VARCHAR(120) NOT NULL DEFAULT '',
  topic VARCHAR(160) NOT NULL DEFAULT '',
  test_cases TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE tutorials (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  topic VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  reading_minutes INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  display_name VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subject_id INTEGER REFERENCES subjects(id),
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score_percent INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE coding_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  coding_question_id INTEGER NOT NULL REFERENCES coding_questions(id),
  tests_total INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  all_passed BOOLEAN NOT NULL DEFAULT FALSE,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subject_notes (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  topic VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL
);

CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mcq_question_id INTEGER REFERENCES mcq_questions(id),
  coding_question_id INTEGER REFERENCES coding_questions(id),
  submitted_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider_subscription_id VARCHAR(150) UNIQUE NOT NULL,
  valid_until TIMESTAMP NOT NULL
);

CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  certificate_url VARCHAR(500) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW()
);
