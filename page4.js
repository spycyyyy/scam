let award360Image = null;

function setupPage4() {
  const canvas = createCanvas(700, 420);
  canvas.parent('canvas-container');

  const imageUrl = './assests/award360.png';
  loadImage(
    imageUrl,
    (loadedImage) => {
      award360Image = loadedImage;
    },
    (error) => console.error(`Unable to load page 4 image at ${imageUrl}.`, error)
  );
}

function drawPage4() {
  background(255);

  if (!award360Image) return;

  const scale = Math.min(width / award360Image.width, height / award360Image.height);
  const imageWidth = award360Image.width * scale;
  const imageHeight = award360Image.height * scale;
  image(
    award360Image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight
  );
}
