/**
 * AI Service for AI Study Assistant
 * Supports:
 * 1. Google Gemini API (gemini-2.5-flash, gemini-1.5-flash, gemini-2.0-flash)
 * 2. OpenAI API (gpt-4o-mini, gpt-3.5-turbo)
 * 3. Smart Built-in Educational Engine (high-quality offline / demo fallback)
 */

const https = require('https');

/**
 * Robust JSON POST helper using Node.js core https
 * Prevents ECONNRESET issues commonly encountered with undici/fetch on Windows
 */
function postJson(urlString, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const bodyStr = JSON.stringify(payload);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...extraHeaders
        },
        timeout: 30000 // 30s timeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, ok: false, data: { error: { message: data || 'Invalid JSON response from API' } } });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out after 30 seconds'));
      });

      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Helper to determine active provider and key
function resolveApiConfig(customHeaders = {}) {
  const geminiKey = (customHeaders['x-gemini-key'] || process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (customHeaders['x-openai-key'] || process.env.OPENAI_API_KEY || '').trim();

  if (geminiKey) {
    return { provider: 'gemini', key: geminiKey, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash' };
  }
  if (openaiKey) {
    return { provider: 'openai', key: openaiKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
  }
  return { provider: 'offline', key: null, model: 'smart-offline-engine' };
}

/**
 * Call Google Gemini API
 */
async function callGemini(apiKey, model, systemPrompt, userPrompt) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is missing or empty.');
  }

  // Use high-availability Gemini models with fast fallback
  const modelsToTry = [model, 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter(Boolean);
  let lastError = null;

  for (const m of Array.from(new Set(modelsToTry))) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      };

      // Models without "lite" support thinkingBudget: 0 for instant responses
      if (!m.includes('lite')) {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      let res = await postJson(url, payload);
      let data = res.data;

      // If invalid argument due to thinkingConfig, retry without thinkingConfig
      if (!res.ok && payload.generationConfig.thinkingConfig && data.error?.message?.includes('invalid argument')) {
        delete payload.generationConfig.thinkingConfig;
        res = await postJson(url, payload);
        data = res.data;
      }

      if (!res.ok) {
        throw new Error(data.error?.message || `Gemini API returned status ${res.status}`);
      }

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const text = parts.map(p => p.text || '').join('');

      if (text && text.trim()) {
        return { text: text.trim(), modelUsed: m, provider: 'gemini' };
      }

      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Gemini response stopped with reason: ${candidate.finishReason}`);
      }

      throw new Error('No candidate content returned by Gemini API');
    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes('API_KEY_INVALID')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini API');
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey, model, systemPrompt, messages) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const payload = {
    model: model || 'gpt-4o-mini',
    messages: chatMessages,
    temperature: 0.7,
    max_tokens: 2048
  };

  const res = await postJson(url, payload, {
    'Authorization': `Bearer ${apiKey.trim()}`
  });

  const data = res.data;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI API returned status ${res.status}`);
  }

  const text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error('OpenAI returned an empty response.');
  }

  return {
    text: text.trim(),
    modelUsed: model,
    provider: 'openai'
  };
}

/**
 * Smart Built-in Fallback Generator
 * Delivers detailed, realistic, curriculum-aligned study guides and follow-up answers
 * when no API key is provided or offline.
 */
