/**
 * Local File-based JSON Storage
 * Stores user profiles, credentials (hashed), and user-specific study guides
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GUIDES_FILE = path.join(DATA_DIR, 'guides.json');

// Ensure data directory and files exist
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
  if (!fs.existsSync(GUIDES_FILE)) {
    fs.writeFileSync(GUIDES_FILE, JSON.stringify([]), 'utf-8');
  }
}

// Read JSON helper
function readJson(filePath) {
  try {
    initStorage();
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

// Write JSON helper
function writeJson(filePath, data) {
  try {
    initStorage();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Predefined avatar gradient colors
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #0ea5e9, #2563eb)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #14b8a6, #0284c7)'
];

function getRandomGradient() {
  const index = Math.floor(Math.random() * AVATAR_GRADIENTS.length);
  return AVATAR_GRADIENTS[index];
}

/* ==================== USER OPERATIONS ==================== */

function getUsers() {
  return readJson(USERS_FILE);
}

function getUserByEmail(email) {
  if (!email) return null;
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
}

function getUserByUsername(username) {
  if (!username) return null;
  const users = getUsers();
  return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
}

function getUserById(id) {
  if (!id) return null;
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function createUser({ username, email, passwordHash }) {
  const users = getUsers();
  const newUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    avatarColor: getRandomGradient(),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);
  return newUser;
}

/* ==================== GUIDE OPERATIONS ==================== */

function getGuides() {
  return readJson(GUIDES_FILE);
}

function getUserGuides(userId) {
  if (!userId) return [];
  const guides = getGuides();
  return guides
    .filter(g => g.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function saveUserGuide(userId, guideData) {
  if (!userId) return null;
  const guides = getGuides();

  const newGuide = {
    id: crypto.randomUUID(),
    userId,
    topic: guideData.topic,
    difficulty: guideData.difficulty,
    studyGuide: guideData.studyGuide,
    provider: guideData.provider || 'gemini',
    model: guideData.model || '',
    createdAt: new Date().toISOString()
  };

  // Remove existing entry for exact same topic & difficulty to avoid clutter
  const filtered = guides.filter(g => !(g.userId === userId && g.topic.toLowerCase() === guideData.topic.toLowerCase() && g.difficulty === guideData.difficulty));
  filtered.unshift(newGuide);

  writeJson(GUIDES_FILE, filtered);
  return newGuide;
}

function deleteUserGuide(userId, guideId) {
  if (!userId || !guideId) return false;
  const guides = getGuides();
  const filtered = guides.filter(g => !(g.userId === userId && g.id === guideId));
  writeJson(GUIDES_FILE, filtered);
  return true;
}

function clearUserGuides(userId) {
  if (!userId) return false;
  const guides = getGuides();
  const filtered = guides.filter(g => g.userId !== userId);
  writeJson(GUIDES_FILE, filtered);
  return true;
}

module.exports = {
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  getUserGuides,
  saveUserGuide,
  deleteUserGuide,
  clearUserGuides
};
