/* ============================================================
   EL-NOVIK CHAT WIDGET — chat.js
   ============================================================ */

(function () {
  const WA_LINK = 'https://wa.me/2349031482001';
  let isOpen = false;
  let conversationHistory = [];
  let isTyping = false;

  // ── Build the widget HTML ──────────────────────────────────
  function buildWidget() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <!-- Floating button -->
      <button class="elv-chat-btn" id="elvChatBtn" aria-label="Chat with us">
        <span class="elv-chat-dot"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      <!-- Chat panel -->
      <div class="elv-chat-panel" id="elvChatPanel" role="dialog" aria-label="EL-NOVIK Chat">

        <!-- Header -->
        <div class="elv-chat-header">
          <div class="elv-chat-avatar">🎵</div>
          <div class="elv-chat-header-info">
            <div class="elv-chat-header-name">EL-NOVIK Assistant</div>
            <div class="elv-chat-header-status">Online now</div>
          </div>
          <button class="elv-chat-close" id="elvChatClose" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="elv-chat-messages" id="elvChatMessages"></div>

        <!-- Input -->
        <div class="elv-chat-input-wrap">
          <input
            type="text"
            class="elv-chat-input"
            id="elvChatInput"
            placeholder="Type a message..."
            autocomplete="off"
            maxlength="500"
          />
          <button class="elv-chat-send" id="elvChatSend" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(wrapper);
  }

  // ── Time formatter ─────────────────────────────────────────
  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Add a message bubble ───────────────────────────────────
  function addMessage(text, role, wantsToBuy = false) {
    const messages = document.getElementById('elvChatMessages');

    const msg = document.createElement('div');
    msg.className = `elv-msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'elv-msg-bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'elv-msg-time';
    time.textContent = getTime();

    msg.appendChild(bubble);

    // If bot detected purchase intent, add WhatsApp button below the bubble
    if (role === 'bot' && wantsToBuy) {
      const waBtn = document.createElement('a');
      waBtn.href = WA_LINK;
      waBtn.target = '_blank';
      waBtn.rel = 'noopener';
      waBtn.className = 'elv-chat-wa-btn';
      waBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        Chat with us on WhatsApp
      `;
      msg.appendChild(waBtn);
    }

    msg.appendChild(time);
    messages.appendChild(msg);

    // Save to conversation history for context
    conversationHistory.push({ role: role === 'user' ? 'user' : 'assistant', text });

    // Scroll to latest message
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Show typing indicator ──────────────────────────────────
  function showTyping() {
    const messages = document.getElementById('elvChatMessages');
    const typing = document.createElement('div');
    typing.className = 'elv-msg bot';
    typing.id = 'elvTyping';
    typing.innerHTML = `
      <div class="elv-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    isTyping = true;
  }

  // ── Remove typing indicator ────────────────────────────────
  function hideTyping() {
    const el = document.getElementById('elvTyping');
    if (el) el.remove();
    isTyping = false;
  }

  // ── Send message to API ────────────────────────────────────
  async function sendMessage() {
    const input = document.getElementById('elvChatInput');
    const message = input.value.trim();
    if (!message || isTyping) return;

    input.value = '';
    addMessage(message, 'user');
    showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: conversationHistory.slice(-10) // send last 10 messages for context
        })
      });

      const data = await response.json();
      hideTyping();

      if (data.reply) {
        addMessage(data.reply, 'bot', data.wantsToBuy);
      } else {
        addMessage('Sorry, I had trouble with that. Please try again or reach us on WhatsApp.', 'bot', true);
      }

    } catch (err) {
      hideTyping();
      addMessage('Connection issue. Please check your internet and try again.', 'bot', true);
    }
  }

  // ── Open / close panel ────────────────────────────────────
  function openChat() {
    const panel = document.getElementById('elvChatPanel');
    const dot = document.querySelector('.elv-chat-dot');
    panel.classList.add('show');
    isOpen = true;
    if (dot) dot.style.display = 'none';

    // Send greeting on first open
    if (conversationHistory.length === 0) {
      setTimeout(() => {
        addMessage('👋 Hello! Welcome to EL-NOVIK. I\'m here to help you find the perfect instrument or electronics. What can I help you with today?', 'bot');
      }, 400);
    }

    setTimeout(() => {
      document.getElementById('elvChatInput').focus();
    }, 300);
  }

  function closeChat() {
    const panel = document.getElementById('elvChatPanel');
    panel.classList.remove('show');
    isOpen = false;
  }

  // ── Wire everything up ─────────────────────────────────────
  function init() {

    // Mobile keyboard detection
const input = document.getElementById('elvChatInput');
input.addEventListener('focus', function() {
  document.getElementById('elvChatPanel').classList.add('keyboard-open');
  setTimeout(() => {
    document.getElementById('elvChatMessages').scrollTo({
      top: document.getElementById('elvChatMessages').scrollHeight,
      behavior: 'smooth'
    });
  }, 350);
});
input.addEventListener('blur', function() {
  document.getElementById('elvChatPanel').classList.remove('keyboard-open');
});

    buildWidget();

    document.getElementById('elvChatBtn').addEventListener('click', () => {
      isOpen ? closeChat() : openChat();
    });

    document.getElementById('elvChatClose').addEventListener('click', closeChat);

    document.getElementById('elvChatSend').addEventListener('click', sendMessage);

    document.getElementById('elvChatInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();