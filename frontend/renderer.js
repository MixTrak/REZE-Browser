const BASE_API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', () => {
    const appDiv = document.getElementById('app');

    const state = {
        view: 'auth',
        authMode: 'login',
        user: null, // Holds googleApiKey, cseId, etc...
        messages: []
    };

    function checkAuth() {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('userStr');
        if (token && userStr) {
            state.user = JSON.parse(userStr);
            state.view = 'browser';
        } else {
            state.view = 'auth';
        }
        render();
    }

    async function render() {
        if (state.view === 'auth') {
            const response = await fetch('./auth.html');
            appDiv.innerHTML = await response.text();
            setupAuthListeners();
        } else {
            const response = await fetch('./browser.html');
            appDiv.innerHTML = await response.text();
            setupBrowserListeners();
        }
    }

    function setupAuthListeners() {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const form = document.getElementById('auth-form');
        const submitBtn = document.getElementById('auth-submit-btn');
        const errorMsg = document.getElementById('auth-error');

        function updateAuthUI() {
            if (state.authMode === 'login') {
                tabLogin.classList.replace('bg-transparent', 'bg-zinc-700');
                tabLogin.classList.replace('text-zinc-400', 'text-white');
                tabLogin.classList.add('shadow-sm');
                tabSignup.classList.replace('bg-zinc-700', 'bg-transparent');
                tabSignup.classList.replace('text-white', 'text-zinc-400');
                tabSignup.classList.remove('shadow-sm');
                submitBtn.textContent = 'Login';
            } else {
                tabSignup.classList.replace('bg-transparent', 'bg-zinc-700');
                tabSignup.classList.replace('text-zinc-400', 'text-white');
                tabSignup.classList.add('shadow-sm');
                tabLogin.classList.replace('bg-zinc-700', 'bg-transparent');
                tabLogin.classList.replace('text-white', 'text-zinc-400');
                tabLogin.classList.remove('shadow-sm');
                submitBtn.textContent = 'Sign Up';
            }
        }

        tabLogin.addEventListener('click', () => {
            state.authMode = 'login';
            errorMsg.classList.add('hidden');
            updateAuthUI();
        });
        tabSignup.addEventListener('click', () => {
            state.authMode = 'signup';
            errorMsg.classList.add('hidden');
            updateAuthUI();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            errorMsg.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Loading...';

            try {
                const route = state.authMode === 'login' ? '/auth/login' : '/auth/signup';
                const res = await fetch(`${BASE_API_URL}${route}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Authentication failed');

                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userStr', JSON.stringify(data.user));
                checkAuth();
            } catch (err) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                updateAuthUI();
            }
        });

        updateAuthUI();
    }

    function setupBrowserListeners() {
        setupSidebar();
        setupWebview();
        setupSettingsModal();
        setupChatLogic();
    }

    function setupSidebar() {
        const sidebar = document.getElementById('assistant-sidebar');
        const btnToggle = document.getElementById('btn-toggle-sidebar');
        const toggleIcon = document.getElementById('toggle-icon-svg');

        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mini-collapsed');
            toggleIcon.classList.toggle('rotate-180');
        });
    }

    function setupWebview() {
        const webview = document.getElementById('browser-view');
        const backBtn = document.getElementById('btn-back');
        const forwardBtn = document.getElementById('btn-forward');
        const refreshBtn = document.getElementById('btn-refresh');
        const urlForm = document.getElementById('url-form');
        const urlInput = document.getElementById('url-input');
        const logoutBtn = document.getElementById('logout-btn');

        let currentFullUrl = 'https://reze-browser.vercel.app';

        function formatDisplayUrl(rawUrl) {
            if (!rawUrl) return '';
            try {
                const parsed = new URL(rawUrl);
                let host = parsed.hostname.replace(/^www\./, '');
                let path = parsed.pathname !== '/' ? parsed.pathname : '';

                if (host === 'google.com' && path === '/search' && parsed.searchParams.has('q')) {
                    return `${host}/${parsed.searchParams.get('q')}`;
                }

                // Keep query params if they exist (unless it's the google exception above)
                let search = parsed.search ? parsed.search : '';
                return host + path + search;
            } catch (e) {
                return rawUrl;
            }
        }

        function updateUrlDisplay() {
            if (document.activeElement === urlInput) {
                urlInput.value = currentFullUrl;
            } else {
                urlInput.value = formatDisplayUrl(currentFullUrl);
            }
        }

        urlInput.addEventListener('focus', () => {
            urlInput.value = currentFullUrl;
            urlInput.select();
        });

        urlInput.addEventListener('blur', () => {
            updateUrlDisplay();
        });

        // initial format
        updateUrlDisplay();

        webview.addEventListener('did-start-loading', () => refreshBtn.classList.add('animate-spin'));
        webview.addEventListener('did-stop-loading', () => {
            refreshBtn.classList.remove('animate-spin');
            currentFullUrl = webview.getURL();
            updateUrlDisplay();
        });
        webview.addEventListener('did-navigate-in-page', () => {
            currentFullUrl = webview.getURL();
            updateUrlDisplay();
        });

        backBtn.addEventListener('click', () => { if (webview.canGoBack()) webview.goBack(); });
        forwardBtn.addEventListener('click', () => { if (webview.canGoForward()) webview.goForward(); });
        refreshBtn.addEventListener('click', () => webview.reload());

        urlForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let targetUrl = urlInput.value.trim();
            if (!/^https?:\/\//i.test(targetUrl)) {
                if (targetUrl.includes('.') && !targetUrl.includes(' ')) targetUrl = 'https://' + targetUrl;
                else targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(targetUrl);
            }
            webview.loadURL(targetUrl);
        });

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userStr');
            state.user = null;
            checkAuth();
        });
    }

    function setupSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const btnOpen = document.getElementById('btn-settings');
        const btnOpenMini = document.getElementById('btn-settings-mini');
        const btnClose = document.getElementById('btn-close-settings');
        const btnCancel = document.getElementById('btn-cancel-settings');
        const btnSave = document.getElementById('btn-save-settings');

        const inputGoogle = document.getElementById('set-google-api');
        const inputCse = document.getElementById('set-cse-id');
        const inputOpenRouter = document.getElementById('set-openrouter-api');
        const inputModel = document.getElementById('set-openrouter-model');
        const msg = document.getElementById('settings-msg');

        function openModal() {
            inputGoogle.value = state.user.googleApiKey || '';
            inputCse.value = state.user.cseId || '';
            inputOpenRouter.value = state.user.openRouterApiKey || '';
            inputModel.value = state.user.openRouterModel || 'stepfun/step-3.5-flash:free';
            msg.textContent = '';
            modal.classList.remove('hidden');
        }

        function closeModal() { modal.classList.add('hidden'); }

        btnOpen.addEventListener('click', openModal);
        btnOpenMini.addEventListener('click', openModal);
        btnClose.addEventListener('click', closeModal);
        btnCancel.addEventListener('click', closeModal);

        btnSave.addEventListener('click', async () => {
            btnSave.disabled = true;
            btnSave.textContent = 'Saving...';
            try {
                const payload = {
                    userId: state.user._id,
                    googleApiKey: inputGoogle.value,
                    cseId: inputCse.value,
                    openRouterApiKey: inputOpenRouter.value,
                    openRouterModel: inputModel.value
                };

                const res = await fetch(`${BASE_API_URL}/user/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to save settings');

                // update local state
                Object.assign(state.user, payload);
                localStorage.setItem('userStr', JSON.stringify(state.user));

                msg.textContent = 'Settings saved to database!';
                msg.className = 'text-xs text-green-400 text-center mt-3 h-4';
                setTimeout(() => closeModal(), 1500);
            } catch (err) {
                msg.textContent = 'Error saving settings';
                msg.className = 'text-xs text-red-500 text-center mt-3 h-4';
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = 'Save';
            }
        });
    }

    // Very basic Markdown to HTML parser
    function parseMarkdown(md) {
        if (!md) return '';
        // Bold
        let html = md.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
        // Code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white">$1</code>');
        // Lists
        html = html.replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
        // Paragraphs roughly (split by double newlines)
        const paragraphs = html.split('\n\n');
        return paragraphs.map(p => {
            if (p.includes('<li')) {
                return `<ul class="mb-4 text-gray-300 leading-relaxed space-y-1">${p}</ul>`;
            }
            return `<p class="mb-3 text-gray-300 leading-relaxed">${p}</p>`;
        }).join('');
    }

    function setupChatLogic() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('btn-send-chat');
        const toggleReasoning = document.getElementById('toggle-reasoning');

        const chatEmpty = document.getElementById('chat-empty');
        const chatContainer = document.getElementById('chat-messages-container');
        const messagesDiv = document.getElementById('chat-messages');
        const statusDiv = document.getElementById('chat-status');
        const statusText = document.getElementById('chat-status-text');
        const messagesEnd = document.getElementById('messages-end');

        let isLoading = false;

        // Expand textarea slightly
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto'; // reset
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            if (chatInput.value.trim().length > 0) {
                sendBtn.removeAttribute('disabled');
                sendBtn.setAttribute('data-active', 'true');
            } else {
                sendBtn.setAttribute('disabled', 'true');
                sendBtn.setAttribute('data-active', 'false');
            }
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitChat();
            }
        });

        sendBtn.addEventListener('click', submitChat);

        function appendMessageBlock(role, content) {
            const isUser = role === 'user';
            const icon = isUser ? `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                : `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`;
            const name = isUser ? 'You' : 'Reze';

            const blockId = `msg-${Date.now()}-${Math.random()}`;
            const msgHTML = `
        <div class="flex flex-col gap-2 mt-4 animate-opacity">
          <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  ${icon}
              </div>
              <span class="text-xs font-semibold text-white uppercase tracking-wider">${name}</span>
          </div>
          <div class="pl-10 text-[0.95rem]" id="${blockId}">
             ${isUser ? `<div class="text-gray-300 font-sans leading-relaxed">${content}</div>` : ''}
          </div>
        </div>
      `;
            messagesDiv.insertAdjacentHTML('beforeend', msgHTML);
            messagesEnd.scrollIntoView({ behavior: 'smooth' });
            return document.getElementById(blockId);
        }

        async function submitChat() {
            const text = chatInput.value.trim();
            if (!text || isLoading) return;

            // Update UI
            chatEmpty.classList.add('hidden');
            chatContainer.classList.remove('hidden');

            appendMessageBlock('user', text);

            chatInput.value = '';
            chatInput.style.height = 'auto'; // reset height
            sendBtn.setAttribute('disabled', 'true');
            sendBtn.setAttribute('data-active', 'false');

            isLoading = true;
            const isReasoning = toggleReasoning.checked;

            try {
                let context = { query: text, google_results: [], youtube_results: [] };

                if (isReasoning) {
                    statusDiv.classList.remove('hidden');
                    statusText.textContent = 'Searching...';
                    const researchResponse = await fetch(`${BASE_API_URL}/research`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: text,
                            googleApiKey: state.user.googleApiKey,
                            cseId: state.user.cseId
                        }),
                    });
                    if (!researchResponse.ok) throw new Error('Research failed');
                    context = await researchResponse.json();
                }

                statusDiv.classList.remove('hidden');
                statusText.textContent = 'Generating answer...';

                const chatResponse = await fetch(`${BASE_API_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        context,
                        openRouterApiKey: state.user.openRouterApiKey,
                        openRouterModel: state.user.openRouterModel
                    }),
                });

                if (!chatResponse.ok) throw new Error('Chat API failed');

                statusDiv.classList.add('hidden');

                // Prepare assistant message block
                const assistantContentDiv = appendMessageBlock('assistant', '');
                let accumulatedMarkdown = '';

                const reader = chatResponse.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulatedMarkdown += chunk;
                    assistantContentDiv.innerHTML = parseMarkdown(accumulatedMarkdown);
                    messagesEnd.scrollIntoView();
                }
            } catch (err) {
                console.error(err);
                appendMessageBlock('assistant', 'Sorry, something went wrong: ' + err.message);
            } finally {
                statusDiv.classList.add('hidden');
                isLoading = false;
            }
        }
    }

    // Initial Boot
    checkAuth();
});
