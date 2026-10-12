let rotationPhase4 = 0;

function setupPage4() {
  let c = createCanvas(700, 420);
  c.parent('canvas-container');
}

function drawPage4() {
  background(255, 248, 240);
  translate(width / 2, height / 2);

  for (let i = 0; i < 12; i++) {
    rotate(rotationPhase4 * 0.18 + i * 0.52);
    stroke(244, 114, 182 + i * 6);
    strokeWeight(2);
    line(0, 0, 180, 0);
    noFill();
    ellipse(180, 0, 90, 50);
  }

  rotationPhase4 += 0.015;
}
