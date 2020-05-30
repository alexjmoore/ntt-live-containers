// good defaults for the NTT logo
let aDEFAULT = 2.58;
let bDEFAULT = 1;
let nDEFAULT = 1.57; // pi/2 to rotate 90 degrees
let scaleFactorDEFAULT = 50;
let weightDEFAULT = 20;

let NTTBLUE = "#0072bc"
let NTTDARKBLUE = "#001973"

let limacon = {
  a: aDEFAULT,
  b: bDEFAULT,
  n: nDEFAULT,
  scaleFactor: scaleFactorDEFAULT,
  weight: weightDEFAULT
};

let i = 0;
let staticLimacon;

let sketchHeight = 300;
let sketchWidth = 300;

// Limaçon formula itself (in cartesian form)
function limacon_xy(limacon, angle) {
  var x = limacon.scaleFactor * (limacon.b + (limacon.a * cos(angle - limacon.n))) * cos(angle);
  var y = limacon.scaleFactor * (limacon.b + (limacon.a * cos(angle - limacon.n))) * sin(angle);
  return [x, y];
}

// setup p5.js
function setup() {
  let canvas = createCanvas(sketchWidth, sketchHeight);
  canvas.parent('sketch-div');

  staticLimacon = createGraphics(sketchWidth, sketchHeight);
  staticLimacon.stroke(NTTBLUE);

  // draw the static image of the limaçon
  staticLimacon.strokeWeight(limacon.weight);
  staticLimacon.translate(width / 2, height / 4);
  for (var j = 0; j < TWO_PI; j += 0.001) {
    [x, y] = limacon_xy(limacon, j);
    staticLimacon.point(x, y);
  }
}

// primary p5.js draw routine
function draw() {
  // draw the static version
  background(255);
  stroke(NTTBLUE);
  image(staticLimacon, 0, 0);

  // draw the outline animation frame
  translate(width / 2, height / 4);
  stroke(NTTDARKBLUE);
  [x, y] = limacon_xy(limacon, i);
  strokeWeight(limacon.weight - 10);
  point(x, y);
  i += 0.05;
  if (i === TWO_PI) i = 0;
}
