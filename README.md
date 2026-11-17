# 🎓 StudyMind AI - AI Study Assistant for Students

An intelligent, lightweight study assistant built with **Node.js** and **Express**. It helps students master any topic by generating structured, concise study guides tailored to their chosen difficulty level, followed by an interactive AI tutor for follow-up questions.

---

## 🌟 Key Features

1. **Topic Input with Quick Inspiration**:
   - Enter any academic topic (e.g., *Binary Search Trees, Photosynthesis, Quantum Superposition, Keynesian Economics*).
   - Quick one-click suggestion chips to get started immediately.
2. **Three Calibrated Difficulty Levels**:
   - 🌱 **Beginner**: Focuses on foundational concepts, plain language, and everyday analogies.
   - 🚀 **Intermediate**: Covers mechanisms, standard terminology, practical workflows, and real-world examples.
   - 🧠 **Advanced**: Dives into deep theoretical rigor, mathematical/architectural depth, performance trade-offs, and edge cases.
3. **Structured & Concise Study Guides**:
   - Generates clean, 5-part study guides designed for quick 5-10 minute mastery:
     1. 📌 **Executive Overview**
     2. 🔑 **Core Concepts & Key Terms**
     3. 💡 **Illustrative Example / Code Walkthrough**
     4. 🧠 **Quick Knowledge Check** (Self-test questions with answers)
     5. 🚀 **Actionable Next Steps**
4. **Interactive Follow-up Q&A**:
   - Ask clarifying follow-up questions directly below the guide.
   - Preserves topic and study guide context across conversation turns.
   - Quick starter prompt suggestions (*"Another analogy"*, *"Common mistakes"*, *"Practice problem"*).
5. **Multi-Engine AI Integration**:
   - **Google Gemini API** (e.g. `gemini-2.5-flash`, `gemini-1.5-flash`).
   - **OpenAI API** (`gpt-4o-mini`, `gpt-3.5-turbo`).
   - **Smart Built-in Educational Engine**: Delivers realistic, high-quality, structured guides and follow-up answers immediately out-of-the-box even without an API key or when offline!
6. **Custom JWT Authentication & User Profiles**:
   - 🔐 **Sign Up & Sign In**: Secure user authentication with `bcryptjs` password hashing and signed JSON Web Tokens (JWT).
   - 👤 **Navbar Profile Avatar**: Displays user initials, gradient avatar, username, and account dropdown menu.
   - ☁️ **Account-Synced Study History**: Saved study guides are automatically persisted and linked to the user's account.
   - 🛡️ **Protected AI Endpoints**: Ensures study guides and follow-up Q&A are tied to authentic student accounts.
7. **Student Utility Tools**:
   - 📋 **Copy to Clipboard**
   - 💾 **Download as Markdown (.md)**
   - 🖨️ **Print / Save as PDF**
   - 🕒 **Saved Study Guides History**
   - 🌓 **Dark / Light Mode Toggle** (with system preference auto-detection)

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended, tested on Node v24)
- **npm**

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
```bash
npm start
```
Or for auto-reloading development mode:
```bash
npm run dev
```

### 4. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## ⚙️ Configuration & AI API Keys (Optional)

The application works **100% out of the box** using the built-in educational engine. To enable live generative AI from Google Gemini or OpenAI:

### Option A: Via `.env` File
Create or update the `.env` file in the project root:
```env
PORT=3000

# Google Gemini (Recommended - Free keys at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Optional: OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Option B: Directly from the Web Interface
1. Click the **Engine Status** pill in the top-right corner of the navbar.
2. Enter your Gemini or OpenAI API key in the modal.
3. Click **Save Settings** (keys are saved securely in your browser's local session).

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new account (`username`, `email`, `password`) |
| `POST` | `/api/auth/login` | Sign in with `email` and `password`, returns JWT |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile |

### AI Study Assistant (Requires JWT `Bearer` token)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/study-guide` | Generates a concise study guide & saves to user account |
| `POST` | `/api/follow-up` | Answers a student's follow-up question in context |
| `GET` | `/api/user/guides` | Retrieve user's saved study guides |
| `DELETE`| `/api/user/guides/:id` | Delete a specific saved study guide |
| `GET` | `/api/config` | Returns active engine configuration and status |
| `GET` | `/api/health` | Service health check |

---

## 📂 Project Structure

```
├── server.js              # Lightweight Express application server
├── auth.js                # JWT token signing, verification & auth middleware
├── storage.js             # Local JSON file database (users & guides)
├── ai-service.js          # Unified AI service (Gemini, OpenAI & Offline Engine)
├── package.json           # Dependencies and scripts
├── .env.example           # Environment template
├── .env                   # Environment variables (local secrets)
├── data/                  # Local user accounts & saved guides (git-ignored)
├── public/                # Frontend assets
│   ├── index.html         # Semantic HTML5 layout with Auth modal & Avatar
│   ├── style.css          # Modern light/dark styling & auth components
│   └── app.js             # Client application logic & JWT auth state
└── README.md              # Project documentation
```

