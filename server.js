require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateStudyGuide, answerFollowUp, resolveApiConfig } = require('./ai-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

// API: Generate Study Guide
app.post('/api/study-guide', async (req, res) => {
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

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error generating study guide:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate study guide.'
    });
  }
});

// API: Follow-up question
app.post('/api/follow-up', async (req, res) => {
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
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎓 AI Study Assistant running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini Live' : process.env.OPENAI_API_KEY ? 'OpenAI Live' : 'Smart Built-in Educational Engine'}`);
  console.log(`===============================================`);
});
