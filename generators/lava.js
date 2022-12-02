var WIDTH = 8;
var HEIGHT = 32;
var ZOOM = 20;
var NB_PARTICLES = 32;


var GRAVITY = [0, 1];
const STIFFNESS = 10;       //35
const STIFFNESS_NEAR = 30; //100
const REST_DENSITY = 5;     // 5
const INTERACTION_RADIUS = 1.0;
const HEAT_THRESHOLD = 5;
const HEAT_LIMIT = HEAT_THRESHOLD * 2;
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2;

const GRAVITY_MAGNITUDE = 35
const GRAVITY_FORCE = [0, -35];
const SCROLL_FORCE = [0, 0];
const ACCELERATION_FORCE = [0, 0]

//var gParticles = [];
var x = [];
var y = [];
var oldX = [];
var oldY = [];
var vx = [];
var vy = [];
var pressure = [];
var pressureNear = [];
var g = []; // gradient, distances to neighbours
var heat = [];

function render() {
  const canvas = document.getElementById('canvas');
  canvas.width = WIDTH*ZOOM;
  canvas.height = HEIGHT*ZOOM;
  const ctx = canvas.getContext('2d');
  // ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH * ZOOM, HEIGHT * ZOOM);
  for (var numParticle = 0; numParticle < NB_PARTICLES; numParticle++) {
    ctx.fillStyle = 'rgb(' + ((heat[numParticle] * 255) / HEAT_LIMIT) + ',64,128)';
    ctx.fillRect(x[numParticle] * ZOOM - ZOOM / 2, y[numParticle] * ZOOM - ZOOM / 2, ZOOM, ZOOM);
  }
}
//https://peeke.nl/simulating-blobs-of-fluid
function init() {

  for (var numParticle = 0; numParticle < NB_PARTICLES; numParticle++) {
    x[numParticle] = Math.random() * WIDTH;
    y[numParticle] = Math.random() * HEIGHT;
    oldX[numParticle] = x[numParticle]; 
    oldY[numParticle] = y[numParticle]; 
    vx[numParticle] = 0;
    vy[numParticle] = (Math.random() * 3); 
    g[numParticle] = 0;
    pressure[numParticle] = 0;
    pressureNear[numParticle] = 0;
    heat[numParticle] = 0;
  }
}


function timeslice(dt) {
  // PASS 1
  for (var p = 0; p < NB_PARTICLES; p++) { 
    //var p = gParticles[numParticle]    
    oldX[p] = x[p];
    oldY[p] = y[p];

    // heat increases close to the bottom of the lamp
    // and decreases anywhere else, likely a timed cube distance function  
    // the closest to the bottom, the warmest it becomes   
    // change this into a heat source: the more it glows, the more heat it gives
    var ratio = ( y[p] / HEIGHT ); // ((y[p] - HEIGHT / 2) / (HEIGHT / 2));
    //ratio = ratio ** 2;
    ratio = (ratio - 0.5) / 0.5;
    if (ratio > 0.5 ) ratio = (ratio*2) ** 2;
    heat[p] += ratio * dt;
    if (heat[p] < 0) heat[p] = 0;
    if (heat[p] > HEAT_LIMIT) heat[p] = HEAT_LIMIT;

    var force = GRAVITY;
    
    mass = - ((heat[p] - HEAT_THRESHOLD) / HEAT_THRESHOLD) * 0.25;
    //mass = mass * mass;

    vx[p] += force[0] * dt;
    vy[p] += force[1] * mass * dt;

    x[p] += vx[p] * dt;
    y[p] += vy[p] * dt;
  }
  //PASS 2
  for (var p1 = 0; p1 < NB_PARTICLES; p1++) {
    var neighbours = [];
    var THRESHOLD = INTERACTION_RADIUS * INTERACTION_RADIUS;
    // get neighbours and their gradient
    var density = 0;
    var nearDensity = 0;
    for (var p2 = 0; p2 < NB_PARTICLES; p2++) {
      if (p2 == p1) continue;
      var dx = x[p2] - x[p1];
      var dy = y[p2] - y[p1];
      var dist = dx * dx + dy * dy;
      if (dist > THRESHOLD) continue;
      var gradient = 1 - (Math.sqrt(dist)/INTERACTION_RADIUS);
      g[p2] = gradient;
      neighbours.push(p2);
      //
      density += gradient * gradient;
      nearDensity += gradient * gradient * gradient;
    }
    

    // compute pressure on this point
    pressure[p1] = STIFFNESS * (density - REST_DENSITY);
    pressureNear[p1] = STIFFNESS_NEAR * nearDensity;

    // relax
    for (var k=0;k<neighbours.length;k++) {
      var n = neighbours[k];
      var ng = g[n];
      var magnitude = pressure[p1] * ng + pressureNear[p1] * ng * ng;
      var dirX = x[n] - x[p1];
      var dirY = y[n] - y[p1];
      var norm = Math.sqrt(dirX*dirX +dirY*dirY);
      dirX = (dirX / norm) * (magnitude / 2) * dt * dt;
      dirY = (dirY / norm) * (magnitude / 2) * dt * dt;
      x[p1] += dirX; // go away
      y[p1] += dirY;
      x[n] -= dirX;
      y[n] -= dirY;
    }
  }
  //PASS3
  for (var p = 0; p < NB_PARTICLES; p++) {
    if (x[p] < 0) {
      x[p] = 0; 
      oldX[p] -= INTERACTION_RADIUS*dt/2; //unstick: project toward center of container
    }
    if (x[p] >= WIDTH-1) { 
      x[p] = WIDTH - 1; 
      oldX[p] += INTERACTION_RADIUS * dt/2; //unstick: project toward center of container
    }
    if (y[p] < 0) { 
      y[p] = 0; 
      oldY[p] -= INTERACTION_RADIUS * dt/2; //unstick: project toward center of container
    }
    if (y[p] >= HEIGHT-1) {
      y[p] = HEIGHT - 1;
      oldY[p] += INTERACTION_RADIUS * dt/2; //unstick: project toward center of container
    }
    vx[p] = (x[p] - oldX[p]) / dt;
    vy[p] = (y[p] - oldY[p]) / dt;
  }

}

// Shorthand for $( document ).ready()
$(function () {
  console.log("ready!");
  $('#step').on('click', function (event) {
    event.preventDefault(); 
    timeslice(0.020);
    render();
    console.log('stepped');
  })
  $('#run').on('click', function (event) {
    event.preventDefault(); 
    setInterval(function() {
      timeslice(0.020);
      render();
    }, 20)
  });

  //$('#canvas').css({ width: '' + (WIDTH * ZOOM) + 'px', height: '' + (HEIGHT * ZOOM) + 'px' });
  init();
  timeslice(0.20);
  render();
});