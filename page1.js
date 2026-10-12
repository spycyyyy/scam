const CAPTCHA_CONFIG = {
  layout: {
    minCols: 3,
    minRows: 4,
    gap: 5,
    tileWidth: 250,
    tileHeight: 100,
    defaultCols: 3,
    defaultRows: 12,
    viewportPadding: 32,
    viewportHeightFactor: 0.7,
  },
  canvas: {
    scratchWidth: 68,
    scratchHeight: 78,
  },
  typing: {
    initialMinDelay: 200,
    initialMaxDelay: 2400,
    characterMinDelay: 270,
    characterMaxDelay: 270,
    pauseMinDelay: 0,
    pauseMaxDelay: 0,
    errorShakeDuration: 100,
    resetMinDelay: 300,
    resetMaxDelay: 300,
  },
  distortion: {
    minMethods: 1,
    maxMethods: 2,
    noiseMinCount: 30,
    noiseMaxCount: 50,
    lineCount:1,
  },
  wordFetch: {
    maxWords: 30,
    minWordLength: 3,
    maxWordLength: 10,
    allowLowercase: true,
    allowUppercase: true,
    allowNumbers: true,
    allowSymbols: true,
    symbolSet: "!@#$%^&*",
    minGeneratedLength: 10,
    maxGeneratedLength: 20,
    useRandomTextFallback: true,
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRandomCharacterPool() {
  let pool = "";

  if (CAPTCHA_CONFIG.wordFetch.allowUppercase) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (CAPTCHA_CONFIG.wordFetch.allowLowercase) pool += "abcdefghijklmnopqrstuvwxyz";
  if (CAPTCHA_CONFIG.wordFetch.allowNumbers) pool += "0123456789";
  if (CAPTCHA_CONFIG.wordFetch.allowSymbols) pool += CAPTCHA_CONFIG.wordFetch.symbolSet;

  return pool || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
}

function randomizeCharacterCase(char) {
  if (!/[A-Za-z]/.test(char)) return char;
  return Math.random() < 0.5 ? char.toUpperCase() : char.toLowerCase();
}

function generateRandomChallengeText(lengthRange = null) {
  const minLength = CAPTCHA_CONFIG.wordFetch.minGeneratedLength;
  const maxLength = CAPTCHA_CONFIG.wordFetch.maxGeneratedLength;
  const pool = buildRandomCharacterPool();
  const targetLength = lengthRange
    ? randomInt(lengthRange.min, lengthRange.max)
    : randomInt(minLength, maxLength);

  let text = "";
  for (let i = 0; i < targetLength; i++) {
    const char = pool[randomInt(0, pool.length - 1)];
    text += randomizeCharacterCase(char);
  }

  return text;
}

function randomizeTextValue(rawText) {
  if (!rawText) return generateRandomChallengeText();

  let cleaned = rawText.replace(/[^A-Za-z0-9]/g, "");
  if (!cleaned) return generateRandomChallengeText();

  const targetLength = Math.min(
    Math.max(cleaned.length, CAPTCHA_CONFIG.wordFetch.minGeneratedLength),
    CAPTCHA_CONFIG.wordFetch.maxGeneratedLength
  );

  let result = "";
  for (let i = 0; i < targetLength; i++) {
    const sourceChar = cleaned[i % cleaned.length] || cleaned[0];
    const char = Math.random() < 0.25 && CAPTCHA_CONFIG.wordFetch.allowSymbols
      ? CAPTCHA_CONFIG.wordFetch.symbolSet[randomInt(0, CAPTCHA_CONFIG.wordFetch.symbolSet.length - 1)]
      : sourceChar;
    result += randomizeCharacterCase(char);
  }

  return result;
}

const MIN_COLS = CAPTCHA_CONFIG.layout.minCols;
const GAP = CAPTCHA_CONFIG.layout.gap;
const TILE_W = CAPTCHA_CONFIG.layout.tileWidth;
const TILE_H = CAPTCHA_CONFIG.layout.tileHeight;
let COLS = CAPTCHA_CONFIG.layout.defaultCols;
let ROWS = CAPTCHA_CONFIG.layout.defaultRows;
let TOTAL_CAPTCHAS = COLS * ROWS;

function getCaptchaGridConfig() {
  const container = document.getElementById('captcha-view');
  const availableWidth = Math.max((container ? container.clientWidth : 900) - CAPTCHA_CONFIG.layout.viewportPadding, 0);
  const cols = Math.max(MIN_COLS, Math.floor((availableWidth + GAP) / (TILE_W + GAP)));
  const rows = Math.max(CAPTCHA_CONFIG.layout.minRows, Math.ceil((window.innerHeight * CAPTCHA_CONFIG.layout.viewportHeightFactor) / (TILE_H + GAP)));

  return {
    cols,
    rows,
    total: cols * rows
  };
}

const FONTS = [
  "Rubik Glitch",
  "Press Start 2P",
  "Creepster",
  "Permanent Marker",
  "Sedgwick Ave",
  "Cinzel Decorative",
  "Courier Prime",
  "Space Mono",
  "Montserrat",
  "Playfair Display"
];

const FALLBACK_WORDS = ["RIVER", "CLIFF", "STONE", "BEACH", "RIDGE", "SHORE", "OCEAN", "PEAK", "VALLEY", "STORM"];

const SCRATCH_W = CAPTCHA_CONFIG.canvas.scratchWidth;
const SCRATCH_H = CAPTCHA_CONFIG.canvas.scratchHeight;
let scratchCanvas;
let scratchCtx;
let captchaList = [];
let captchaResizeListenerBound = false;

// --- DISTORTION LIBRARY ---
const DistortionLibrary = {
  horizontalWave: (ctx, w, h) => {
    const copy = document.createElement("canvas");
    copy.width = w; copy.height = h;
    copy.getContext("2d").drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    const sliceH = 2;
    const freq = 0.14 + Math.random() * 0.12;
    const amp = 4.0 + Math.random() * 3.5;
    for (let y = 0; y < h; y += sliceH) {
      const xOffset = Math.sin(y * freq) * amp;
      ctx.drawImage(copy, 0, y, w, sliceH, xOffset, y, w, sliceH);
    }
  },

  verticalWave: (ctx, w, h) => {
    const copy = document.createElement("canvas");
    copy.width = w; copy.height = h;
    copy.getContext("2d").drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    const sliceW = 2;
    const freq = 0.12 + Math.random() * 0.12;
    const amp = 3.5 + Math.random() * 3.0;
    for (let x = 0; x < w; x += sliceW) {
      const yOffset = Math.cos(x * freq) * amp;
      ctx.drawImage(copy, x, 0, sliceW, h, x, yOffset, sliceW, h);
    }
  },

  stretchCompress: (ctx, w, h) => {
    const copy = document.createElement("canvas");
    copy.width = w; copy.height = h;
    copy.getContext("2d").drawImage(ctx.canvas, 0, 0);

    const scaleX = Math.random() > 0.5 ? 0.6 + Math.random() * 0.3 : 1.2 + Math.random() * 0.35;
    const scaleY = Math.random() > 0.5 ? 0.65 + Math.random() * 0.3 : 1.2 + Math.random() * 0.3;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(copy, -w / 2, -h / 2);
    ctx.restore();
  },

  skewShear: (ctx, w, h) => {
    const copy = document.createElement("canvas");
    copy.width = w; copy.height = h;
    copy.getContext("2d").drawImage(ctx.canvas, 0, 0);

    const shearX = (Math.random() * 0.7 - 0.35);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.transform(1, 0, shearX, 1, 0, 0);
    ctx.drawImage(copy, -w / 2, -h / 2);
    ctx.restore();
  },

  chromaticShift: (ctx, w, h) => {
    const offset = Math.floor(2 + Math.random() * 3);
    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    const output = ctx.createImageData(w, h);
    const outPixels = output.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let i = (y * w + x) * 4;
        let rIdx = (y * w + Math.min(w - 1, x + offset)) * 4;
        let bIdx = (y * w + Math.max(0, x - offset)) * 4;

        outPixels[i] = pixels[rIdx];
        outPixels[i + 1] = pixels[i + 1];
        outPixels[i + 2] = pixels[bIdx + 2];
        outPixels[i + 3] = pixels[i + 3];
      }
    }
    ctx.putImageData(output, 0, 0);
  },

  addNoiseDots: (ctx, w, h) => {
    const count = CAPTCHA_CONFIG.distortion.noiseMinCount + Math.floor(Math.random() * (CAPTCHA_CONFIG.distortion.noiseMaxCount - CAPTCHA_CONFIG.distortion.noiseMinCount + 1));
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `hsla(${Math.random() * 360}, 100%, 45%, 0.9)`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  addStrikeLines: (ctx, w, h) => {
    ctx.lineWidth = 2;
    for (let i = 0; i < CAPTCHA_CONFIG.distortion.lineCount; i++) {
      ctx.strokeStyle = `hsla(${Math.random() * 360}, 100%, 40%, 0.85)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, 0);
      ctx.lineTo(Math.random() * w, h);
      ctx.stroke();
    }
  }
};

const DISTORTION_METHODS = [
  DistortionLibrary.horizontalWave,
  DistortionLibrary.verticalWave,
  DistortionLibrary.stretchCompress,
  DistortionLibrary.skewShear,
  DistortionLibrary.chromaticShift,
  DistortionLibrary.addNoiseDots,
  DistortionLibrary.addStrikeLines
];

// --- CAPTCHA OBJECT CLASS ---
class CaptchaTile {
  constructor(container, id) {
    this.id = id;
    this.word = "";
    this.isDestroyed = false;

    this.box = document.createElement("div");
    Object.assign(this.box.style, {
      display: "flex",
      flexDirection: "column",
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "0px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
      transition: "border-color 0.2s"
    });

    this.canvas = document.createElement("canvas");
    this.canvas.width = TILE_W;
    this.canvas.height = TILE_H;
    this.ctx = this.canvas.getContext("2d");
    Object.assign(this.canvas.style, {
      display: "block",
      width: `${TILE_W}px`,
      height: `${TILE_H}px`
    });

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.maxLength = CAPTCHA_CONFIG.wordFetch.maxGeneratedLength;
    this.input.placeholder = "";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;

    Object.assign(this.input.style, {
      width: "100%",
      height: "28px",
      border: "none",
      borderTop: "1px solid #cbd5e1",
      borderRadius: "0px",
      padding: "2px 6px",
      fontSize: "20px",
      textAlign: "center",
      textTransform: "none",
      letterSpacing: "0.5px",
      outline: "none",
      background: "#ffffff",
      color: "#0f172a",
      boxSizing: "border-box",
      fontFamily: "Arial"
    });

    this.box.appendChild(this.canvas);
    this.box.appendChild(this.input);
    container.appendChild(this.box);

    this.refresh().then(() => {
      const initialDelay = Math.random() * (CAPTCHA_CONFIG.typing.initialMaxDelay - CAPTCHA_CONFIG.typing.initialMinDelay) + CAPTCHA_CONFIG.typing.initialMinDelay;
      setTimeout(() => this.runAutoTypingLoop(), initialDelay);
    });
  }

  async fetchRandomWord() {
    try {
      const res = await fetch(`https://api.datamuse.com/words?sp=?????&max=${CAPTCHA_CONFIG.wordFetch.maxWords}`);
      const data = await res.json();
      const candidates = data
        .map((d) => d.word)
        .filter((w) => {
          const cleaned = w.replace(/[^A-Za-z]/g, "");
          return cleaned.length >= CAPTCHA_CONFIG.wordFetch.minWordLength &&
            cleaned.length <= CAPTCHA_CONFIG.wordFetch.maxWordLength;
        });

      if (candidates.length > 0) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return randomizeTextValue(selected);
      }

      return CAPTCHA_CONFIG.wordFetch.useRandomTextFallback
        ? generateRandomChallengeText({ min: CAPTCHA_CONFIG.wordFetch.minGeneratedLength, max: CAPTCHA_CONFIG.wordFetch.maxGeneratedLength })
        : FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
    } catch (e) {
      return CAPTCHA_CONFIG.wordFetch.useRandomTextFallback
        ? generateRandomChallengeText({ min: CAPTCHA_CONFIG.wordFetch.minGeneratedLength, max: CAPTCHA_CONFIG.wordFetch.maxGeneratedLength })
        : FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
    }
  }

  drawLightBackground() {
    const ctx = this.ctx;
    const baseHue = Math.floor(Math.random() * 360);
    const grad = ctx.createLinearGradient(0, 0, TILE_W, TILE_H);
    grad.addColorStop(0, `hsl(${baseHue}, 70%, 92%)`);
    grad.addColorStop(1, `hsl(${(baseHue + 45) % 360}, 80%, 85%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TILE_W, TILE_H);
  }

  drawGeometricShapes() {
    const ctx = this.ctx;
    const count = 6 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      ctx.save();
      const shapeType = Math.floor(Math.random() * 4);
      const hue = Math.floor(Math.random() * 360);

      ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.25 + Math.random() * 0.3})`;
      ctx.strokeStyle = `hsla(${hue}, 100%, 42%, ${0.5 + Math.random() * 0.4})`;
      ctx.lineWidth = Math.random() * 2.5 + 1.5;

      if (shapeType === 0) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * TILE_W, Math.random() * TILE_H);
        ctx.bezierCurveTo(
          Math.random() * TILE_W, Math.random() * TILE_H,
          Math.random() * TILE_W, Math.random() * TILE_H,
          Math.random() * TILE_W, Math.random() * TILE_H
        );
        ctx.stroke();
      } else if (shapeType === 1) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * TILE_W,
          Math.random() * TILE_H,
          8 + Math.random() * 28,
          0,
          Math.PI * 2
        );
        Math.random() > 0.4 ? ctx.fill() : ctx.stroke();
      } else if (shapeType === 2) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * TILE_W, Math.random() * TILE_H);
        ctx.lineTo(Math.random() * TILE_W, Math.random() * TILE_H);
        ctx.lineTo(Math.random() * TILE_W, Math.random() * TILE_H);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.translate(Math.random() * TILE_W, Math.random() * TILE_H);
        ctx.rotate(Math.random() * Math.PI);
        ctx.strokeRect(-15, -15, 25 + Math.random() * 25, 25 + Math.random() * 25);
      }
      ctx.restore();
    }
  }

  distortText() {
    const chars = this.word.split("");
    const charSpacing = TILE_W / (chars.length + 1);

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const cw = SCRATCH_W;
      const ch = SCRATCH_H;

      scratchCtx.clearRect(0, 0, cw, ch);

      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)];
      const randomFontSize = Math.floor(Math.random() * 14 + 26);
      scratchCtx.font = `bold ${randomFontSize}px "${randomFont}", monospace, sans-serif`;
      scratchCtx.textAlign = "center";
      scratchCtx.textBaseline = "middle";

      const charHue = Math.floor(Math.random() * 360);
      scratchCtx.fillStyle = `hsl(${charHue}, 100%, 42%)`;
      scratchCtx.strokeStyle = `hsl(${(charHue + 180) % 360}, 100%, 15%)`;
      scratchCtx.lineWidth = 2.5;

      scratchCtx.strokeText(char, cw / 2, ch / 2);
      scratchCtx.fillText(char, cw / 2, ch / 2);

      const pickedMethods = [...DISTORTION_METHODS]
        .sort(() => 0.5 - Math.random())
        .slice(0, CAPTCHA_CONFIG.distortion.minMethods + Math.floor(Math.random() * (CAPTCHA_CONFIG.distortion.maxMethods - CAPTCHA_CONFIG.distortion.minMethods + 1)));

      pickedMethods.forEach((method) => method(scratchCtx, cw, ch));

      this.ctx.save();
      const cx = (i + 1) * charSpacing + (Math.random() * 6 - 3);
      const cy = TILE_H / 2 + (Math.random() * 28 - 14);
      const angle = (Math.random() * 70 - 35) * (Math.PI / 180);

      this.ctx.translate(cx, cy);
      this.ctx.rotate(angle);
      this.ctx.drawImage(scratchCanvas, -cw / 2, -ch / 2);
      this.ctx.restore();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, TILE_W, TILE_H);
    this.drawLightBackground();
    this.drawGeometricShapes();
    this.distortText();
  }

  async refresh() {
    this.input.value = "";
    this.box.style.borderColor = "#cbd5e1";
    this.word = await this.fetchRandomWord();
    this.render();
  }

  async runAutoTypingLoop() {
    const guessLen = this.word.length || randomInt(CAPTCHA_CONFIG.wordFetch.minGeneratedLength, CAPTCHA_CONFIG.wordFetch.maxGeneratedLength);
    let guess = "";

    for (let i = 0; i < guessLen; i++) {
      const pool = buildRandomCharacterPool();
      const char = pool[randomInt(0, pool.length - 1)];
      guess += randomizeCharacterCase(char);
    }

    if (guess === this.word) guess = "FAIL";

    this.input.value = "";
    this.input.style.borderTopColor = "#2563eb";
    this.input.style.background = "#f8fafc";

    for (let char of guess) {
      this.input.value += char;
      const charDelay = Math.random() * (CAPTCHA_CONFIG.typing.characterMaxDelay - CAPTCHA_CONFIG.typing.characterMinDelay) + CAPTCHA_CONFIG.typing.characterMinDelay;
      await new Promise((r) => setTimeout(r, charDelay));
    }

    const pauseDelay = Math.random() * (CAPTCHA_CONFIG.typing.pauseMaxDelay - CAPTCHA_CONFIG.typing.pauseMinDelay) + CAPTCHA_CONFIG.typing.pauseMinDelay;
    await new Promise((r) => setTimeout(r, pauseDelay));

    this.box.style.borderColor = "#ef4444";
    this.input.style.borderTopColor = "#ef4444";
    this.box.animate(
      [
        { transform: "translateX(0px)" },
        { transform: `translateX(-${4}px)` },
        { transform: `translateX(${4}px)` },
        { transform: `translateX(-${4}px)` },
        { transform: `translateX(${4}px)` },
        { transform: "translateX(0px)" }
      ],
      { duration: CAPTCHA_CONFIG.typing.errorShakeDuration, easing: "ease-in-out" }
    );

    await new Promise((r) => setTimeout(r, CAPTCHA_CONFIG.typing.errorShakeDuration * 1.13));
    this.input.value = "";
    this.input.style.borderTopColor = "#cbd5e1";
    this.input.style.background = "#ffffff";

    const nextInterval = Math.random() * (CAPTCHA_CONFIG.typing.resetMaxDelay - CAPTCHA_CONFIG.typing.resetMinDelay) + CAPTCHA_CONFIG.typing.resetMinDelay;
    await new Promise((r) => setTimeout(r, nextInterval));
    await this.refresh();

    this.runAutoTypingLoop();
  }
}