function generateOfflineStudyGuide(topic, difficulty) {
  const diffLower = difficulty.toLowerCase();
  const titleTopic = topic.trim();

  // Custom tone & depth guidance based on difficulty
  let depthDescription = '';
  let conceptsList = '';
  let exampleSection = '';
  let questionsSection = '';
  let nextSteps = '';

  if (diffLower === 'beginner') {
    depthDescription = `This guide covers the fundamental ideas behind **${titleTopic}** using clear, approachable explanations, everyday analogies, and zero unnecessary jargon. Perfect for establishing a solid foundation.`;
    conceptsList = `- **The Core Definition**: What **${titleTopic}** actually means in simple terms and why it exists.
- **The "Big Picture" Purpose**: How it solves problems in the real world or in its field.
- **Essential Building Blocks**: The primary vocabulary and 3 main components you need to recognize.
- **Common Misconceptions**: Things beginners often confuse when starting with ${titleTopic}.`;
    exampleSection = `#### 🍎 Everyday Analogy
Think of **${titleTopic}** like an everyday system (such as an organized kitchen or a traffic intersection):
- Every part has a designated role.
- Input goes in, processes occur systematically, and expected output comes out.
- Keeping it simple prevents overload and errors.

*Takeaway:* Don't worry about edge cases yet—master how the basic pieces communicate first!`;
    questionsSection = `1. **Question:** In your own words, what is the main goal of ${titleTopic}?
   *Answer:* It provides a structured approach to solving specific challenges by breaking them into manageable components.
2. **Question:** What is one essential piece or rule you must remember about ${titleTopic}?
   *Answer:* The foundational requirement that governs how inputs are handled and validated.`;
    nextSteps = `1. Write out the definition of **${titleTopic}** in your own words without checking notes.
2. Teach the concept to a friend or classmate using the everyday analogy above.
3. Review one practical beginner exercise or starter example.`;
  } else if (diffLower === 'advanced') {
    depthDescription = `An in-depth, rigorous breakdown of **${titleTopic}** focusing on mathematical/architectural underpinnings, optimization trade-offs, theoretical limits, and production-grade edge cases.`;
    conceptsList = `- **Formal Theoretical Mechanics**: The mathematical models, internal data representations, or protocol-level invariants of **${titleTopic}**.
- **Complexity & Optimization Boundaries**: Algorithmic complexity ($O(n)$ bounds), memory overhead, cache coherence, or resource saturation points.
- **Failure Modes & Edge Cases**: High-concurrency contention, race conditions, distribution anomalies, or boundary drift.
- **Architectural Trade-offs**: When *not* to use this approach vs. modern alternatives and comparative benchmarks.`;
    exampleSection = `#### ⚙️ Technical Deep-Dive & Architecture
When engineering with **${titleTopic}** at scale:
\`\`\`
Client / Input ──> [ Boundary Invariant Validator ] ──> [ Core Engine ] ──> [ Optimized State Sink ]
\`\`\`
- **Invariant Guarantee:** Ensure state mutations remain idempotent under concurrent load.
- **Latency vs. Throughput:** Balancing batch sizes and pipeline depth to minimize P99 latency.`;
    questionsSection = `1. **Question:** How does ${titleTopic} behave under extreme boundary conditions or high load?
   *Answer:* Performance degrades predictably according to its asymptotic constraints unless specialized mitigation (caching, sharding, or backpressure) is applied.
2. **Question:** What is the primary architectural trade-off introduced when adopting ${titleTopic}?
   *Answer:* Increased operational complexity and strict invariant maintenance in exchange for higher throughput or expressiveness.`;
    nextSteps = `1. Analyze the source code or formal specification for standard implementations of ${titleTopic}.
2. Benchmark performance bottlenecks under adverse synthetic workloads.
3. Formulate a defense against its most critical failure modes.`;
  } else {
    // Intermediate (default)
    depthDescription = `A comprehensive exploration of **${titleTopic}** bridging core theory with practical application, mechanics, patterns, and best practices.`;
    conceptsList = `- **Core Mechanics & Workflow**: Exactly how **${titleTopic}** operates step-by-step in practice.
- **Key Terminology & Components**: The standard industry/academic terms and their operational roles.
- **Typical Use Cases**: Where and why professionals implement ${titleTopic} over simpler or legacy approaches.
- **Best Practices & Pitfalls**: Standard conventions to follow and mistakes to avoid.`;
    exampleSection = `#### 💡 Practical Scenario
Imagine implementing **${titleTopic}** in a real project:
1. **Setup / Initialization**: Establish baseline parameters and clean data structures.
2. **Execution Flow**: Process standard scenarios while handling expected variations.
3. **Verification**: Confirm results meet expected criteria and performance standards.`;
    questionsSection = `1. **Question:** Why would you choose ${titleTopic} over a basic manual solution?
   *Answer:* It offers standardized efficiency, repeatability, and maintainability across diverse scenarios.
2. **Question:** What is a common mistake when applying ${titleTopic}?
   *Answer:* Skipping proper boundary validation or failing to account for edge inputs.`;
    nextSteps = `1. Build a mini-project or solve 3 targeted exercises applying ${titleTopic}.
2. Compare two different implementations or case studies.
3. Test your knowledge by predicting outcomes for edge cases.`;
  }

  return `### 📚 Study Guide: ${titleTopic}
**Level:** \`${difficulty.toUpperCase()}\` | **Estimated Study Time:** 15-20 Mins

---

### 1. 📌 Executive Overview
${depthDescription}

---

### 2. 🔑 Core Concepts & Key Terminology
${conceptsList}

---

### 3. 💡 Illustrative Example & Walkthrough
${exampleSection}

---

### 4. 🧠 Quick Knowledge Check
${questionsSection}

---

### 5. 🚀 Actionable Next Steps
${nextSteps}

---
> 💡 *Note: You are viewing an offline study guide. For real-time generative AI answers powered by Google Gemini or OpenAI, you can configure your API key in the top settings!*`;
}

