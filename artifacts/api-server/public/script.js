const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const USER_ID = "test_user_" + Math.floor(Math.random() * 9000 + 1000);
let typingEl = null;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, text, state) {
  const isOrderDone = text.includes("Buyurtmangiz qabul qilindi");

  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (isOrderDone ? " order-done" : "");
  bubble.textContent = isOrderDone ? "✅ Buyurtma yaratildi — " + text : text;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = formatTime(new Date());

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  messages.appendChild(wrapper);

  if (state && role === "ai") {
    const badge = document.createElement("div");
    badge.className = "state-badge";
    badge.textContent = state;
    messages.appendChild(badge);
  }

  scrollBottom();
}

function showTyping() {
  typingEl = document.createElement("div");
  typingEl.className = "message ai";
  typingEl.innerHTML = `
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  messages.appendChild(typingEl);
  scrollBottom();
}

function hideTyping() {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function setLoading(on) {
  input.disabled = on;
  sendBtn.disabled = on;
  if (!on) input.focus();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";
  setLoading(true);
  showTyping();

  try {
    const res = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, message: text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Server error");
    }

    const data = await res.json();
    hideTyping();
    appendMessage("ai", data.reply, data.state);
  } catch (err) {
    hideTyping();
    appendMessage("ai", "⚠️ Xatolik yuz berdi: " + err.message);
  } finally {
    setLoading(false);
  }
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-greet on load
window.addEventListener("load", () => {
  input.focus();
});
