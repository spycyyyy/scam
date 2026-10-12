let pulsePhase5 = 0;

function setupPage5() {
  let c = createCanvas(700, 420);
  c.parent('canvas-container');
}

function drawPage5() {
  background(245, 247, 250);

  for (let i = 0; i < 9; i++) {
    let x = width * (0.15 + i * 0.1);
    let y = height / 2 + sin(pulsePhase5 + i) * 70;
    let radius = 18 + sin(pulsePhase5 * 1.2 + i * 1.8) * 18;

    fill(96, 165, 250, 120);
    stroke(37, 99, 235);
    strokeWeight(2);
    ellipse(x, y, radius * 2.2, radius * 2.2);
  }

  pulsePhase5 += 0.08;
}