/**
 * Smart Built-in Fallback for Follow-Up Questions
 */
function generateOfflineFollowUp(topic, difficulty, question, guideContext) {
  const qClean = question.trim();
  const lowerQ = qClean.toLowerCase();

  let answerFocus = '';
  if (lowerQ.includes('analogy') || lowerQ.includes('simple') || lowerQ.includes('explain like')) {
    answerFocus = `Here is another intuitive way to picture **${topic}**:\n\nImagine an orchestra where each musician plays a specific role. Without a conductor and sheet music, you get noise. **${topic}** is like that sheet music: it provides the structure, rules, and synchronization so that every component produces harmonious, predictable results.`;
  } else if (lowerQ.includes('mistake') || lowerQ.includes('error') || lowerQ.includes('wrong') || lowerQ.includes('pitfall')) {
    answerFocus = `Here are the top pitfalls students encounter with **${topic}** (${difficulty} level):\n1. **Rushing through fundamentals**: Trying to tackle complex applications before grasping the core mechanics.\n2. **Ignoring edge conditions**: Assuming ideal conditions and forgetting invalid inputs or boundary cases.\n3. **Passive reading instead of active recall**: The best way to cement ${topic} is to explain it or code/write it out yourself.`;
  } else if (lowerQ.includes('practice') || lowerQ.includes('problem') || lowerQ.includes('exercise') || lowerQ.includes('quiz')) {
    answerFocus = `Here is a targeted practice challenge on **${topic}** for the **${difficulty}** level:\n\n**Challenge:**\nSuppose you are asked to apply **${topic}** to a fresh dataset or scenario. Describe the first three sequential decisions you must make before executing the core process, and explain why each decision matters.\n\n*Hint:* Focus on requirements, constraints, and verification!`;
  } else if (lowerQ.includes('example') || lowerQ.includes('code') || lowerQ.includes('how to')) {
    answerFocus = `Here is a step-by-step breakdown illustrating your question about **${topic}**:\n\n- **Step 1 (Input/Preparation):** Define the starting state and verify preconditions.\n- **Step 2 (Transformation/Action):** Execute the core rule of ${topic}.\n- **Step 3 (Evaluation/Output):** Measure the output against expected results and verify correctness.\n\nApplying this step-by-step flow eliminates confusion and ensures consistency.`;
  } else {
    answerFocus = `Regarding your question: *"**${qClean}**"*\n\nIn the context of **${topic}** at the **${difficulty}** level, the key insight is to look at how this connects to the core principles we outlined in your study guide.\n\n- **Direct Answer:** When considering ${qClean.replace(/\?/g, '')}, keep in mind that the system relies on predefined invariants. Any variation must adhere to the underlying framework of ${topic}.\n- **Why this matters:** In real-world applications, understanding this nuance separates surface-level memorization from true mastery.\n- **Quick Tip:** Try connecting this directly back to Section 2 of your study guide!`;
  }

  return `#### 🎓 AI Tutor Response
${answerFocus}

---
*Feel free to ask another follow-up question or explore a specific detail!*`;
}

/**
 * Generate Study Guide
 */
