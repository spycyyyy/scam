const SLIDECAPCHA_CONFIG = {
  layout: {
    tileWidth: 190,
    tileHeight: 150,
    gap: 6,
    padding: 8,
    minRows: 2,
  },
  image: {
    width: 400,
    height: 300,
    maxAttempts: 5,
  },
  puzzle: {
    sizeRatio: 0.18,
    minSize: 24,
    maxSize: 54,
    edgePadding: 8,
  },
  slider: {
    height: 38,
    trackWeight: 4,
    knobRadius: 6,
    successDisplayDuration: 2000,
  },
  successOverlay: {
    maxIconSize: 46,
    iconSizeRatio: 0.34,
    verticalGap: 4,
    titleFontSize: 20,
    detailFontSize: 10,
  },
  failure: {
    minTimeLimitSeconds: 3,
    maxTimeLimitSeconds: 11,
    displayDuration: 1000,
    maxIconSize: 30,
    iconSizeRatio: 0.32,
    verticalGap: 2,
    titleFontSize: 20,
    detailFontSize: 10,
    pulseSpeed: 0.008,
    shakeAmplitude: 1.5,
  },
  animation: {
    minSpeed: 24,
    maxSpeed: 60,
  },
};

let slideCapchaCanvas;
let slideCapchaItems = [];
let slideCapchaPhotoRequest = 0;
let slideCapchaActiveDrag = null;
let slideCapchaResizeBound = false;
let slideCapchaResizeObserver;

function slideCapchaCanvasSize() {
  const viewport = document.getElementById('main-viewport');
  return {
    width: Math.max(1, viewport ? viewport.clientWidth : windowWidth),
    height: Math.max(1, viewport ? viewport.clientHeight : windowHeight),
  };
}

function setupPage2() {
  const { width: canvasWidth, height: canvasHeight } = slideCapchaCanvasSize();

  if (slideCapchaCanvas) {
    resizeCanvas(canvasWidth, canvasHeight);
  } else {
    slideCapchaCanvas = createCanvas(canvasWidth, canvasHeight);
    slideCapchaCanvas.parent('canvas-container');
    Object.assign(slideCapchaCanvas.elt.style, {
      display: 'block',
      width: '100%',
      height: '100%',
    });
  }

  if (!slideCapchaResizeBound) {
    slideCapchaResizeBound = true;
    window.addEventListener('resize', resizeSlideCapchaCanvas);
    const viewport = document.getElementById('main-viewport');
    if (viewport && typeof ResizeObserver !== 'undefined') {
      slideCapchaResizeObserver = new ResizeObserver(resizeSlideCapchaCanvas);
      slideCapchaResizeObserver.observe(viewport);
    }
  }

  rebuildSlideCapchaGrid();
  loadSlideCapchaPhotos();
}

function resizeSlideCapchaCanvas() {
  if (!slideCapchaCanvas) return;

  const previousItemCount = slideCapchaItems.length;
  const { width: canvasWidth, height: canvasHeight } = slideCapchaCanvasSize();
  if (canvasWidth === width && canvasHeight === height) return;

  resizeCanvas(canvasWidth, canvasHeight);
  rebuildSlideCapchaGrid();
  if (slideCapchaItems.length !== previousItemCount) {
    loadSlideCapchaPhotos();
  }
}

