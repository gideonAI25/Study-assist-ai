require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { generateStudyGuide, answerFollowUp, resolveApiConfig } = require('./ai-service');
const { generateToken, requireAuth } = require('./auth');
const {
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  getUserGuides,
  saveUserGuide,
  deleteUserGuide,
  clearUserGuides
} = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ==========================================================================
   AUTHENTICATION ROUTES (JWT)
   ========================================================================== */

// Helper to strip sensitive fields from user object
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    // Validation: Username
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 2 characters long.'
      });
    }

    // Validation: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    // Validation: Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate email
    if (getUserByEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please sign in.'
      });
    }

    // Check duplicate username
    if (getUserByUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'This username is already taken. Please choose another.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = createUser({
      username,
      email,
      passwordHash
    });

    // Generate JWT token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully!'
    });
  } catch (err) {
    console.error('Error during sign up:', err);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred during sign up. Please try again.'
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Signed in successfully!'
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred during login. Please try again.'
    });
  }
});

// GET /api/auth/me (Get current authenticated user)
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found.'
    });
  }
  res.json({
    success: true,
    user: sanitizeUser(user)
  });
});

/* ==========================================================================
   USER SAVED GUIDES ROUTES (JWT Protected)
   ========================================================================== */

// GET /api/user/guides
app.get('/api/user/guides', requireAuth, (req, res) => {
  const guides = getUserGuides(req.user.id);
  res.json({
    success: true,
    guides
  });
});

// DELETE /api/user/guides/:id
app.delete('/api/user/guides/:id', requireAuth, (req, res) => {
  const success = deleteUserGuide(req.user.id, req.params.id);
  res.json({
    success,
    message: success ? 'Study guide deleted.' : 'Guide not found.'
  });
});

// DELETE /api/user/guides
app.delete('/api/user/guides', requireAuth, (req, res) => {
  clearUserGuides(req.user.id);
  res.json({
    success: true,
    message: 'All study guides cleared.'
  });
});

/* ==========================================================================
   AI STUDY ASSISTANT ROUTES (JWT Protected)
   ========================================================================== */

// API Configuration endpoint
app.get('/api/config', (req, res) => {
  const customHeaders = {
    'x-gemini-key': req.headers['x-gemini-key'],
    'x-openai-key': req.headers['x-openai-key']
  };
  const activeConfig = resolveApiConfig(customHeaders);
  
  res.json({
    status: 'ok',
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasServerOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    activeProvider: activeConfig.provider,
    activeModel: activeConfig.model
  });
});

// API: Generate Study Guide (Requires Auth)
app.post('/api/study-guide', requireAuth, async (req, res) => {
  try {
    const { topic, difficulty } = req.body || {};
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required. Please provide a topic you want to study.'
      });
    }

    if (topic.trim().length > 300) {
      return res.status(400).json({
        success: false,
        error: 'Topic is too long. Please keep topics under 300 characters.'
      });
    }

    const customHeaders = {
      'x-gemini-key': req.headers['x-gemini-key'],
      'x-openai-key': req.headers['x-openai-key']
    };

    const result = await generateStudyGuide({
      topic: topic.trim(),
      difficulty,
      customHeaders
    });

    // Automatically save to user's guides
    const saved = saveUserGuide(req.user.id, {
      topic: topic.trim(),
      difficulty: result.difficulty,
      studyGuide: result.studyGuide,
      provider: result.provider,
      model: result.model
    });

    res.json({
      success: true,
      ...result,
      guideId: saved?.id
    });
  } catch (error) {
    console.error('Error generating study guide:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate study guide.'
    });
  }
});

// API: Follow-up question (Requires Auth)
app.post('/api/follow-up', requireAuth, async (req, res) => {
  try {
    const { topic, difficulty, question, guideContext, history } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required for follow-up.'
      });
    }

    if (question.trim().length > 1500) {
      return res.status(400).json({
        success: false,
        error: 'Question is too long. Please keep questions under 1500 characters.'
      });
    }

    const customHeaders = {
      'x-gemini-key': req.headers['x-gemini-key'],
      'x-openai-key': req.headers['x-openai-key']
    };

    const result = await answerFollowUp({
      topic: (topic && typeof topic === 'string') ? topic.trim() : 'General Study',
      difficulty: difficulty || 'Intermediate',
      question: question.trim(),
      guideContext: (guideContext && typeof guideContext === 'string') ? guideContext : '',
      history: Array.isArray(history) ? history : [],
      customHeaders
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error answering follow-up question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to answer follow-up question.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Fallback to index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎓 AI Study Assistant running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini Live' : process.env.OPENAI_API_KEY ? 'OpenAI Live' : 'Smart Built-in Educational Engine'}`);
  console.log(`   Auth: Custom JWT Authentication Active`);
  console.log(`===============================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use by another instance.`);
    console.error(`   To free port ${PORT}, run this command in PowerShell:`);
    console.error(`   Get-Process -Name node | Stop-Process -Force`);
    console.error(`   Or change the port in your .env file: PORT=3001\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
