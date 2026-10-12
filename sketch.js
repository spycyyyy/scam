let currentPage = 'home';
let pageHistory = ['home'];
let floatingImages = [];
let floatingImageAssets = new Array(16);
let loadedFloatingImageCount = 0;

class FloatingImage {
  constructor(imageAsset, bounds, size, velocityX, velocityY, rotation, rotationSpeed) {
    this.image = imageAsset;
    this.scale = size / Math.max(imageAsset.width, imageAsset.height);
    this.bounds = bounds;
    this.size = size;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    const { halfWidth, halfHeight } = this.getRotatedHalfExtents();
    this.x = random(bounds.left + halfWidth, bounds.right - halfWidth);
    this.y = random(bounds.top + halfHeight, bounds.bottom - halfHeight);
  }

  getRotatedHalfExtents() {
    const imageWidth = this.image.width * this.scale;
    const imageHeight = this.image.height * this.scale;
    const cosRotation = Math.abs(Math.cos(this.rotation));
    const sinRotation = Math.abs(Math.sin(this.rotation));

    return {
      halfWidth: (imageWidth * cosRotation + imageHeight * sinRotation) / 2,
      halfHeight: (imageWidth * sinRotation + imageHeight * cosRotation) / 2
    };
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
    this.rotation += this.rotationSpeed;

    const { halfWidth, halfHeight } = this.getRotatedHalfExtents();
    if (this.x < this.bounds.left + halfWidth || this.x > this.bounds.right - halfWidth) {
      this.velocityX *= -1;
      this.x = constrain(this.x, this.bounds.left + halfWidth, this.bounds.right - halfWidth);
    }
    if (this.y < this.bounds.top + halfHeight || this.y > this.bounds.bottom - halfHeight) {
      this.velocityY *= -1;
      this.y = constrain(this.y, this.bounds.top + halfHeight, this.bounds.bottom - halfHeight);
    }
  }

  draw() {
    this.update();
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    imageMode(CENTER);
    image(this.image, 0, 0, this.image.width * this.scale, this.image.height * this.scale);
    pop();
  }
}

function layoutFloatingImages() {
  const columns = 4;
  const rows = 4;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const maxImageSize = Math.min(cellWidth, cellHeight) * 0.68;
  const cellIndexes = Array.from({ length: floatingImageAssets.length }, (_, index) => index);

  for (let index = cellIndexes.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cellIndexes[index], cellIndexes[swapIndex]] = [cellIndexes[swapIndex], cellIndexes[index]];
  }

  floatingImages = floatingImageAssets.map((imageAsset, imageIndex) => {
    const cellIndex = cellIndexes[imageIndex];
    const column = cellIndex % columns;
    const row = Math.floor(cellIndex / columns);
    const bounds = {
      left: column * cellWidth,
      right: (column + 1) * cellWidth,
      top: row * cellHeight,
      bottom: (row + 1) * cellHeight
    };
    const size = maxImageSize * random(0.58, 0.98);

    return new FloatingImage(
      imageAsset,
      bounds,
      size,
      random(-1.2, 1.2),
      random(-0.9, 0.9),
      random(-0.2, 0.2),
      random(-0.003, 0.003)
    );
  });
}

function setup() {
  // Hidden 1x1 dummy canvas to satisfy p5 setup lifecycle
  let canvas = createCanvas(1, 1);
  canvas.parent('canvas-container');

  // Initialize Page 1 (Captcha Matrix)
  if (typeof initCaptchaPage === 'function') {
    initCaptchaPage();
  }

  // Initialize Page 2 (Waves)
  if (typeof setupPage2 === 'function') {
    setupPage2();
  }

  // Initialize Page 3-5
  if (typeof setupPage3 === 'function') {
    setupPage3();
  }
  if (typeof setupPage4 === 'function') {
    setupPage4();
  }
  if (typeof setupPage5 === 'function') {
    setupPage5();
  }

  for (let imageNumber = 1; imageNumber <= 16; imageNumber++) {
    const extension = imageNumber === 15 ? 'jpg' : 'png';
    const imageAssetUrl = new URL(
      `./assests/${imageNumber}.${extension}`,
      document.currentScript ? document.currentScript.src : document.baseURI
    ).href;

    loadImage(
      imageAssetUrl,
      (imageAsset) => {
        floatingImageAssets[imageNumber - 1] = imageAsset;
        loadedFloatingImageCount++;
        if (loadedFloatingImageCount === floatingImageAssets.length) {
          layoutFloatingImages();
        }
        if (currentPage === 'home') loop();
      },
      (error) => console.error(`Unable to load image asset at ${imageAssetUrl}.`, error)
    );
  }

  updateUI();
}