function rebuildCaptchaGrid() {
  const container = document.getElementById('captcha-view');
  if (!container) return;

  const existingGrid = container.querySelector('div');
  if (existingGrid) {
    existingGrid.remove();
  }
  captchaList = [];

  const { cols, rows, total } = getCaptchaGridConfig();
  COLS = cols;
  ROWS = rows;
  TOTAL_CAPTCHAS = total;

  const gridContainer = document.createElement('div');
  Object.assign(gridContainer.style, {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
    gridTemplateRows: `repeat(${ROWS}, auto)`,
    gap: `${GAP}px`,
    boxSizing: 'border-box'
  });
  container.appendChild(gridContainer);

  scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = SCRATCH_W;
  scratchCanvas.height = SCRATCH_H;
  scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });

  for (let i = 0; i < TOTAL_CAPTCHAS; i++) {
    captchaList.push(new CaptchaTile(gridContainer, i));
  }
}

// Mounted directly into the browser viewport
function initCaptchaPage() {
  rebuildCaptchaGrid();

  if (!captchaResizeListenerBound) {
    captchaResizeListenerBound = true;
    window.addEventListener('resize', () => {
      if (document.getElementById('captcha-view') && document.getElementById('captcha-view').style.display !== 'none') {
        rebuildCaptchaGrid();
      }
    });
  }
}

function refreshAllCaptchas() {
  captchaList.forEach(c => c.refresh());
}
