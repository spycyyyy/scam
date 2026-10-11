let waveAngle = 0;

function setupPage2() {
  let c = createCanvas(600, 380);
  c.parent('canvas-container');
}

function drawPage2() {
  background(248);
  stroke(37, 99, 235);
  strokeWeight(3);
  noFill();

  beginShape();
  for (let x = 0; x < width; x += 10) {
    let y = height / 2 + sin(waveAngle + x * 0.02) * 50;
    vertex(x, y);
  }
  endShape();

  waveAngle += 0.04;
}
