/* ============================================================
   EL-NOVIK CHAT WIDGET — chat.js
   ============================================================ */

(function () {
  const WA_LINK = 'https://wa.me/2349031482001';
  let isOpen = false;
  let conversationHistory = [];
  let isTyping = false;

  function buildWidget() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button class="elv-chat-btn" id="elvChatBtn" aria-label="Chat with us">
        <span class="elv-chat-dot"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      <div class="elv-chat-panel" id="elvChatPanel" role="dialog" aria-label="EL-NOVIK Chat">

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

        <div class="elv-chat-messages" id="elvChatMessages"></div>

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

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMessage(text, role, showWa = false) {
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

    if (role === 'bot' && showWa) {
      const waBtn = document.createElement('a');
      waBtn.href = WA_LINK;
      waBtn.target = '_blank';
      waBtn.rel = 'noopener';
      waBtn.className = 'elv-chat-wa-btn';
      waBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.122 1.529 5.855L.057 23.886l6.198-1.625A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.374l-.36-.214-3.68.965.981-3.595-.234-.369A9.818 9.818 0 1 1 12 21.818z"/>
        </svg>
        Chat with us on WhatsApp
      `;
      msg.appendChild(waBtn);
    }

    msg.appendChild(time);
    messages.appendChild(msg);

    conversationHistory.push({
      role: role === 'user' ? 'user' : 'assistant',
      text
    });

    setTimeout(() => {
      messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  function showTyping() {
    const messages = document.getElementById('elvChatMessages');
    const wrap = document.createElement('div');
    wrap.className = 'elv-typing-wrap';
    wrap.id = 'elvTyping';
    wrap.innerHTML = `
      <div class="elv-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messages.appendChild(wrap);
    setTimeout(() => {
      messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    }, 50);
    isTyping = true;
  }

  function hideTyping() {
    const el = document.getElementById('elvTyping');
    if (el) el.remove();
    isTyping = false;
  }

  async function sendMessage() {
    const input = document.getElementById('elvChatInput');
    const message = input.value.trim();
    if (!message || isTyping) return;

    input.value = '';
    input.focus();
    addMessage(message, 'user');
    showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: conversationHistory.slice(-10)
        })
      });

      const data = await response.json();
      hideTyping();

      if (data.reply) {
        addMessage(data.reply, 'bot', data.wantsToBuy);
      } else {
        addMessage('Sorry, something went wrong. Please reach us on WhatsApp.', 'bot', true);
      }

    } catch (err) {
      hideTyping();
      addMessage('Connection issue. Please try again or reach us on WhatsApp.', 'bot', true);
    }
  }

  function openChat() {
    const panel = document.getElementById('elvChatPanel');
    const dot = document.querySelector('.elv-chat-dot');
    panel.classList.add('show');
    isOpen = true;
    if (dot) dot.style.display = 'none';

    if (conversationHistory.length === 0) {
      setTimeout(() => {
        addMessage('👋 Welcome to EL-NOVIK! I\'m here to help you find the perfect instrument or electronics. What can I help you with today?', 'bot');
      }, 350);
    }

    setTimeout(() => {
      document.getElementById('elvChatInput').focus();
    }, 300);
  }

  function closeChat() {
    const panel = document.getElementById('elvChatPanel');
    panel.classList.remove('show');
    panel.classList.remove('keyboard-open');
    isOpen = false;
  }

  function init() {
    buildWidget();

    document.getElementById('elvChatBtn').addEventListener('click', () => {
      isOpen ? closeChat() : openChat();
    });

    document.getElementById('elvChatClose').addEventListener('click', closeChat);
    document.getElementById('elvChatSend').addEventListener('click', sendMessage);

    document.getElementById('elvChatInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Mobile keyboard fix
    const input = document.getElementById('elvChatInput');
    const panel = document.getElementById('elvChatPanel');

    input.addEventListener('focus', function () {
      if (window.innerWidth <= 480) {
        panel.classList.add('keyboard-open');
        setTimeout(() => {
          document.getElementById('elvChatMessages').scrollTo({
            top: document.getElementById('elvChatMessages').scrollHeight,
            behavior: 'smooth'
          });
        }, 400);
      }
    });

    input.addEventListener('blur', function () {
      setTimeout(() => {
        panel.classList.remove('keyboard-open');
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();