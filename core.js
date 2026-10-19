// Simulation units are game balance, never claimed BLE measurements.
export const LANES = [-3, 0, 3];
export const MESSAGES = ['Soy yo. Estoy bien. Necesito avisar a mi familia.', 'Estamos en el punto de encuentro. ¿Pueden venir?', 'Encontramos refugio. Avisen que estamos a salvo.', 'Necesitamos agua en el centro de asistencia.', 'El camino al refugio está despejado.'];
export function randomGenerator(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const BALANCE = Object.freeze({ startSpeed: 18, maxSpeed: 32, baseDrain: .85, ecoDrain: .55, redDamage: 24, batteryCharge: 7 });
export function generateRoutes(random) {
  const choose = () => { const value = random(); return value < .34 ? 'eco' : value < .72 ? 'normal' : 'blocked'; };
  const kinds = Array.from({ length: 3 }, choose);
  // Repetitions are intentional. Only the impossible all-red combination is excluded.
  if (kinds.every(kind => kind === 'blocked')) kinds[Math.floor(random() * 3)] = random() < .6 ? 'normal' : 'eco';
  return kinds.map(kind => ({ kind, label: kind === 'eco' ? 'Buen enlace' : kind === 'normal' ? 'Señal media' : 'Sin conexión', charge: kind === 'eco' ? 6 : 0 }));
}
export class RelayRun {
  constructor(seed = Date.now()) {
    this.random = randomGenerator(seed); this.seed = seed; this.distance = 0; this.elapsed = 0; this.lane = 1; this.x = 0; this.battery = 100; this.score = 0; this.relays = 0; this.deliveries = 0; this.speed = BALANCE.startSpeed; this.y = 0; this.vy = 0; this.slide = 0; this.invincible = 0; this.combo = 0; this.maxCombo = 0; this.pickups = 0; this.hits = 0; this.over = false; this.waiting = false; this.route = 'normal'; this.routeUntil = 0; this.events = []; this.feedback = []; this.nextRow = 48; this.nextRelay = 220; this.generatedUntil = 0; this.generate();
  }
  emit(type, data = {}) { this.feedback.push({ type, ...data }); }
  move(dir) { if (this.over) return; this.lane = Math.max(0, Math.min(2, this.lane + dir)); }
  jump() { if (this.over || this.y > .02 || this.slide > 0) return false; this.vy = 11.5; this.battery = Math.max(0, this.battery - 1.2); this.emit('jump'); return true; }
  duck() { if (this.over || this.slide > 0) return false; this.y = 0; this.vy = 0; this.slide = .92; this.battery = Math.max(0, this.battery - .6); this.emit('slide'); return true; }
  generate() {
    const horizon = this.distance + 235;
    while (this.nextRelay < horizon + 35) {
      const routes = generateRoutes(this.random);
      this.events.push({ id: 'relay-' + this.nextRelay, type: 'relay', d: this.nextRelay, routes, done: false }); this.nextRelay += 220;
    }
    while (this.nextRow < horizon) {
      const d = this.nextRow, nearRelay = Math.abs(d - Math.round(d / 220) * 220) < 34;
      if (!nearRelay) {
        const lane = Math.floor(this.random() * 3), roll = this.random();
        const type = d < 80 ? 'battery' : roll < .38 ? 'barrier' : roll < .65 ? 'beam' : roll < .90 ? 'block' : 'deadzone';
        this.events.push({ id: 'ob-' + d, type, d, lane, done: false });
        // There is always an unobstructed lane. Later rows can have two hazards.
        if (d > 550 && this.random() < Math.min(.44, .25 + d / 16000)) this.events.push({ id: 'ob2-' + d, type: this.random() < .5 ? 'barrier' : 'block', d, lane: (lane + 1) % 3, done: false });
        const pickupLane = (lane + 1 + Math.floor(this.random() * 2)) % 3;
        if (d < 110 || this.random() < .7) this.events.push({ id: 'battery-' + d, type: 'battery', d: d + 8, lane: pickupLane, done: false });
        if (this.random() < .65) for (let j=0;j<3;j++) this.events.push({ id: 'data-' + d + '-' + j, type: 'data', d: d + 13 + j * 3, lane: pickupLane, done: false });
      }
      this.nextRow += Math.max(16, 25 - this.distance / 750) + this.random() * 6;
    }
    this.generatedUntil = horizon;
  }
  update(dt) {
    if (this.over) return; dt = Math.min(dt, .05); this.elapsed += dt;
    this.x += (LANES[this.lane] - this.x) * (1 - Math.exp(-17 * dt));
    this.invincible = Math.max(0, this.invincible - dt); this.slide = Math.max(0, this.slide - dt);
    if (this.y > 0 || this.vy > 0) { this.vy -= 27 * dt; this.y += this.vy * dt; if (this.y < 0) { this.y = 0; this.vy = 0; } }
    this.route = this.distance > this.routeUntil ? 'normal' : this.route;
    this.speed = Math.min(BALANCE.maxSpeed, BALANCE.startSpeed + this.distance / 400);
    let advance = this.speed * dt;
    const gate = this.events.find(e => e.type === 'relay' && !e.done && e.d >= this.distance - 1);
    this.waiting = false;
    if (gate && this.distance + advance >= gate.d - 3) {
      // Contact follows the courier's physical position, including during a lane change.
      const physicalLane = Math.max(0, Math.min(2, Math.round((this.x + 3) / 3)));
      const route = gate.routes[physicalLane];
      gate.done = true;
      if (route.kind === 'blocked') {
        this.battery = Math.max(0, this.battery - BALANCE.redDamage); this.hits++; this.combo = 0; this.invincible = 1.05;
        this.route = 'normal'; this.routeUntil = 0;
        this.emit('relay-miss', { lane: physicalLane, damage: BALANCE.redDamage });
      } else {
        this.relays++; this.score += 300; this.battery = Math.min(100, this.battery + route.charge); this.route = route.kind; this.routeUntil = gate.d + 180; this.combo += 1;
        this.emit('relay', { index: this.relays, route: route.kind, lane: physicalLane, charge: route.charge });
        if (this.relays % 3 === 0) { this.deliveries++; this.score += 1000; this.emit('delivery', { count: this.deliveries }); }
      }
    }
    this.distance += advance;
    const drain = this.route === 'eco' ? BALANCE.ecoDrain : BALANCE.baseDrain;
    this.battery = Math.max(0, this.battery - drain * dt);
    for (const event of this.events) {
      if (event.done || event.type === 'relay' || event.d > this.distance + .6) continue;
      if (event.d < this.distance - 4) { event.done = true; continue; }
      if (Math.abs(this.x - LANES[event.lane]) > .95) continue;
      event.done = true;
      if (event.type === 'battery') { this.battery = Math.min(100, this.battery + BALANCE.batteryCharge); this.pickups++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.score += 35 + Math.min(this.combo, 10) * 5; this.emit('battery', { lane: event.lane, charge: BALANCE.batteryCharge }); }
      else if (event.type === 'data') { const points = 15 + Math.min(this.combo, 10) * 3; this.score += points; this.emit('data', { lane: event.lane, points }); }
      else {
        const safe = event.type === 'barrier' && this.y > 1.05 || event.type === 'beam' && this.slide > .08;
        if (safe) { this.score += 60; this.combo++; this.emit('dodge'); }
        else if (this.invincible <= 0) { this.battery = Math.max(0, this.battery - (event.type === 'deadzone' ? 14 : 22)); this.hits++; this.combo = 0; this.invincible = 1.35; this.emit('hit', { obstacle: event.type }); }
      }
    }
    this.events = this.events.filter(e => e.d > this.distance - 20);
    if (this.distance + 170 > this.generatedUntil) this.generate();
    if (this.battery <= 0) { this.battery = 0; this.over = true; this.emit('over'); }
  }
  get points() { return Math.floor(this.score + this.distance * 2); }
  get nextGate() { return this.events.find(e => e.type === 'relay' && !e.done); }
  drainFeedback() { return this.feedback.splice(0); }
}