function rebuildSlideCapchaGrid() {
  const previousItems = slideCapchaItems;
  slideCapchaActiveDrag = null;
  const layout = SLIDECAPCHA_CONFIG.layout;
  const availableWidth = Math.max(1, width - layout.padding * 2);
  const availableHeight = Math.max(1, height - layout.padding * 2);
  const cols = Math.max(1, Math.floor((availableWidth + layout.gap) / (layout.tileWidth + layout.gap)));
  const rows = Math.max(
    layout.minRows,
    Math.floor((availableHeight + layout.gap) / (layout.tileHeight + layout.gap))
  );
  const tileWidth = Math.min(
    layout.tileWidth,
    (availableWidth - layout.gap * (cols - 1)) / cols
  );
  const tileHeight = (availableHeight - layout.gap * (rows - 1)) / rows;
  const gridWidth = cols * tileWidth + (cols - 1) * layout.gap;
  const startX = (width - gridWidth) / 2;

  slideCapchaItems = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const item = {
        index: row * cols + col,
        x: startX + col * (tileWidth + layout.gap),
        y: layout.padding + row * (tileHeight + layout.gap),
        width: tileWidth,
        height: tileHeight,
        status: 'loading',
        solved: false,
        successTimer: null,
        timerStartedAt: null,
        solveTime: null,
        challengeStartedAt: null,
        timeLimitMs: 0,
        failureStartedAt: null,
        failureTimer: null,
        roundId: 0,
        photo: null,
        photoError: null,
        crop: null,
        pieceSize: 0,
        targetX: 0,
        targetY: 0,
        pieceX: 0,
        destinationX: 0,
        speed: 0,
      };

      const previousItem = previousItems[item.index];
      if (previousItem) {
        item.photo = previousItem.photo;
        item.status = previousItem.status;
        item.photoError = previousItem.photoError;
        item.solved = previousItem.solved;
        item.timerStartedAt = previousItem.timerStartedAt;
        item.solveTime = previousItem.solveTime;
        item.challengeStartedAt = previousItem.challengeStartedAt;
        item.timeLimitMs = previousItem.timeLimitMs;
        item.failureStartedAt = previousItem.failureStartedAt;
        item.failureTimer = previousItem.failureTimer;
        item.roundId = previousItem.roundId;
      }
      prepareSlideCapchaItem(item);
      slideCapchaItems.push(item);
    }
  }
}

