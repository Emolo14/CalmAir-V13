let mic;
let aktiv = false;
let mute = false;

let volRaw = 0, volFilt = 0, dB = 30;
let co2 = 600, co2Start = 0;
let alarmTone = null;

const DB_MIN = 30, DB_MAX = 100, DB_RED = 90;
const CO2_YELLOW = 800, CO2_RED = 1200;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textFont("League Spartan");
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  mic = new p5.AudioIn();
  co2Start = millis();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// Ren tekst helper (ingen outline/shadow)
function drawCleanText(txt, x, y, size, col = 255) {
  push();
  textFont("League Spartan");
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  noStroke();
  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = 'rgba(0,0,0,0)';
  fill(col);
  textSize(size);
  text(txt, x, y);
  pop();
}

function draw() {
  background("#F6D466");

  if (height > width) {
    drawCleanText("Vend telefonen til landscape", width/2, height/2, min(width,height)*0.06, 0);
    return;
  }

  // --- Lydmåling ---
  if (aktiv) volRaw = mic.getLevel();
  volFilt = lerp(volFilt, volRaw, 0.10);
  let dB_target = map(constrain(volFilt, 0, 0.15), 0, 0.15, DB_MIN, DB_MAX);
  dB = constrain(lerp(dB, dB_target, 0.20), DB_MIN, DB_MAX);

  // --- CO₂ (600→1200→800 over 5 min) ---
  const T_UP = 180, T_DOWN = 120, T_TOTAL = T_UP + T_DOWN;
  let t = (millis() - co2Start) / 1000;
  let phase = t % T_TOTAL;
  function easeInOut(u){ return u*u*(3 - 2*u); }
  co2 = (phase < T_UP)
    ? lerp(600, 1200, easeInOut(phase / T_UP))
    : lerp(1200, 800, easeInOut((phase - T_UP) / T_DOWN));
  co2 += (noise(t * 0.05) - 0.5) * 4;
  co2 = constrain(co2, 400, 1400);

  const topH = height * 0.7;
  const bundH = height - topH;

  // --- Sorte linjer (fra centrum) ---
  let midX = width / 2;
  stroke(0);
  strokeCap(ROUND);
  strokeWeight(20);
  line(midX, height/2, midX, 0);
  line(midX, height/2, midX, height);
  strokeWeight(12);
  line(0, topH, width, topH);
  noStroke();

  // -------- VENSTRE TOP: Speedometer --------
  let cx = width * 0.25, cy = topH * 0.60;
  let R  = min(width/2, topH) * 0.48;

  // Baggrundsbue
  noFill();
  stroke(230); strokeWeight(R*0.14);
  arc(cx, cy, R*2, R*2, 180, 360);

  // Flere farveniveauer
  strokeWeight(R*0.14);
  drawBand(cx, cy, R, 30, 55, color(0,140,0));        // mørk grøn
  drawBand(cx, cy, R, 55, 70, color(0,180,0));        // grøn
  drawBand(cx, cy, R, 70, 80, color(255, 220, 0));    // gul
  drawBand(cx, cy, R, 80, 90, color(255, 150, 0));    // orange
  drawBand(cx, cy, R, 90, 100, color(255, 0, 0));     // rød

  // Viser
  let v = map(dB, DB_MIN, DB_MAX, 180, 360);
  stroke(0); strokeWeight(R*0.05);
  line(cx, cy, cx + R*0.80*cos(v), cy + R*0.80*sin(v));
  noStroke(); fill(0); circle(cx, cy, R * 0.12);

  // --- dB-tekster: længere ned + farve & puls ---
  let pulse = 1 + sin(millis() / 220) * 0.05;
  let dbColor = getDbColor(dB); // farve efter niveau
  // ryk lidt mere ned end før
  drawCleanText("dB", cx, cy + R*0.24, R*0.20 * pulse, dbColor);
  drawCleanText(int(dB) + " dB", cx, cy + R*0.52, R*0.28 * pulse, dbColor);

  // -------- HØJRE TOP: Emoji --------
  let fx = width * 0.75, fy = topH * 0.49; // en anelse ned
  let D  = min(width/2, topH) * 0.86;      // lidt mindre

  let baseC;
  if (co2 < CO2_YELLOW) baseC = color(52, 199, 89);
  else if (co2 < CO2_RED) baseC = color(255, 214, 10);
  else baseC = color(255, 69, 58);

  let grad = drawingContext.createRadialGradient(fx - D*0.2, fy - D*0.2, D*0.1, fx, fy, D*0.6);
  grad.addColorStop(0, color(255,255,255,120));
  grad.addColorStop(0.2, color(255,255,255,60));
  grad.addColorStop(1, baseC);
  drawingContext.fillStyle = grad;
  stroke(0); strokeWeight(D * 0.05);
  circle(fx, fy, D);

  noStroke(); fill(0);
  let eyeR = D * 0.10, ex = D * 0.24, ey = D * 0.16;
  circle(fx - ex, fy - ey, eyeR);
  circle(fx + ex, fy - ey, eyeR);
  stroke(0); strokeWeight(D * 0.06); noFill();
  if (co2 < CO2_YELLOW)      arc(fx, fy + D*0.05, D*0.50, D*0.28, 20, 160);
  else if (co2 < CO2_RED)    line(fx - D*0.20, fy + D*0.12, fx + D*0.20, fy + D*0.12);
  else                       arc(fx, fy + D*0.20, D*0.50, D*0.28, 200, 340);

  // -------- NEDERST: bokse (afrundede + skygge) --------
  const pad = 8;
  // Venstre: Start/Stop
  push();
  drawingContext.shadowBlur = 18;
  drawingContext.shadowColor = 'rgba(0,0,0,0.35)';
  fill(aktiv ? color(255,0,0) : color(0,180,0));
  rect(pad, topH + pad, width/2 - pad*2, bundH - pad*2, 18);
  pop();

  // Højre: CO₂
  let rightColor;
  if (co2 < CO2_YELLOW) rightColor = color(0,180,0);
  else if (co2 < CO2_RED) rightColor = color(255,220,0);
  else rightColor = color(255,0,0);
  push();
  drawingContext.shadowBlur = 18;
  drawingContext.shadowColor = 'rgba(0,0,0,0.35)';
  fill(rightColor);
  rect(width/2 + pad, topH + pad, width/2 - pad*2, bundH - pad*2, 18);
  pop();

  drawCleanText(aktiv ? "Stop" : "Start", width*0.25, topH + bundH/2, bundH*0.6, 255);
  drawCleanText(int(co2) + " ppm", width*0.75, topH + bundH/2, bundH*0.6, 255);

  // -------- ALARM: smal bjælke + mute-knap i venstre top --------
  let alarmOn = aktiv && dB > DB_RED;
  if (alarmOn) {
    if (!alarmTone && !mute) {
      alarmTone = new p5.Oscillator('sawtooth');
      alarmTone.start();
    }
    if (!mute && alarmTone) {
      let f = (floor(millis()/220) % 2 === 0) ? 880 : 660;
      alarmTone.freq(f);
      alarmTone.amp(0.35, 0.05);
    } else if (mute && alarmTone) {
      alarmTone.amp(0, 0.2);
      alarmTone.stop();
      alarmTone = null;
    }
    drawAlarmStripeAndMuteButton(topH);
  } else if (alarmTone) {
    alarmTone.amp(0, 0.1);
    alarmTone.stop();
    alarmTone = null;
  }
}

