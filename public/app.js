/**
 * StudyMind AI - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const state = {
    topic: '',
    difficulty: 'Beginner',
    studyGuide: '',
    provider: 'offline',
    model: '',
    followUpHistory: [], // array of { role: 'user' | 'assistant', content: string }
    savedGuides: [],
    theme: 'light',
    apiKeys: {
      gemini: '',
      openai: ''
    },
    serverConfig: null
  };

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const elements = {
    // Theme & Navigation
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    engineStatusBtn: document.getElementById('engineStatusBtn'),
    engineStatusText: document.getElementById('engineStatusText'),
    historyToggleBtn: document.getElementById('historyToggleBtn'),
    historyCountBadge: document.getElementById('historyCountBadge'),

    // Generator Form
    studyForm: document.getElementById('studyForm'),
    topicInput: document.getElementById('topicInput'),
    clearTopicBtn: document.getElementById('clearTopicBtn'),
    difficultyCards: document.querySelectorAll('.difficulty-card'),
    generateBtn: document.getElementById('generateBtn'),
    suggestionChips: document.querySelectorAll('.topic-suggestions .chip'),

    // Loading State
    loadingSection: document.getElementById('loadingSection'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingSubtitle: document.getElementById('loadingSubtitle'),

    // Study Guide View
    guideSection: document.getElementById('guideSection'),
    guideTopicTitle: document.getElementById('guideTopicTitle'),
    guideDiffBadge: document.getElementById('guideDiffBadge'),
    guideEngineBadge: document.getElementById('guideEngineBadge'),
    guideEngineText: document.getElementById('guideEngineText'),
    guideContent: document.getElementById('guideContent'),
    copyGuideBtn: document.getElementById('copyGuideBtn'),
    downloadGuideBtn: document.getElementById('downloadGuideBtn'),
    printGuideBtn: document.getElementById('printGuideBtn'),

    // Follow-up Q&A
    followUpTopicName: document.getElementById('followUpTopicName'),
    followUpThread: document.getElementById('followUpThread'),
    followUpForm: document.getElementById('followUpForm'),
    followUpInput: document.getElementById('followUpInput'),
    followUpBtn: document.getElementById('followUpBtn'),
    quickPromptBtns: document.querySelectorAll('.quick-prompt-btn'),

    // History Drawer
    historyDrawer: document.getElementById('historyDrawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    historyList: document.getElementById('historyList'),
    emptyHistoryMsg: document.getElementById('emptyHistoryMsg'),
    clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    modalActiveProvider: document.getElementById('modalActiveProvider'),
    geminiKeyInput: document.getElementById('geminiKeyInput'),
    openaiKeyInput: document.getElementById('openaiKeyInput'),
    saveKeysBtn: document.getElementById('saveKeysBtn'),
    clearKeysBtn: document.getElementById('clearKeysBtn'),

    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  initTheme();
  loadStoredKeys();
  loadStoredHistory();
  fetchServerConfig();
  setupEventListeners();

  // -------------------------------------------------------------------------
  // Theme Management
  // -------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('studymind_theme');
    if (savedTheme) {
      state.theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      state.theme = 'dark';
    } else {
      state.theme = 'light';
    }
    applyTheme(state.theme);
  }

  function applyTheme(theme) {
    state.theme = theme;
    elements.html.setAttribute('data-theme', theme);
    localStorage.setItem('studymind_theme', theme);

    if (theme === 'dark') {
      elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  // -------------------------------------------------------------------------
  // Markdown & Syntax Setup
  // -------------------------------------------------------------------------
  if (typeof marked !== 'undefined' && marked.setOptions) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // -------------------------------------------------------------------------
  // LocalStorage Keys & Server Configuration
  // -------------------------------------------------------------------------
  function loadStoredKeys() {
    try {
      const gemini = localStorage.getItem('studymind_gemini_key') || '';
      const openai = localStorage.getItem('studymind_openai_key') || '';
      state.apiKeys.gemini = gemini;
      state.apiKeys.openai = openai;
      if (elements.geminiKeyInput) elements.geminiKeyInput.value = gemini;
      if (elements.openaiKeyInput) elements.openaiKeyInput.value = openai;
    } catch (e) {
      console.error('Could not load stored keys', e);
    }
  }

  function saveStoredKeys(gemini, openai) {
    state.apiKeys.gemini = (gemini || '').trim();
    state.apiKeys.openai = (openai || '').trim();
    localStorage.setItem('studymind_gemini_key', state.apiKeys.gemini);
    localStorage.setItem('studymind_openai_key', state.apiKeys.openai);
    updateEngineBadge();
    showToast('API settings saved successfully!', 'success');
  }

  function clearStoredKeys() {
    state.apiKeys.gemini = '';
    state.apiKeys.openai = '';
    localStorage.removeItem('studymind_gemini_key');
    localStorage.removeItem('studymind_openai_key');
    if (elements.geminiKeyInput) elements.geminiKeyInput.value = '';
    if (elements.openaiKeyInput) elements.openaiKeyInput.value = '';
    updateEngineBadge();
    showToast('Reset to built-in smart educational engine.', 'info');
  }

  async function fetchServerConfig() {
    try {
      const headers = getApiHeaders();
      const res = await fetch('/api/config', { headers });
      if (res.ok) {
        state.serverConfig = await res.json();
      }
    } catch (e) {
      console.warn('Could not contact config endpoint, running in standalone mode', e);
    } finally {
      updateEngineBadge();
    }
  }

  function getApiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (state.apiKeys.gemini) {
      headers['x-gemini-key'] = state.apiKeys.gemini;
    }
    if (state.apiKeys.openai) {
      headers['x-openai-key'] = state.apiKeys.openai;
    }
    return headers;
  }

  function updateEngineBadge() {
    let label = 'Offline Demo Engine';
    let isLive = false;

    if (state.apiKeys.gemini) {
      label = 'Gemini Live (Custom Key)';
      isLive = true;
    } else if (state.apiKeys.openai) {
      label = 'OpenAI Live (Custom Key)';
      isLive = true;
    } else if (state.serverConfig?.hasServerGeminiKey) {
      label = 'Gemini Live (Server)';
      isLive = true;
    } else if (state.serverConfig?.hasServerOpenAIKey) {
      label = 'OpenAI Live (Server)';
      isLive = true;
    }

    elements.engineStatusText.textContent = label;
    elements.modalActiveProvider.textContent = label;

    if (isLive) {
      elements.engineStatusBtn.classList.remove('offline');
    } else {
      elements.engineStatusBtn.classList.add('offline');
    }
  }

  // -------------------------------------------------------------------------
  // Event Listeners Setup
  // -------------------------------------------------------------------------
  function setupEventListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Topic input clear button
    elements.topicInput.addEventListener('input', () => {
      if (elements.topicInput.value.trim().length > 0) {
        elements.clearTopicBtn.classList.remove('hidden');
      } else {
        elements.clearTopicBtn.classList.add('hidden');
      }
    });

    elements.clearTopicBtn.addEventListener('click', () => {
      elements.topicInput.value = '';
      elements.clearTopicBtn.classList.add('hidden');
      elements.topicInput.focus();
    });

    // Difficulty selection cards
    elements.difficultyCards.forEach(card => {
      card.addEventListener('click', () => {
        elements.difficultyCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          state.difficulty = radio.value;
        }
      });
    });

    // Initial active card check
    elements.difficultyCards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio && radio.checked) {
        card.classList.add('active');
        state.difficulty = radio.value;
      }
    });

    // Topic suggestions chips
    elements.suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const topic = chip.getAttribute('data-topic');
        const diff = chip.getAttribute('data-diff');
        if (topic) {
          elements.topicInput.value = topic;
          elements.clearTopicBtn.classList.remove('hidden');
        }
        if (diff) {
          selectDifficulty(diff);
        }
        elements.topicInput.focus();
      });
    });

    // Main Form Submit
    elements.studyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGenerateStudyGuide();
    });

    // Study Guide Actions
    elements.copyGuideBtn.addEventListener('click', handleCopyGuide);
    elements.downloadGuideBtn.addEventListener('click', handleDownloadGuide);
    elements.printGuideBtn.addEventListener('click', () => window.print());

    // Follow-up Form & Input
    elements.followUpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFollowUpSubmit();
    });

    // Follow-up textarea keyboard handler (Enter submits, Shift+Enter newlines)
    elements.followUpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleFollowUpSubmit();
      }
    });

    // Auto-expand textarea
    elements.followUpInput.addEventListener('input', () => {
      elements.followUpInput.style.height = 'auto';
      elements.followUpInput.style.height = Math.min(elements.followUpInput.scrollHeight, 150) + 'px';
    });

    // Quick follow-up prompt buttons
    elements.quickPromptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) {
          elements.followUpInput.value = prompt;
          elements.followUpInput.focus();
          handleFollowUpSubmit();
        }
      });
    });

    // History Drawer toggle
    elements.historyToggleBtn.addEventListener('click', openHistoryDrawer);
    elements.closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
    elements.drawerOverlay.addEventListener('click', closeHistoryDrawer);
    elements.clearAllHistoryBtn.addEventListener('click', handleClearAllHistory);

    // Settings Modal
    elements.engineStatusBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) closeSettingsModal();
    });
    elements.saveKeysBtn.addEventListener('click', () => {
      saveStoredKeys(elements.geminiKeyInput.value, elements.openaiKeyInput.value);
      closeSettingsModal();
    });
    elements.clearKeysBtn.addEventListener('click', () => {
      clearStoredKeys();
      closeSettingsModal();
    });

    // Escape key closes modals/drawers
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeHistoryDrawer();
      }
    });
  }

  function selectDifficulty(diff) {
    state.difficulty = diff;
    elements.difficultyCards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio && radio.value.toLowerCase() === diff.toLowerCase()) {
        radio.checked = true;
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Generate Study Guide Handler
  // -------------------------------------------------------------------------
  async function handleGenerateStudyGuide() {
    const topic = elements.topicInput.value.trim();
    if (!topic) {
      showToast('Please enter a topic to study.', 'error');
      elements.topicInput.focus();
      return;
    }

    state.topic = topic;
    state.followUpHistory = []; // Reset conversation thread for new topic

    // UI: Set loading state
    setLoadingState(true, `Generating guide for "${topic}"...`, `Level: ${state.difficulty}. Building structured summary, key concepts, and quiz.`);

    try {
      const response = await fetch('/api/study-guide', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          topic: state.topic,
          difficulty: state.difficulty
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate study guide.');
      }

      // Update state
      state.studyGuide = data.studyGuide;
      state.provider = data.provider;
      state.model = data.model;

      // Render Guide
      renderStudyGuide(data);

      // Save to local history
      saveGuideToHistory({
        id: Date.now().toString(),
        topic: state.topic,
        difficulty: state.difficulty,
        studyGuide: state.studyGuide,
        provider: data.provider,
        model: data.model,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      showToast('Study guide generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating guide:', error);
      showToast(error.message || 'An error occurred while generating the guide.', 'error');
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading, title = '', subtitle = '') {
    if (isLoading) {
      elements.generateBtn.disabled = true;
      elements.generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
      elements.loadingTitle.textContent = title;
      elements.loadingSubtitle.textContent = subtitle;
      elements.loadingSection.classList.remove('hidden');
      elements.guideSection.classList.add('hidden');
      elements.loadingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      elements.generateBtn.disabled = false;
      elements.generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Generate Study Guide</span>';
      elements.loadingSection.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------------------
  // Render Study Guide View
  // -------------------------------------------------------------------------
  function renderStudyGuide(data) {
    // Topic & Difficulty Badges
    elements.guideTopicTitle.textContent = data.topic;
    elements.guideDiffBadge.textContent = data.difficulty;
    elements.guideDiffBadge.className = `badge-difficulty ${data.difficulty.toLowerCase()}`;

    // Provider Badge
    let providerLabel = 'AI Engine';
    if (data.provider === 'gemini') {
      providerLabel = `Google Gemini (${data.model || 'Flash'})`;
    } else if (data.provider === 'openai') {
      providerLabel = `OpenAI (${data.model || 'GPT'})`;
    } else {
      providerLabel = 'Built-in Educational Engine';
    }
    elements.guideEngineText.textContent = providerLabel;

    // Follow-up header reference
    elements.followUpTopicName.textContent = data.topic;

    // Render Markdown Content securely
    const rawHtml = marked.parse(data.studyGuide);
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    elements.guideContent.innerHTML = cleanHtml;

    // Run Syntax Highlighting on code blocks
    elements.guideContent.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });

    // Reset follow-up thread UI
    elements.followUpThread.innerHTML = '';
    elements.followUpThread.classList.add('hidden');
    elements.followUpInput.value = '';
    elements.followUpInput.style.height = 'auto';

    // Show Guide
    elements.guideSection.classList.remove('hidden');
    elements.guideSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -------------------------------------------------------------------------
  // Follow-up Question Handler
  // -------------------------------------------------------------------------
  async function handleFollowUpSubmit() {
    const question = elements.followUpInput.value.trim();
    if (!question) return;

    if (!state.studyGuide) {
      showToast('Please generate a study guide first before asking follow-up questions.', 'error');
      return;
    }

    // Append student's message to UI
    appendFollowUpMessage('user', question);
    elements.followUpInput.value = '';
    elements.followUpInput.style.height = 'auto';

    // Add typing indicator bubble
    const typingBubble = appendTypingIndicator();

    // Disable send button while answering
    elements.followUpBtn.disabled = true;

    try {
      const response = await fetch('/api/follow-up', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          topic: state.topic,
          difficulty: state.difficulty,
          question,
          guideContext: state.studyGuide,
          history: state.followUpHistory
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get answer from AI tutor.');
      }

      // Remove typing bubble
      typingBubble.remove();

      // Append tutor's answer
      appendFollowUpMessage('assistant', data.answer);

      // Record in history
      state.followUpHistory.push({ role: 'user', content: question });
      state.followUpHistory.push({ role: 'assistant', content: data.answer });

    } catch (err) {
      typingBubble.remove();
      appendFollowUpMessage('assistant', `⚠️ **Sorry!** An error occurred while retrieving your answer: ${err.message}`);
      showToast('Failed to answer question. Please try again.', 'error');
    } finally {
      elements.followUpBtn.disabled = false;
    }
  }

  function appendFollowUpMessage(role, text) {
    elements.followUpThread.classList.remove('hidden');

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role === 'user' ? 'user-bubble' : 'ai-bubble'}`;

    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    avatar.innerHTML = role === 'user' 
      ? '<i class="fa-solid fa-user"></i>' 
      : '<i class="fa-solid fa-graduation-cap"></i>';

    const content = document.createElement('div');
    content.className = 'bubble-content markdown-body';

    if (role === 'user') {
      content.textContent = text;
    } else {
      const parsed = marked.parse(text);
      content.innerHTML = DOMPurify.sanitize(parsed);
      content.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
    }

    bubble.appendChild(avatar);
    bubble.appendChild(content);

    elements.followUpThread.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return bubble;
  }

  function appendTypingIndicator() {
    elements.followUpThread.classList.remove('hidden');

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble ai-bubble';

    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    avatar.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';

    const content = document.createElement('div');
    content.className = 'bubble-content';
    content.innerHTML = '<span style="color:var(--text-muted); font-size:0.88rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Tutor is thinking...</span>';

    bubble.appendChild(avatar);
    bubble.appendChild(content);

    elements.followUpThread.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return bubble;
  }

  // -------------------------------------------------------------------------
  // Copy, Download, Print Actions
  // -------------------------------------------------------------------------
  async function handleCopyGuide() {
    if (!state.studyGuide) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(state.studyGuide);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = state.studyGuide;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('Study guide copied to clipboard!', 'success');
      elements.copyGuideBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
      setTimeout(() => {
        elements.copyGuideBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
      }, 2000);
    } catch (e) {
      showToast('Could not copy to clipboard.', 'error');
    }
  }

  function handleDownloadGuide() {
    if (!state.studyGuide) return;
    const sanitizedTopic = (state.topic || 'Study_Guide').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedTopic}_${state.difficulty}_StudyGuide.md`;
    const blob = new Blob([state.studyGuide], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'info');
  }

  // -------------------------------------------------------------------------
  // History Management (LocalStorage)
  // -------------------------------------------------------------------------
  function loadStoredHistory() {
    try {
      const data = localStorage.getItem('studymind_history');
      if (data) {
        const parsed = JSON.parse(data);
        state.savedGuides = Array.isArray(parsed) ? parsed.filter(item => item && item.topic && item.difficulty) : [];
      }
    } catch (e) {
      state.savedGuides = [];
    }
    renderHistoryDrawer();
  }

  function saveGuideToHistory(entry) {
    if (!entry || !entry.topic) return;
    // Avoid duplicate immediately
    state.savedGuides = state.savedGuides.filter(item => 
      item && item.topic && item.difficulty &&
      !(item.topic.toLowerCase() === entry.topic.toLowerCase() && item.difficulty === entry.difficulty)
    );
    state.savedGuides.unshift(entry);
    // Limit to 20 items
    if (state.savedGuides.length > 20) {
      state.savedGuides = state.savedGuides.slice(0, 20);
    }
    try {
      localStorage.setItem('studymind_history', JSON.stringify(state.savedGuides));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    renderHistoryDrawer();
  }

  function renderHistoryDrawer() {
    const list = elements.historyList;
    list.innerHTML = '';

    const count = state.savedGuides.length;
    if (count > 0) {
      elements.historyCountBadge.textContent = count;
      elements.historyCountBadge.classList.remove('hidden');
      elements.emptyHistoryMsg.classList.add('hidden');
    } else {
      elements.historyCountBadge.classList.add('hidden');
      elements.emptyHistoryMsg.classList.remove('hidden');
      return;
    }

    state.savedGuides.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-item-top">
          <span class="badge-difficulty ${item.difficulty.toLowerCase()}" style="font-size:0.65rem; padding: 0.15rem 0.45rem;">
            ${item.difficulty}
          </span>
          <button class="history-item-delete" title="Delete from history" data-index="${index}">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
        <div class="history-item-title">${escapeHtml(item.topic)}</div>
        <div class="history-item-date">${item.date || ''}</div>
      `;

      // Click on item loads it
      div.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-delete')) return;
        loadHistoricalGuide(item);
        closeHistoryDrawer();
      });

      // Delete action
      const deleteBtn = div.querySelector('.history-item-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(index);
      });

      list.appendChild(div);
    });
  }

  function loadHistoricalGuide(item) {
    state.topic = item.topic;
    state.difficulty = item.difficulty;
    state.studyGuide = item.studyGuide;
    state.provider = item.provider;
    state.model = item.model;
    state.followUpHistory = [];

    elements.topicInput.value = item.topic;
    elements.clearTopicBtn.classList.remove('hidden');
    selectDifficulty(item.difficulty);

    renderStudyGuide({
      topic: item.topic,
      difficulty: item.difficulty,
      studyGuide: item.studyGuide,
      provider: item.provider,
      model: item.model
    });

    showToast(`Loaded "${item.topic}" study guide.`, 'info');
  }

  function deleteHistoryItem(index) {
    state.savedGuides.splice(index, 1);
    localStorage.setItem('studymind_history', JSON.stringify(state.savedGuides));
    renderHistoryDrawer();
    showToast('Removed from history.', 'info');
  }

  function handleClearAllHistory() {
    if (confirm('Are you sure you want to clear all saved study guides?')) {
      state.savedGuides = [];
      localStorage.removeItem('studymind_history');
      renderHistoryDrawer();
      showToast('All study guides cleared.', 'info');
    }
  }

  function openHistoryDrawer() {
    elements.historyDrawer.classList.add('open');
    elements.drawerOverlay.classList.add('active');
  }

  function closeHistoryDrawer() {
    elements.historyDrawer.classList.remove('open');
    elements.drawerOverlay.classList.remove('active');
  }

  // -------------------------------------------------------------------------
  // Settings Modal
  // -------------------------------------------------------------------------
  function openSettingsModal() {
    elements.settingsModal.classList.add('open');
  }

  function closeSettingsModal() {
    elements.settingsModal.classList.remove('open');
  }

  // -------------------------------------------------------------------------
  // Toast Notifications
  // -------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

