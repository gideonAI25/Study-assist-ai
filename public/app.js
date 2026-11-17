/**
 * StudyMind AI - Frontend Application Logic
 * Featuring:
 * - Custom JWT Authentication (Sign In & Sign Up modal)
 * - User Profile Avatar & Dropdown in Navbar
 * - Server-synced Study Guide History
 * - Interactive Study Guides & Follow-up Q&A
 * - Dark & Light mode toggle
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const state = {
    // Auth State
    authToken: localStorage.getItem('studymind_token') || '',
    currentUser: null,

    // Study Guide State
    topic: '',
    difficulty: 'Beginner',
    studyGuide: '',
    provider: 'offline',
    model: '',
    followUpHistory: [], // array of { role: 'user' | 'assistant', content: string }
    savedGuides: [],

    // App Preferences
    theme: 'light',
    apiKeys: {
      gemini: '',
      openai: ''
    },
    serverConfig: null
  };

  // Try to parse cached user
  try {
    const cachedUser = localStorage.getItem('studymind_user');
    if (cachedUser) {
      state.currentUser = JSON.parse(cachedUser);
    }
  } catch (e) {
    state.currentUser = null;
  }

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

    // Auth Navigation Elements
    authOpenBtn: document.getElementById('authOpenBtn'),
    userProfileWrapper: document.getElementById('userProfileWrapper'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    userAvatar: document.getElementById('userAvatar'),
    userDisplayName: document.getElementById('userDisplayName'),
    userDropdownMenu: document.getElementById('userDropdownMenu'),
    dropdownAvatar: document.getElementById('dropdownAvatar'),
    dropdownUsername: document.getElementById('dropdownUsername'),
    dropdownEmail: document.getElementById('dropdownEmail'),
    dropdownHistoryBtn: document.getElementById('dropdownHistoryBtn'),
    dropdownSettingsBtn: document.getElementById('dropdownSettingsBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Hero Greeting
    userGreetingBadge: document.getElementById('userGreetingBadge'),
    greetingUsername: document.getElementById('greetingUsername'),
    heroHeading: document.getElementById('heroHeading'),

    // Auth Modal Elements
    authModal: document.getElementById('authModal'),
    authModalTitle: document.getElementById('authModalTitle'),
    closeAuthBtn: document.getElementById('closeAuthBtn'),
    tabSignInBtn: document.getElementById('tabSignInBtn'),
    tabSignUpBtn: document.getElementById('tabSignUpBtn'),
    authAlertBox: document.getElementById('authAlertBox'),
    signInForm: document.getElementById('signInForm'),
    signUpForm: document.getElementById('signUpForm'),
    loginEmailInput: document.getElementById('loginEmailInput'),
    loginPasswordInput: document.getElementById('loginPasswordInput'),
    submitSignInBtn: document.getElementById('submitSignInBtn'),
    signupUsernameInput: document.getElementById('signupUsernameInput'),
    signupEmailInput: document.getElementById('signupEmailInput'),
    signupPasswordInput: document.getElementById('signupPasswordInput'),
    submitSignUpBtn: document.getElementById('submitSignUpBtn'),
    switchToSignUpBtn: document.getElementById('switchToSignUpBtn'),
    switchToSignInBtn: document.getElementById('switchToSignInBtn'),

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
  initMarkdown();
  loadStoredKeys();
  initAuth();
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

  function initMarkdown() {
    if (typeof marked !== 'undefined' && marked.setOptions) {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
    }
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
    if (state.authToken) {
      headers['Authorization'] = `Bearer ${state.authToken}`;
    }
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
  // JWT Authentication & User Profile Management
  // -------------------------------------------------------------------------
  function initAuth() {
    if (state.authToken) {
      // Verify token with server
      verifyAuthToken();
      // Fetch user's saved guides from server
      fetchUserGuides();
    } else {
      loadStoredHistory();
    }
    updateAuthUI();
  }

  async function verifyAuthToken() {
    if (!state.authToken) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: getApiHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          state.currentUser = data.user;
          localStorage.setItem('studymind_user', JSON.stringify(data.user));
          updateAuthUI();
        }
      } else if (res.status === 401) {
        // Expired or invalid token
        handleLogout(false);
      }
    } catch (err) {
      console.warn('Could not verify auth token with server:', err);
    }
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(state.authToken && state.currentUser);

    if (isLoggedIn) {
      const user = state.currentUser;
      const initials = getInitials(user.username || user.email);

      // Hide Sign In button, Show User Profile
      elements.authOpenBtn.classList.add('hidden');
      elements.userProfileWrapper.classList.remove('hidden');

      // Update Avatar
      elements.userAvatar.textContent = initials;
      elements.dropdownAvatar.textContent = initials;
      if (user.avatarColor) {
        elements.userAvatar.style.background = user.avatarColor;
        elements.dropdownAvatar.style.background = user.avatarColor;
      }

      // Update Names & Email
      elements.userDisplayName.textContent = user.username || 'Student';
      elements.dropdownUsername.textContent = user.username || 'Student';
      elements.dropdownEmail.textContent = user.email || '';

      // Update Greeting
      elements.greetingUsername.textContent = user.username || 'Student';
      elements.userGreetingBadge.classList.remove('hidden');
      elements.heroHeading.textContent = `Ready to study, ${user.username}?`;
    } else {
      // Logged out
      elements.authOpenBtn.classList.remove('hidden');
      elements.userProfileWrapper.classList.add('hidden');
      elements.userDropdownMenu.classList.remove('open');
      elements.userProfileBtn.classList.remove('active');
      elements.userGreetingBadge.classList.add('hidden');
      elements.heroHeading.textContent = 'What do you want to master today?';
    }
  }

  function getInitials(name) {
    if (!name) return 'U';
    const clean = name.trim().replace(/[^a-zA-Z0-9 ]/g, '');
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || 'U';
  }

  function openAuthModal(tab = 'signin', alertMsg = '') {
    switchAuthTab(tab);
    if (alertMsg) {
      showAuthAlert(alertMsg, 'error');
    } else {
      clearAuthAlert();
    }
    elements.authModal.classList.add('open');
    if (tab === 'signin') {
      setTimeout(() => elements.loginEmailInput.focus(), 150);
    } else {
      setTimeout(() => elements.signupUsernameInput.focus(), 150);
    }
  }

  function closeAuthModal() {
    elements.authModal.classList.remove('open');
    clearAuthAlert();
    elements.signInForm.reset();
    elements.signUpForm.reset();
  }

  function switchAuthTab(tab) {
    clearAuthAlert();
    if (tab === 'signup') {
      elements.tabSignInBtn.classList.remove('active');
      elements.tabSignInBtn.setAttribute('aria-selected', 'false');
      elements.tabSignUpBtn.classList.add('active');
      elements.tabSignUpBtn.setAttribute('aria-selected', 'true');
      elements.signInForm.classList.add('hidden');
      elements.signUpForm.classList.remove('hidden');
      elements.authModalTitle.textContent = 'Create your StudyMind Account';
      elements.signupUsernameInput.focus();
    } else {
      elements.tabSignUpBtn.classList.remove('active');
      elements.tabSignUpBtn.setAttribute('aria-selected', 'false');
      elements.tabSignInBtn.classList.add('active');
      elements.tabSignInBtn.setAttribute('aria-selected', 'true');
      elements.signUpForm.classList.add('hidden');
      elements.signInForm.classList.remove('hidden');
      elements.authModalTitle.textContent = 'Sign In to StudyMind AI';
      elements.loginEmailInput.focus();
    }
  }

  function showAuthAlert(message, type = 'error') {
    elements.authAlertBox.className = `auth-alert ${type}`;
    elements.authAlertBox.innerHTML = `
      <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
      <span>${escapeHtml(message)}</span>
    `;
    elements.authAlertBox.classList.remove('hidden');
  }

  function clearAuthAlert() {
    elements.authAlertBox.classList.add('hidden');
    elements.authAlertBox.innerHTML = '';
  }

  async function handleSignInSubmit() {
    const email = elements.loginEmailInput.value.trim();
    const password = elements.loginPasswordInput.value;

    if (!email || !password) {
      showAuthAlert('Please enter both email and password.');
      return;
    }

    elements.submitSignInBtn.disabled = true;
    elements.submitSignInBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      // Save auth token & user
      state.authToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('studymind_token', data.token);
      localStorage.setItem('studymind_user', JSON.stringify(data.user));

      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome back, ${data.user.username}!`, 'success');

      // Sync user's study guides from server
      fetchUserGuides();
    } catch (err) {
      showAuthAlert(err.message || 'Invalid email or password.');
    } finally {
      elements.submitSignInBtn.disabled = false;
      elements.submitSignInBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> <span>Sign In</span>';
    }
  }

  async function handleSignUpSubmit() {
    const username = elements.signupUsernameInput.value.trim();
    const email = elements.signupEmailInput.value.trim();
    const password = elements.signupPasswordInput.value;

    if (!username || username.length < 2) {
      showAuthAlert('Username must be at least 2 characters long.');
      return;
    }
    if (!email || !email.includes('@')) {
      showAuthAlert('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      showAuthAlert('Password must be at least 6 characters long.');
      return;
    }

    elements.submitSignUpBtn.disabled = true;
    elements.submitSignUpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account.');
      }

      // Save auth token & user
      state.authToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('studymind_token', data.token);
      localStorage.setItem('studymind_user', JSON.stringify(data.user));

      updateAuthUI();
      closeAuthModal();
      showToast(`Account created! Welcome, ${data.user.username}!`, 'success');

      // Sync guides
      fetchUserGuides();
    } catch (err) {
      showAuthAlert(err.message || 'Could not create account.');
    } finally {
      elements.submitSignUpBtn.disabled = false;
      elements.submitSignUpBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>Create Account</span>';
    }
  }

  function handleLogout(showNotification = true) {
    state.authToken = '';
    state.currentUser = null;
    localStorage.removeItem('studymind_token');
    localStorage.removeItem('studymind_user');

    updateAuthUI();
    loadStoredHistory(); // load local fallback

    if (showNotification) {
      showToast('You have been signed out.', 'info');
    }
  }

  // -------------------------------------------------------------------------
  // Event Listeners Setup
  // -------------------------------------------------------------------------
  function setupEventListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Auth Open & Close
    elements.authOpenBtn.addEventListener('click', () => openAuthModal('signin'));
    elements.closeAuthBtn.addEventListener('click', closeAuthModal);
    elements.tabSignInBtn.addEventListener('click', () => switchAuthTab('signin'));
    elements.tabSignUpBtn.addEventListener('click', () => switchAuthTab('signup'));
    elements.switchToSignUpBtn.addEventListener('click', () => switchAuthTab('signup'));
    elements.switchToSignInBtn.addEventListener('click', () => switchAuthTab('signin'));

    // Auth Forms
    elements.signInForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSignInSubmit();
    });

    elements.signUpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSignUpSubmit();
    });

    // Password visibility toggles
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = isPassword 
            ? '<i class="fa-regular fa-eye-slash"></i>' 
            : '<i class="fa-regular fa-eye"></i>';
        }
      });
    });

    // User Profile Dropdown
    elements.userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.userDropdownMenu.classList.contains('open');
      elements.userDropdownMenu.classList.toggle('open', !isOpen);
      elements.userProfileBtn.classList.toggle('active', !isOpen);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!elements.userProfileWrapper.contains(e.target)) {
        elements.userDropdownMenu.classList.remove('open');
        elements.userProfileBtn.classList.remove('active');
      }
    });

    // Dropdown Action Items
    elements.dropdownHistoryBtn.addEventListener('click', () => {
      elements.userDropdownMenu.classList.remove('open');
      openHistoryDrawer();
    });

    elements.dropdownSettingsBtn.addEventListener('click', () => {
      elements.userDropdownMenu.classList.remove('open');
      openSettingsModal();
    });

    elements.logoutBtn.addEventListener('click', () => {
      elements.userDropdownMenu.classList.remove('open');
      handleLogout(true);
    });

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
    elements.authModal.addEventListener('click', (e) => {
      if (e.target === elements.authModal) closeAuthModal();
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
        closeAuthModal();
        closeHistoryDrawer();
        elements.userDropdownMenu.classList.remove('open');
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
  // Generate Study Guide Handler (Protected by Auth)
  // -------------------------------------------------------------------------
  async function handleGenerateStudyGuide() {
    // Require authentication
    if (!state.authToken) {
      openAuthModal('signin', 'Please sign in or create an account to generate study guides.');
      return;
    }

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

      if (response.status === 401) {
        handleLogout(false);
        openAuthModal('signin', 'Your session has expired. Please sign in again.');
        throw new Error('Authentication required.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate study guide.');
      }

      // Update state
      state.studyGuide = data.studyGuide;
      state.provider = data.provider;
      state.model = data.model;

      // Render Guide
      renderStudyGuide(data);

      // Refresh saved guides from server
      fetchUserGuides();

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
    elements.guideDiffBadge.className = `badge-difficulty ${(data.difficulty || 'beginner').toLowerCase()}`;

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
  // Follow-up Question Handler (Protected by Auth)
  // -------------------------------------------------------------------------
  async function handleFollowUpSubmit() {
    if (!state.authToken) {
      openAuthModal('signin', 'Please sign in to ask follow-up questions.');
      return;
    }

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

      if (response.status === 401) {
        handleLogout(false);
        openAuthModal('signin', 'Your session has expired. Please sign in again.');
        throw new Error('Authentication required.');
      }

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
    if (role === 'user') {
      const initials = state.currentUser ? getInitials(state.currentUser.username) : 'U';
      avatar.textContent = initials;
      if (state.currentUser?.avatarColor) {
        avatar.style.background = state.currentUser.avatarColor;
      }
    } else {
      avatar.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
    }

    const content = document.createElement('div');
    content.className = 'bubble-content markdown-body';

    if (role === 'user') {
      content.textContent = text;
    } else {
      const parsed = marked.parse(text || 'No response generated.');
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
  // History & Server Guides Management
  // -------------------------------------------------------------------------
  async function fetchUserGuides() {
    if (!state.authToken) return;
    try {
      const res = await fetch('/api/user/guides', {
        headers: getApiHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.guides)) {
          state.savedGuides = data.guides.map(g => ({
            id: g.id,
            topic: g.topic,
            difficulty: g.difficulty,
            studyGuide: g.studyGuide,
            provider: g.provider,
            model: g.model,
            date: new Date(g.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          }));
          renderHistoryDrawer();
        }
      }
    } catch (err) {
      console.warn('Could not fetch guides from server, falling back to local:', err);
      loadStoredHistory();
    }
  }

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
          <span class="badge-difficulty ${(item.difficulty || 'beginner').toLowerCase()}" style="font-size:0.65rem; padding: 0.15rem 0.45rem;">
            ${item.difficulty}
          </span>
          <button class="history-item-delete" title="Delete from history" data-id="${item.id}" data-index="${index}">
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
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteHistoryItem(item.id, index);
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

  async function deleteHistoryItem(guideId, index) {
    // Delete from server if logged in
    if (state.authToken && guideId) {
      try {
        await fetch(`/api/user/guides/${guideId}`, {
          method: 'DELETE',
          headers: getApiHeaders()
        });
      } catch (err) {
        console.warn('Could not delete from server:', err);
      }
    }

    state.savedGuides.splice(index, 1);
    renderHistoryDrawer();
    showToast('Removed from history.', 'info');
  }

  async function handleClearAllHistory() {
    if (!confirm('Are you sure you want to clear all your saved study guides?')) {
      return;
    }

    if (state.authToken) {
      try {
        await fetch('/api/user/guides', {
          method: 'DELETE',
          headers: getApiHeaders()
        });
      } catch (err) {
        console.warn('Could not clear server guides:', err);
      }
    }

    state.savedGuides = [];
    localStorage.removeItem('studymind_history');
    renderHistoryDrawer();
    showToast('All study guides cleared.', 'info');
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
