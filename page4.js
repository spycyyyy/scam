let page4Images = [];

function setupPage4() {
  const c = createCanvas(700, 420);
  c.parent('canvas-container');

  page4Images = Array(4).fill(null);
  page4Images.forEach((_, index) => {
    const imageUrl = `./assests/p${index + 1}.png`;
    loadImage(
      imageUrl,
      (loadedImage) => {
        page4Images[index] = loadedImage;
      },
      (error) => console.error(`Unable to load page 4 image at ${imageUrl}.`, error)
    );
  });
}

function drawPage4() {
  background(255, 248, 240);

  const margin = 12;
  const gap = 12;
  const cellWidth = (width - margin * 2 - gap) / 2;
  const cellHeight = (height - margin * 2 - gap) / 2;

  page4Images.forEach((page4Image, index) => {
    const x = margin + (index % 2) * (cellWidth + gap);
    const y = margin + Math.floor(index / 2) * (cellHeight + gap);

    noStroke();
    fill(255);
    rect(x, y, cellWidth, cellHeight, 8);

    if (!page4Image) {
      fill(80);
      textAlign(CENTER, CENTER);
      text(`Loading image ${index + 1}...`, x + cellWidth / 2, y + cellHeight / 2);
      return;
    }

    const scale = Math.min(cellWidth / page4Image.width, cellHeight / page4Image.height);
    const imageWidth = page4Image.width * scale;
    const imageHeight = page4Image.height * scale;
    image(
      page4Image,
      x + (cellWidth - imageWidth) / 2,
      y + (cellHeight - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
  });
}