async function generateStudyGuide({ topic, difficulty, customHeaders = {} }) {
  if (!topic || !topic.trim()) {
    throw new Error('A topic is required to generate a study guide.');
  }

  const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
  const diff = validDifficulties.find(d => d.toLowerCase() === (difficulty || '').toLowerCase()) || 'Intermediate';

  const config = resolveApiConfig(customHeaders);

  const systemPrompt = `You are an elite, highly pedagogically skilled AI Study Assistant for students.
Your mission is to produce a concise, structured, engaging, and easy-to-digest study guide for the specified topic and difficulty level.

Formatting Guidelines:
- Use clean Markdown with headers (###), bold text, bullet points, and code blocks if relevant.
- Structure the study guide strictly into these 5 clear sections:
  1. 📌 Executive Overview (2-3 concise sentences summarizing what it is and why it matters)
  2. 🔑 Core Concepts & Key Terms (3-5 bullet points calibrated precisely to the selected difficulty level)
  3. 💡 Illustrative Example & Walkthrough (an intuitive analogy or practical real-world example/code block)
  4. 🧠 Quick Knowledge Check (2-3 self-test questions with concise answers)
  5. 🚀 Actionable Next Steps (2-3 concrete activities to cement learning)

Difficulty Calibration:
- Beginner: Zero unnecessary jargon, simple everyday analogies, foundational mechanics.
- Intermediate: Standard industry/academic terminology, workflow mechanics, practical applications and trade-offs.
- Advanced: Deep theoretical/mathematical rigor, internal invariants, performance limits, edge cases, and architectural trade-offs.

Keep the guide concise, impactful, and easy to review in 5-10 minutes. Avoid fluff.`;

  const userPrompt = `Topic: "${topic.trim()}"
Difficulty Level: ${diff}

Please generate the concise study guide now.`;

  // Try live API if configured
  if (config.provider === 'gemini') {
    try {
      const res = await callGemini(config.key, config.model, systemPrompt, userPrompt);
      return {
        studyGuide: res.text,
        provider: 'gemini',
        model: res.modelUsed,
        topic: topic.trim(),
        difficulty: diff
      };
    } catch (err) {
      console.warn(`[Gemini API Warning] ${err.message}. Falling back to smart built-in engine.`);
      // If error, fall through to offline engine but include note
    }
  } else if (config.provider === 'openai') {
    try {
      const res = await callOpenAI(config.key, config.model, systemPrompt, [{ role: 'user', content: userPrompt }]);
      return {
        studyGuide: res.text,
        provider: 'openai',
        model: res.modelUsed,
        topic: topic.trim(),
        difficulty: diff
      };
    } catch (err) {
      console.warn(`[OpenAI API Warning] ${err.message}. Falling back to smart built-in engine.`);
    }
  }

  // Smart built-in offline engine
  const offlineGuide = generateOfflineStudyGuide(topic.trim(), diff);
  return {
    studyGuide: offlineGuide,
    provider: 'offline',
    model: 'Smart Educational Engine (Offline/Demo)',
    topic: topic.trim(),
    difficulty: diff
  };
}

/**
 * Handle Follow-up Question
 */
async function answerFollowUp({ topic, difficulty, question, guideContext, history = [], customHeaders = {} }) {
  if (!question || !question.trim()) {
    throw new Error('A question is required for follow-up.');
  }

  const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
  const diff = validDifficulties.find(d => d.toLowerCase() === (difficulty || '').toLowerCase()) || 'Intermediate';

  const config = resolveApiConfig(customHeaders);

  const systemPrompt = `You are an expert, encouraging, and clear AI Study Assistant helping a student with a follow-up question.
The student is currently studying:
- Topic: "${topic}"
- Target Difficulty: ${diff}

Study Guide Context:
${guideContext || '(None provided)'}

Instructions:
1. Address the student's question directly, clearly, and concisely.
2. Tailor your explanation to the ${diff} level.
3. If relevant, provide a brief analogy, concrete example, or quick illustration.
4. Keep the tone warm, educational, and empowering.
5. Format your response cleanly using Markdown.`;

  // Format history for conversational context
  const userPrompt = `Student Follow-up Question: "${question.trim()}"`;

  if (config.provider === 'gemini') {
    try {
      // Build conversation prompt
      let fullPrompt = '';
      if (history && history.length > 0) {
        fullPrompt += 'Previous conversation:\n';
        for (const msg of history) {
          fullPrompt += `${msg.role === 'user' ? 'Student' : 'AI Tutor'}: ${msg.content}\n`;
        }
        fullPrompt += '\n';
      }
      fullPrompt += userPrompt;

      const res = await callGemini(config.key, config.model, systemPrompt, fullPrompt);
      return {
        answer: res.text,
        provider: 'gemini',
        model: res.modelUsed
      };
    } catch (err) {
      console.warn(`[Gemini Follow-up Warning] ${err.message}. Using built-in response engine.`);
    }
  } else if (config.provider === 'openai') {
    try {
      const messages = [];
      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      }
      messages.push({ role: 'user', content: userPrompt });

      const res = await callOpenAI(config.key, config.model, systemPrompt, messages);
      return {
        answer: res.text,
        provider: 'openai',
        model: res.modelUsed
      };
    } catch (err) {
      console.warn(`[OpenAI Follow-up Warning] ${err.message}. Using built-in response engine.`);
    }
  }

  // Fallback follow-up answer
  const offlineAnswer = generateOfflineFollowUp(topic, diff, question, guideContext);
  return {
    answer: offlineAnswer,
    provider: 'offline',
    model: 'Smart Educational Engine (Offline/Demo)'
  };
}

module.exports = {
  generateStudyGuide,
  answerFollowUp,
  resolveApiConfig
};