function prepareSlideCapchaItem(item) {
  const sliderHeight = Math.min(SLIDECAPCHA_CONFIG.slider.height, item.height * 0.4);
  const imageHeight = Math.max(1, item.height - sliderHeight);
  item.crop = null;
  item.imageHeight = imageHeight;

  if (item.photo) {
    const scale = Math.max(item.width / item.photo.width, imageHeight / item.photo.height);
    const sourceWidth = item.width / scale;
    const sourceHeight = imageHeight / scale;
    item.crop = {
      x: (item.photo.width - sourceWidth) / 2,
      y: (item.photo.height - sourceHeight) / 2,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  item.pieceSize = Math.min(
    SLIDECAPCHA_CONFIG.puzzle.maxSize,
    Math.max(
      SLIDECAPCHA_CONFIG.puzzle.minSize,
      Math.min(item.width, imageHeight) * SLIDECAPCHA_CONFIG.puzzle.sizeRatio
    ),
    item.width,
    imageHeight
  );

  const maxX = Math.max(0, item.width - item.pieceSize);
  const maxY = Math.max(0, imageHeight - item.pieceSize);
  const inset = Math.min(SLIDECAPCHA_CONFIG.puzzle.edgePadding, maxX / 2, maxY / 2);
  item.targetX = inset + Math.random() * Math.max(0, maxX - inset * 2);
  item.targetY = inset + Math.random() * Math.max(0, maxY - inset * 2);
  item.pieceX = Math.random() * maxX;
  chooseSlideCapchaDestination(item);
}

function loadSlideCapchaPhotos() {
  const requestId = ++slideCapchaPhotoRequest;
  slideCapchaItems.forEach((item) => {
    item.status = 'loading';
    item.solved = false;
    item.photo = null;
    item.photoError = null;
    loadRandomSlideCapchaPhoto(item.index, requestId);
  });
}

function loadRandomSlideCapchaPhoto(index, requestId, attempt = 1) {
  if (requestId !== slideCapchaPhotoRequest) return;
  const config = SLIDECAPCHA_CONFIG.image;
  const item = slideCapchaItems[index];
  if (!item) return;

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const photoUrl = `https://picsum.photos/seed/${seed}/${config.width}/${config.height}`;
  loadImage(
    photoUrl,
    (loadedPhoto) => {
      if (requestId !== slideCapchaPhotoRequest) return;
      const target = slideCapchaItems[index];
      if (!target) return;
      target.photo = loadedPhoto;
      target.status = 'ready';
      target.solved = false;
      target.successTimer = null;
      target.timerStartedAt = null;
      target.solveTime = null;
      target.challengeStartedAt = Date.now();
      target.timeLimitMs = randomSlideCapchaTimeLimit();
      target.failureStartedAt = null;
      target.failureTimer = null;
      target.roundId++;
      prepareSlideCapchaItem(target);
    },
    (error) => retrySlideCapchaPhoto(index, requestId, attempt, error)
  );
}

function retrySlideCapchaPhoto(index, requestId, attempt, error) {
  if (requestId !== slideCapchaPhotoRequest) return;

  if (attempt < SLIDECAPCHA_CONFIG.image.maxAttempts) {
    loadRandomSlideCapchaPhoto(index, requestId, attempt + 1);
    return;
  }

  const item = slideCapchaItems[index];
  if (!item) return;
  item.status = 'error';
  item.photoError = error;
  console.error(`Unable to load slide CAPTCHA photo for tile ${index + 1}.`, error);
}

function randomSlideCapchaTimeLimit() {
  const { minTimeLimitSeconds, maxTimeLimitSeconds } = SLIDECAPCHA_CONFIG.failure;
  return (minTimeLimitSeconds + Math.random() * (maxTimeLimitSeconds - minTimeLimitSeconds)) * 1000;
}

function chooseSlideCapchaDestination(item) {
  const maxX = Math.max(0, item.width - item.pieceSize);
  item.destinationX = Math.random() * maxX;
  item.speed = SLIDECAPCHA_CONFIG.animation.minSpeed +
    Math.random() * (SLIDECAPCHA_CONFIG.animation.maxSpeed - SLIDECAPCHA_CONFIG.animation.minSpeed);
}

function drawPage2() {
  background(248);

  slideCapchaItems.forEach((item) => {
    checkSlideCapchaTimeLimit(item);
    drawSlideCapchaItem(item);
    animateSlideCapchaItem(item);
  });
}

function checkSlideCapchaTimeLimit(item) {
  if (
    item.status === 'ready' &&
    !item.solved &&
    item.challengeStartedAt !== null &&
    Date.now() - item.challengeStartedAt >= item.timeLimitMs
  ) {
    failSlideCapchaItem(item);
  }
}

function failSlideCapchaItem(item) {
  if (item.status !== 'ready' || item.solved) return;

  item.status = 'failed';
  item.failureStartedAt = Date.now();
  item.speed = 0;
  const roundId = item.roundId;
  item.failureTimer = setTimeout(() => {
    const target = slideCapchaItems[item.index];
    if (!target || target.roundId !== roundId || target.status !== 'failed') return;
    target.status = 'refreshing';
    loadRandomSlideCapchaPhoto(target.index, slideCapchaPhotoRequest);
  }, SLIDECAPCHA_CONFIG.failure.displayDuration);
}

function drawSlideCapchaItem(item) {
  const sliderHeight = item.height - item.imageHeight;
  const sliderTop = item.y + item.imageHeight;

  noStroke();
  fill(255);
  rect(item.x, item.y, item.width, item.height);

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(item.x, item.y, item.width, item.height);
  drawingContext.clip();

  if (
    (item.status === 'ready' || item.status === 'failed' || item.status === 'refreshing') &&
    item.photo &&
    item.crop
  ) {
    image(
      item.photo,
      item.x,
      item.y,
      item.width,
      item.imageHeight,
      item.crop.x,
      item.crop.y,
      item.crop.width,
      item.crop.height
    );

    noStroke();
    fill(255);
    rect(item.x + item.targetX, item.y + item.targetY, item.pieceSize, item.pieceSize);

    const sourceX = item.crop.x + (item.targetX / item.width) * item.crop.width;
    const sourceY = item.crop.y + (item.targetY / item.imageHeight) * item.crop.height;
    const sourceWidth = (item.pieceSize / item.width) * item.crop.width;
    const sourceHeight = (item.pieceSize / item.imageHeight) * item.crop.height;

    image(
      item.photo,
      item.x + item.pieceX,
      item.y + item.targetY,
      item.pieceSize,
      item.pieceSize,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight
    );
  } else {
    noStroke();
    fill(90);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(
      item.status === 'error' ? 'Photo unavailable - click to retry' : 'Loading photo...',
      item.x + item.width / 2,
      item.y + item.imageHeight / 2
    );
  }

  fill(255);
  noStroke();
  rect(item.x, sliderTop, item.width, sliderHeight);

  const knobX = item.x + item.pieceX + item.pieceSize / 2;
  const knobY = sliderTop + sliderHeight / 2;
  const trackStartX = item.x + item.pieceSize / 2;
  const trackEndX = item.x + item.width - item.pieceSize / 2;
  stroke(210);
  strokeWeight(SLIDECAPCHA_CONFIG.slider.trackWeight);
  line(trackStartX, knobY, trackEndX, knobY);
  stroke(34, 197, 94);
  line(trackStartX, knobY, knobX, knobY);
  noStroke();
  fill(item.solved ? color(34, 197, 94) : color(80, 130, 190));
  circle(knobX, knobY, SLIDECAPCHA_CONFIG.slider.knobRadius * 2);

  if (item.solved) {
    drawSlideCapchaSuccess(item);
  } else if (item.status === 'failed') {
    drawSlideCapchaFailure(item);
  }

  drawingContext.restore();

  noFill();
  stroke(item.solved ? color(34, 197, 94) : color(203, 213, 225));
  strokeWeight(1);
  rect(item.x, item.y, item.width, item.height);
}

function drawSlideCapchaSuccess(item) {
  const config = SLIDECAPCHA_CONFIG.successOverlay;
  const centerX = item.x + item.width / 2;
  const scale = Math.min(1, item.imageHeight / 80, item.width / 190);
  const iconSize = Math.min(config.maxIconSize, item.imageHeight * config.iconSizeRatio, item.width * 0.25);
  const titleSize = config.titleFontSize * scale;
  const detailSize = config.detailFontSize * scale;
  const gap = config.verticalGap * scale;
  const titleHeight = titleSize * 1.2;
  const detailHeight = detailSize * 1.2;
  const groupHeight = iconSize + gap + titleHeight + gap + detailHeight;
  const groupTop = item.y + (item.imageHeight - groupHeight) / 2;
  const iconCenterY = groupTop + iconSize / 2;
  const titleY = groupTop + iconSize + gap + titleHeight / 2;
  const detailY = groupTop + iconSize + gap + titleHeight + gap + detailHeight / 2;

  noStroke();
  fill(255, 255, 255, 225);
  rect(item.x, item.y, item.width, item.imageHeight);

  fill(34, 197, 94);
  circle(centerX, iconCenterY, iconSize);

  stroke(255);
  strokeWeight(Math.max(3, iconSize * 0.09));
  strokeCap(ROUND);
  noFill();
  beginShape();
  vertex(centerX - iconSize * 0.22, iconCenterY);
  vertex(centerX - iconSize * 0.06, iconCenterY + iconSize * 0.16);
  vertex(centerX + iconSize * 0.25, iconCenterY - iconSize * 0.2);
  endShape();

  noStroke();
  fill(21, 128, 61);
  textAlign(CENTER, CENTER);
  textSize(titleSize);
  textStyle(BOLD);
  text('Congrats!!', centerX, titleY);
  textSize(detailSize);
  text(`You prove your humanity in ${item.solveTime}`, centerX, detailY);
  textStyle(NORMAL);
}

function drawSlideCapchaFailure(item) {
  const config = SLIDECAPCHA_CONFIG.failure;
  const centerX = item.x + item.width / 2;
  const elapsed = Date.now() - item.failureStartedAt;
  const pulse = 1 + Math.sin(elapsed * config.pulseSpeed) * 0.08;
  const shake = Math.sin(elapsed * 0.04) * config.shakeAmplitude;
  const scale = Math.min(1, item.imageHeight / 58, item.width / 150);
  const iconSize = Math.min(config.maxIconSize, item.imageHeight * config.iconSizeRatio, item.width * 0.2) * pulse;
  const titleSize = config.titleFontSize * scale;
  const detailSize = config.detailFontSize * scale;
  const gap = config.verticalGap * scale;
  const titleHeight = titleSize * 1.2;
  const detailHeight = detailSize * 1.2;
  const groupHeight = iconSize + gap + titleHeight + gap + detailHeight;
  const groupTop = item.y + (item.imageHeight - groupHeight) / 2;
  const iconCenterY = groupTop + iconSize / 2;
  const titleY = groupTop + iconSize + gap + titleHeight / 2;
  const detailY = groupTop + iconSize + gap + titleHeight + gap + detailHeight / 2;

  noStroke();
  fill(255, 235, 235, 230);
  rect(item.x, item.y, item.width, item.imageHeight);

  fill(220, 38, 38);
  circle(centerX, iconCenterY, iconSize);
  stroke(255);
  strokeWeight(Math.max(2, iconSize * 0.1));
  strokeCap(ROUND);
  line(
    centerX - iconSize * 0.18,
    iconCenterY - iconSize * 0.18,
    centerX + iconSize * 0.18,
    iconCenterY + iconSize * 0.18
  );
  line(
    centerX + iconSize * 0.18,
    iconCenterY - iconSize * 0.18,
    centerX - iconSize * 0.18,
    iconCenterY + iconSize * 0.18
  );

  noStroke();
  fill(185, 28, 28);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(titleSize);
  text('Sorry', centerX + shake, titleY);
  textSize(detailSize);
  text('you are disqualified as a human.', centerX + shake, detailY);
  textStyle(NORMAL);
}

function animateSlideCapchaItem(item) {
  if (item.solved || slideCapchaActiveDrag === item || item.status !== 'ready') return;

  const distance = item.destinationX - item.pieceX;
  const step = item.speed * Math.min(deltaTime / 1000, 0.05);

  if (Math.abs(distance) <= step) {
    moveSlideCapchaPiece(item, item.destinationX);
    if (item.solved) return;
    chooseSlideCapchaDestination(item);
  } else {
    moveSlideCapchaPiece(item, item.pieceX + Math.sign(distance) * step);
  }
}

function moveSlideCapchaPiece(item, nextX) {
  const previousX = item.pieceX;
  if (nextX !== previousX && item.timerStartedAt === null) {
    item.timerStartedAt = Date.now();
  }
  item.pieceX = nextX;

  const tolerance = Math.max(3, item.pieceSize * 0.08);
  const crossedTarget = item.targetX >= Math.min(previousX, nextX) &&
    item.targetX <= Math.max(previousX, nextX);
  if (Math.abs(item.pieceX - item.targetX) <= tolerance || crossedTarget) {
    if (!item.solved) {
      item.solved = true;
      if (item.successTimer) clearTimeout(item.successTimer);
      if (item.failureTimer) clearTimeout(item.failureTimer);
      const elapsedMs = item.timerStartedAt === null ? 0 : Date.now() - item.timerStartedAt;
      item.solveTime = `${Math.max(0, elapsedMs / 1000).toFixed(1)}s`;
      const roundId = item.roundId;
      item.successTimer = setTimeout(() => {
        const target = slideCapchaItems[item.index];
        if (!target || target.roundId !== roundId || !target.solved) return;
        target.status = 'refreshing';
        loadRandomSlideCapchaPhoto(target.index, slideCapchaPhotoRequest);
      }, SLIDECAPCHA_CONFIG.slider.successDisplayDuration);
    }
    item.pieceX = item.targetX;
    item.destinationX = item.targetX;
    item.speed = 0;
  }
}

function mousePressed() {
  if (currentPage !== 'page2') return;

  const failedItem = slideCapchaItems.find((item) =>
    item.status === 'error' &&
    mouseX >= item.x &&
    mouseX <= item.x + item.width &&
    mouseY >= item.y &&
    mouseY <= item.y + item.height
  );

  if (failedItem) {
    failedItem.status = 'loading';
    failedItem.solveTime = null;
    failedItem.photo = null;
    failedItem.photoError = null;
    loadRandomSlideCapchaPhoto(failedItem.index, slideCapchaPhotoRequest);
    return false;
  }

  slideCapchaActiveDrag = slideCapchaItems.find((item) => {
    const sliderTop = item.y + item.imageHeight;
    return !item.solved &&
      item.status === 'ready' &&
      mouseX >= item.x &&
      mouseX <= item.x + item.width &&
      mouseY >= sliderTop &&
      mouseY <= item.y + item.height;
  }) || null;

  if (slideCapchaActiveDrag) {
    updateSlideCapchaFromPointer(slideCapchaActiveDrag);
    return false;
  }
}

function mouseDragged() {
  if (!slideCapchaActiveDrag) return;
  updateSlideCapchaFromPointer(slideCapchaActiveDrag);
  return false;
}

function mouseReleased() {
  if (!slideCapchaActiveDrag) return;

  if (!slideCapchaActiveDrag.solved) {
    chooseSlideCapchaDestination(slideCapchaActiveDrag);
  }
  slideCapchaActiveDrag = null;
}

function updateSlideCapchaFromPointer(item) {
  const maxX = Math.max(0, item.width - item.pieceSize);
  const nextX = Math.max(
    0,
    Math.min(maxX, mouseX - item.x - item.pieceSize / 2)
  );
  moveSlideCapchaPiece(item, nextX);
  if (!item.solved) {
    item.destinationX = item.pieceX;
  }
}