// Tegn et farve-segment i speedometeret
function drawBand(cx, cy, R, fromDB, toDB, col) {
  let a1 = map(fromDB, DB_MIN, DB_MAX, 180, 360);
  let a2 = map(toDB,   DB_MIN, DB_MAX, 180, 360);
  stroke(col);
  arc(cx, cy, R*2, R*2, a1, a2);
}

// Farve til dB-tekst efter niveau
function getDbColor(db) {
  if (db < 55) return color(0,140,0);       // mørk grøn
  if (db < 70) return color(0,180,0);       // grøn
  if (db < 80) return color(255,220,0);     // gul
  if (db < 90) return color(255,150,0);     // orange
  return color(255,0,0);                    // rød
}

// Alarm-bjælke + “Sluk for lyd” nederst i speedometer-boksen
function drawAlarmStripeAndMuteButton(topH){
  const wLeft = width/2;
  const stripeH = min(height, width) * 0.08;
  const blink = (floor(millis()/250) % 2 === 0);

  noStroke();
  fill(blink ? color(255,0,0) : color(255,230,0));
  rect(0, 0, wLeft, stripeH);

  drawCleanText("HØJT LYDNIVEAU!", wLeft/2, stripeH/2 + 1, stripeH*0.55, 0);

  const pad = 16;
  const btnW = wLeft * 0.42;
  const btnH = (topH) * 0.12;
  const bx = pad;
  const by = topH - btnH - pad;

  fill("#222");
  rect(bx, by, btnW, btnH, 12);
  drawCleanText("Sluk for lyd", bx + btnW/2, by + btnH/2 - 2, btnH*0.45, 255);
  lastMuteBtn = {x: bx, y: by, w: btnW, h: btnH};
}

let lastMuteBtn = null;

function mousePressed() {
  getAudioContext().resume();

  // “Sluk for lyd”
  if (lastMuteBtn) {
    const {x,y,w,h} = lastMuteBtn;
    if (mouseX >= x && mouseX <= x+w && mouseY >= y && mouseY <= y+h) {
      mute = !mute; // kun lyd muter, alarmbjælke bliver
      if (mute && alarmTone) {
        alarmTone.amp(0, 0.1);
        alarmTone.stop();
        alarmTone = null;
      }
      return;
    }
  }

  // Start/Stop (venstre nederst)
  const topH = height * 0.7;
  if (mouseX >= 0 && mouseX <= width/2 && mouseY >= topH && mouseY <= height) {
    if (aktiv) {
      mic.stop(); aktiv = false; mute = false;
      if (alarmTone) { alarmTone.amp(0, 0.1); alarmTone.stop(); alarmTone = null; }
    } else {
      mic.start(); aktiv = true;
    }
  }
}

function touchStarted(){ mousePressed(); return false; }
