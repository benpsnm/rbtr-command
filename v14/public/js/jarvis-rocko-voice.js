// ═══════════════════════════════════════════════════════════════════════════
// JARVIS — Rocko Voice Interaction System
// Canvas waveform + voice input (Whisper STT) + voice output (ElevenLabs TTS)
// Synced text reveal matching audio playback
// ═══════════════════════════════════════════════════════════════════════════

class RockoVoice {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.analyser = null;
    this.audioContext = null;
    this.micStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];

    this.state = 'idle'; // idle, listening, thinking, speaking
    this.sessionId = `session_${Date.now()}`;

    this.animationId = null;
    this.waveformData = new Uint8Array(128);

    // For synced text reveal
    this.currentAudio = null;
    this.currentText = '';
    this.currentWordIndex = 0;
    this.words = [];
    this.speechStartTime = 0;
    this.estimatedWPM = 150; // words per minute for sync estimation

    // Chat history
    this.chatHistory = [];
    this.MAX_HISTORY = 20;
  }

  // ── INITIALIZATION ───────────────────────────────────────────────────────
  async init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('[Rocko] Canvas not found:', canvasId);
      return false;
    }

    this.ctx = this.canvas.getContext('2d');
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Start ambient animation
    this.startAmbientAnimation();
    this.updateStateText('Rocko ready. Click mic or press spacebar to talk.');

    // Spacebar hold-to-talk
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && this.state === 'idle') {
        e.preventDefault();
        this.startListening();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.state === 'listening') {
        e.preventDefault();
        this.stopListening();
      }
    });

    return true;
  }

  // ── WAVEFORM RENDERING ───────────────────────────────────────────────────
  startAmbientAnimation() {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Static waveform for accessibility
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const centerY = this.canvas.height / 2;
      this.ctx.strokeStyle = 'rgba(184, 115, 51, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);
      this.ctx.lineTo(this.canvas.width, centerY);
      this.ctx.stroke();
      return;
    }

    const draw = () => {
      if (this.state !== 'idle') {
        this.animationId = requestAnimationFrame(draw);
        return;
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Ambient breathing line
      const centerY = this.canvas.height / 2;
      const time = Date.now() * 0.001;
      const breathe = Math.sin(time * 0.5) * 3;

      this.ctx.strokeStyle = 'rgba(184, 115, 51, 0.6)'; // copper
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY + breathe);

      for (let x = 0; x < this.canvas.width; x += 10) {
        const wave = Math.sin((x + time * 50) * 0.02) * 2;
        this.ctx.lineTo(x, centerY + breathe + wave);
      }

      this.ctx.stroke();
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }

  drawListeningWaveform() {
    if (!this.analyser || this.state !== 'listening') return;

    this.analyser.getByteTimeDomainData(this.waveformData);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(184, 115, 51, 1)'; // copper
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();

    const sliceWidth = this.canvas.width / this.waveformData.length;
    let x = 0;

    for (let i = 0; i < this.waveformData.length; i++) {
      const v = this.waveformData[i] / 128.0;
      const y = (v * this.canvas.height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.stroke();
    this.animationId = requestAnimationFrame(() => this.drawListeningWaveform());
  }

  drawThinkingAnimation() {
    const draw = () => {
      if (this.state !== 'thinking') return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const time = Date.now() * 0.003;
      const radius = 20 + Math.sin(time) * 5;

      // Pulsing dotted ring
      this.ctx.strokeStyle = 'rgba(184, 115, 51, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }

  drawSpeakingWaveform() {
    if (this.state !== 'speaking') return;

    // If we have audio analyser, use it; otherwise fake amplitude
    if (this.currentAudio && this.analyser) {
      this.analyser.getByteTimeDomainData(this.waveformData);

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.strokeStyle = 'rgba(184, 115, 51, 1)';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();

      const sliceWidth = this.canvas.width / this.waveformData.length;
      let x = 0;

      for (let i = 0; i < this.waveformData.length; i++) {
        const v = this.waveformData[i] / 128.0;
        const y = (v * this.canvas.height) / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.ctx.stroke();
    } else {
      // Fake animated waveform during speech
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const centerY = this.canvas.height / 2;
      const time = Date.now() * 0.005;

      this.ctx.strokeStyle = 'rgba(184, 115, 51, 1)';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);

      for (let x = 0; x < this.canvas.width; x += 5) {
        const wave = Math.sin((x + time * 100) * 0.05) * 15 * Math.random();
        this.ctx.lineTo(x, centerY + wave);
      }

      this.ctx.stroke();
    }

    this.animationId = requestAnimationFrame(() => this.drawSpeakingWaveform());
  }

  // ── VOICE INPUT ──────────────────────────────────────────────────────────
  async startListening() {
    if (this.state !== 'idle') return;

    try {
      // Request microphone access
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup analyser for visual feedback
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.waveformData = new Uint8Array(this.analyser.frequencyBinCount);

      // Setup media recorder
      this.mediaRecorder = new MediaRecorder(this.micStream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAudio();
      };

      this.mediaRecorder.start();
      this.state = 'listening';
      this.updateStateText('Listening...');
      document.getElementById('rockoMicBtn').classList.add('rocko-mic-btn--active');

      cancelAnimationFrame(this.animationId);
      this.drawListeningWaveform();

    } catch (error) {
      console.error('[Rocko] Microphone access denied:', error);
      this.updateStateText('Microphone access denied. Please enable and try again.');
      this.handleError('mic_denied');
    }
  }

  stopListening() {
    if (this.state !== 'listening') return;

    this.mediaRecorder.stop();
    this.micStream.getTracks().forEach(track => track.stop());

    this.state = 'thinking';
    this.updateStateText('Processing...');
    document.getElementById('rockoMicBtn').classList.remove('rocko-mic-btn--active');

    cancelAnimationFrame(this.animationId);
    this.drawThinkingAnimation();
  }

  async processAudio() {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

    try {
      // Send to server-side STT proxy (keeps API key secure)
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const whisperResponse = await fetch('/api/rocko/stt', {
        method: 'POST',
        body: formData,
      });

      if (!whisperResponse.ok) {
        const errorData = await whisperResponse.json();
        if (errorData.fallback === 'text_input') {
          console.warn('[Rocko] STT unavailable, falling back to text input');
          this.updateStateText('Speech recognition unavailable. Use text input below (double-click mic).');
          this.handleError('stt_unavailable', new Error(errorData.message));
          this.resetToIdle();
          return;
        }
        throw new Error(`STT failed: ${whisperResponse.status}`);
      }

      const { text } = await whisperResponse.json();
      this.updateStateText(text);

      // Send to Rocko
      await this.sendToRocko(text);

    } catch (error) {
      console.error('[Rocko] STT failed:', error);
      this.updateStateText('Speech recognition failed. Try text input below.');
      this.handleError('stt_failed', error);
      this.resetToIdle();
    }
  }

  // ── ROCKO CHAT ───────────────────────────────────────────────────────────
  async sendToRocko(message, retryCount = 0) {
    try {
      const response = await fetch('/api/rocko/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: this.sessionId,
        }),
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        this.updateStateText(`Rate limited. Retrying in ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.sendToRocko(message, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`Rocko API failed: ${response.status}`);
      }

      const data = await response.json();

      // Update state to speaking
      this.state = 'speaking';
      this.currentText = data.response;
      this.words = data.response.split(' ');
      this.currentWordIndex = 0;

      // Speak the response
      await this.speakText(data.response);

      // Handle any navigation actions from tools
      if (data.tools_called) {
        data.tools_called.forEach(tool => {
          if (tool.tool_name === 'navigate_to_module' && tool.result?.action === 'navigate') {
            setTimeout(() => {
              window.loadModule(tool.result.target);
            }, 500);
          }
        });
      }

    } catch (error) {
      console.error('[Rocko] Chat failed:', error);
      this.updateStateText('Rocko encountered an error. Please try again.');
      this.handleError('chat_failed', error);
      this.resetToIdle();
    }
  }

  // ── VOICE OUTPUT ─────────────────────────────────────────────────────────
  async speakText(text) {
    try {
      cancelAnimationFrame(this.animationId);
      this.drawSpeakingWaveform();

      // Call server-side TTS proxy (keeps API key secure)
      const response = await fetch('/api/rocko/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.fallback === 'text_only') {
          console.warn('[Rocko] TTS unavailable, falling back to text-only');
          await this.displayTextOnly(text);
          return;
        }
        throw new Error(`TTS failed: ${response.status}`);
      }

      // Get audio blob and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.currentAudio = new Audio(audioUrl);
      this.speechStartTime = Date.now();

      // Start synced text reveal
      this.startTextReveal();

      await this.currentAudio.play();

      // Wait for audio to finish
      await new Promise((resolve) => {
        this.currentAudio.onended = resolve;
      });

      this.resetToIdle();

    } catch (error) {
      console.error('[Rocko] TTS failed:', error);
      // Fallback to text-only
      await this.displayTextOnly(text);
    }
  }

  async displayTextOnly(text) {
    // Fallback: reveal text with typing effect, no audio
    this.updateStateText('');
    const textContainer = document.getElementById('rockoStateText');

    for (let i = 0; i < text.length; i++) {
      textContainer.textContent += text[i];
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    setTimeout(() => this.resetToIdle(), 2000);
  }

  startTextReveal() {
    const textContainer = document.getElementById('rockoStateText');
    textContainer.innerHTML = '';

    const reveal = () => {
      if (this.state !== 'speaking' || !this.currentAudio) {
        return;
      }

      // Calculate expected word index based on time elapsed
      const elapsed = Date.now() - this.speechStartTime;
      const elapsedSeconds = elapsed / 1000;
      const expectedWordIndex = Math.floor((elapsedSeconds / 60) * this.estimatedWPM);

      // Reveal words up to current index
      const wordsToShow = this.words.slice(0, Math.min(expectedWordIndex + 1, this.words.length));
      const html = wordsToShow.map((word, idx) => {
        const isActive = idx === expectedWordIndex;
        return `<span class="${isActive ? 'rocko-text-active' : ''}">${word}</span>`;
      }).join(' ');

      textContainer.innerHTML = html;

      this.currentWordIndex = expectedWordIndex;

      requestAnimationFrame(reveal);
    };

    reveal();
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  updateStateText(text) {
    const textEl = document.getElementById('rockoStateText');
    if (textEl) {
      textEl.textContent = text;
    }
  }

  resetToIdle() {
    this.state = 'idle';
    this.currentAudio = null;
    this.currentText = '';
    this.currentWordIndex = 0;
    this.updateStateText('Rocko ready.');

    cancelAnimationFrame(this.animationId);
    this.startAmbientAnimation();
  }

  handleError(errorType, error) {
    // Log to console and show user-friendly message
    console.error(`[Rocko Error: ${errorType}]`, error);

    switch (errorType) {
      case 'mic_denied':
        JARVIS.Toast({ message: 'Microphone access denied. Check browser permissions.', duration: 4000 });
        break;
      case 'stt_failed':
        JARVIS.Toast({ message: 'Speech recognition failed. Try text input or check API keys.', duration: 4000 });
        break;
      case 'chat_failed':
        JARVIS.Toast({ message: 'Rocko chat failed. Check connection and try again.', duration: 4000 });
        break;
      default:
        JARVIS.Toast({ message: 'An error occurred. Please try again.', duration: 3000 });
    }
  }

  // ── TEXT INPUT FALLBACK ──────────────────────────────────────────────────
  async sendTextMessage(message) {
    if (!message.trim()) return;

    this.state = 'thinking';
    this.updateStateText(`You: ${message}`);
    cancelAnimationFrame(this.animationId);
    this.drawThinkingAnimation();

    await this.sendToRocko(message);
  }

  // ── CONVERSATION MANAGEMENT ──────────────────────────────────────────────
  clearConversation() {
    this.sessionId = `session_${Date.now()}`;
    this.chatHistory = [];
    this.renderChatHistory();
    JARVIS.Toast({ message: 'Conversation cleared', duration: 2000 });
    this.resetToIdle();
  }

  // ── CHAT HISTORY UI ──────────────────────────────────────────────────────
  addMessageToHistory(role, message) {
    this.chatHistory.push({ role, message, timestamp: Date.now() });

    // Keep only last MAX_HISTORY messages
    if (this.chatHistory.length > this.MAX_HISTORY) {
      this.chatHistory = this.chatHistory.slice(-this.MAX_HISTORY);
    }

    this.renderChatHistory();
  }

  renderChatHistory() {
    const container = document.getElementById('rockoChatHistory');
    if (!container) return;

    if (this.chatHistory.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    this.chatHistory.forEach(({ role, message }) => {
      const messageEl = document.createElement('div');
      messageEl.className = `rocko-chat-message rocko-chat-message--${role}`;

      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'rocko-chat-bubble';
      bubbleEl.textContent = message;

      messageEl.appendChild(bubbleEl);
      container.appendChild(messageEl);
    });

    // Auto-scroll to latest message
    container.scrollTop = container.scrollHeight;
  }
}

// Initialize Rocko globally
window.Rocko = new RockoVoice();
