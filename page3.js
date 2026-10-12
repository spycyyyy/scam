let page3Award360Image = null;

function setupPage3() {
  const canvas = createCanvas(700, 420);
  canvas.parent('canvas-container');

  const imageUrl = './assests/award360.png';
  loadImage(
    imageUrl,
    (loadedImage) => {
      page3Award360Image = loadedImage;
    },
    (error) => console.error(`Unable to load image CAPTCHA image at ${imageUrl}.`, error)
  );
}

function drawPage3() {
  background(255);

  if (!page3Award360Image) return;

  const scale = Math.min(width / page3Award360Image.width, height / page3Award360Image.height);
  const imageWidth = page3Award360Image.width * scale;
  const imageHeight = page3Award360Image.height * scale;
  image(
    page3Award360Image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight
  );
}