function draw() {
  if (currentPage === 'home' || currentPage === 'page1') {
    clear();
  } else if (currentPage === 'page2' && typeof drawPage2 === 'function') {
    drawPage2();
  } else if (currentPage === 'page3' && typeof drawPage3 === 'function') {
    drawPage3();
  } else if (currentPage === 'page4' && typeof drawPage4 === 'function') {
    drawPage4();
  } else if (currentPage === 'page5' && typeof drawPage5 === 'function') {
    drawPage5();
  }

  floatingImages.forEach((floatingImage) => floatingImage.draw());
}

function goTo(pageName) {
  if (currentPage !== pageName) {
    currentPage = pageName;
    pageHistory.push(pageName);
    updateUI();
  }
}

function goBack() {
  if (pageHistory.length > 1) {
    pageHistory.pop();
    currentPage = pageHistory[pageHistory.length - 1];
    updateUI();
  }
}

function reloadCurrentPage() {
  if (currentPage === 'page1' && typeof refreshAllCaptchas === 'function') {
    refreshAllCaptchas();
  } else if (currentPage === 'page2' && typeof setupPage2 === 'function') {
    setupPage2();
  } else if (currentPage === 'page3' && typeof setupPage3 === 'function') {
    setupPage3();
  } else if (currentPage === 'page4' && typeof setupPage4 === 'function') {
    setupPage4();
  } else if (currentPage === 'page5' && typeof setupPage5 === 'function') {
    setupPage5();
  }
}

function resizeHomeCanvas() {
  const viewport = document.getElementById('main-viewport');
  if (!viewport) return;

  const canvasWidth = Math.max(1, viewport.clientWidth);
  const canvasHeight = Math.max(1, viewport.clientHeight);
  if (canvasWidth !== width || canvasHeight !== height) {
    resizeCanvas(canvasWidth, canvasHeight);
    if (loadedFloatingImageCount === floatingImageAssets.length) {
      layoutFloatingImages();
    }
  }
}

function updateUI() {
  // Address Bar
  document.getElementById('address-bar').innerText = 'https://my-browser.local/' + currentPage;

  // Active Tab Highlight
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  let activeTab = document.getElementById('tab-' + currentPage);
  if (activeTab) activeTab.classList.add('active');

  // Back Button State
  let backBtn = document.getElementById('btn-back');
  if (pageHistory.length > 1) {
    backBtn.removeAttribute('disabled');
  } else {
    backBtn.setAttribute('disabled', 'true');
  }

  // View Routing
  const homeView = document.getElementById('home-view');
  const captchaView = document.getElementById('captcha-view');
  const canvasContainer = document.getElementById('canvas-container');

  homeView.style.display = 'none';
  captchaView.style.display = 'none';
  canvasContainer.style.display = 'none';
  canvasContainer.classList.toggle('home-background', currentPage === 'home');

  if (currentPage === 'home') {
    homeView.style.display = 'block';
    canvasContainer.style.display = 'block';
    resizeHomeCanvas();
    loop();
  } else if (currentPage === 'page1') {
    captchaView.style.display = 'block';
    canvasContainer.style.display = 'block';
    loop();
  } else if (currentPage === 'page2' || currentPage === 'page3' || currentPage === 'page4' || currentPage === 'page5') {
    canvasContainer.style.display = 'block';
    loop();
  }
}
