let wavePhase3 = 0;

function setupPage3() {
  let c = createCanvas(700, 420);
  c.parent('canvas-container');
}

function drawPage3() {
  background(250, 250, 255);
  stroke(94, 234, 212);
  strokeWeight(3);
  noFill();

  for (let i = 0; i < 6; i++) {
    beginShape();
    for (let x = 0; x <= width; x += 12) {
      let y = height * (0.2 + i * 0.12) + sin(wavePhase3 + x * 0.03 + i) * (28 + i * 10);
      vertex(x, y);
    }
    endShape();
  }

  stroke(59, 130, 246);
  fill(191, 219, 254, 110);
  ellipse(width * 0.78, height * 0.28, 140, 140);
  ellipse(width * 0.25, height * 0.72, 160, 120);

  wavePhase3 += 0.05;
}
