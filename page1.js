const COLS = 5;
const ROWS = 6;
const TOTAL_CAPTCHAS = COLS * ROWS; // 30
const TILE_W = 160;
const TILE_H = 100;

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

const SCRATCH_W = 68;
const SCRATCH_H = 78;
let scratchCanvas;
let scratchCtx;
let captchaList = [];

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
    const count = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `hsla(${Math.random() * 360}, 100%, 45%, 0.9)`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  addStrikeLines: (ctx, w, h) => {
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
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
    this.input.maxLength = 8;
    this.input.placeholder = "type here";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;

    Object.assign(this.input.style, {
      width: "100%",
      height: "28px",
      border: "none",
      borderTop: "1px solid #cbd5e1",
      borderRadius: "0px",
      padding: "2px 6px",
      fontSize: "13px",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: "2px",
      outline: "none",
      background: "#ffffff",
      color: "#0f172a",
      boxSizing: "border-box",
      fontFamily: "monospace, sans-serif"
    });

    this.box.appendChild(this.canvas);
    this.box.appendChild(this.input);
    container.appendChild(this.box);

    this.refresh().then(() => {
      const initialDelay = Math.random() * 2200 + 200;
      setTimeout(() => this.runAutoTypingLoop(), initialDelay);
    });
  }

  async fetchRandomWord() {
    try {
      const res = await fetch(`https://api.datamuse.com/words?sp=?????&max=30`);
      const data = await res.json();
      const candidates = data.map((d) => d.word.toUpperCase()).filter((w) => /^[A-Z]{4,5}$/.test(w));
      return candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
    } catch (e) {
      return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
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
        .slice(0, 3 + Math.floor(Math.random() * 3));

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
    const guessLen = this.word.length || (Math.random() > 0.5 ? 5 : 4);
    let guess = "";
    for (let i = 0; i < guessLen; i++) {
      guess += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    if (guess === this.word) guess = "FAIL";

    this.input.value = "";
    this.input.style.borderTopColor = "#2563eb";
    this.input.style.background = "#f8fafc";

    for (let char of guess) {
      this.input.value += char;
      await new Promise((r) => setTimeout(r, Math.random() * 110 + 60));
    }

    await new Promise((r) => setTimeout(r, Math.random() * 220 + 160));

    this.box.style.borderColor = "#ef4444";
    this.input.style.borderTopColor = "#ef4444";
    this.box.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0px)" }
      ],
      { duration: 300, easing: "ease-in-out" }
    );

    await new Promise((r) => setTimeout(r, 340));
    this.input.value = "";
    this.input.style.borderTopColor = "#cbd5e1";
    this.input.style.background = "#ffffff";

    const nextInterval = Math.random() * 1200 + 400;
    await new Promise((r) => setTimeout(r, nextInterval));
    await this.refresh();

    this.runAutoTypingLoop();
  }
}

// Mounted directly into the browser viewport
function initCaptchaPage() {
  const container = document.getElementById("captcha-view");

  const gridContainer = document.createElement("div");
  Object.assign(gridContainer.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
    gridTemplateRows: `repeat(${ROWS}, auto)`,
    gap: "12px",
    boxSizing: "border-box"
  });
  container.appendChild(gridContainer);

  scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = SCRATCH_W;
  scratchCanvas.height = SCRATCH_H;
  scratchCtx = scratchCanvas.getContext("2d", { willReadFrequently: true });

  for (let i = 0; i < TOTAL_CAPTCHAS; i++) {
    captchaList.push(new CaptchaTile(gridContainer, i));
  }
}

function refreshAllCaptchas() {
  captchaList.forEach(c => c.refresh());
}
