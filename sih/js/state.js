/**
 * V2V Rescue Link - Global Simulation State & Event System
 */

class V2VState {
  constructor() {
    this.listeners = {};
    
    // Core Mode Flags
    this.isOfflineMode = true; // Network-independent by default!
    this.isSimRunning = true;
    this.simSpeed = 1.0; // 1x, 2x, 4x
    
    // Primary User Vehicle (V01 - Titan Lead)
    this.myVehicleId = 'V01';
    
    // Low Power Operation Status
    this.power = {
      battery: 87,
      mode: 'LOW POWER (ADAPTIVE)',
      currentDrawMa: 28.4,
      dutyCycle: '10% RX / 90% SLEEP',
      savingsPercent: 64
    };

    // Vehicles on Highway
    // Canvas coordinate space: 0 to 1200 x-axis, lanes on y-axis
    this.vehicles = [
      {
        id: 'V01',
        name: 'Rescue Lead (User)',
        x: 200,
        y: 190,
        lane: 1,
        speed: 72, // km/h
        targetSpeed: 72,
        direction: 'EAST (088°)',
        headingDeg: 88,
        status: 'SAFE', // SAFE, WARNING, EMERGENCY
        color: '#00f0ff', // Cyan
        rangeMeters: 280, // Wi-Fi Direct range
        bleRangeMeters: 90,
        isUser: true,
        brakeLight: false,
        emergencyType: null,
        battery: 87,
        protocol: 'Wi-Fi Direct / BLE 5.4'
      },
      {
        id: 'V02',
        name: 'Patrol Sedan',
        x: 460,
        y: 190,
        lane: 1,
        speed: 74,
        targetSpeed: 74,
        direction: 'EAST (088°)',
        headingDeg: 88,
        status: 'SAFE',
        color: '#3b82f6', // Blue
        rangeMeters: 280,
        bleRangeMeters: 90,
        isUser: false,
        brakeLight: false,
        emergencyType: null,
        battery: 92,
        protocol: 'Wi-Fi Direct'
      },
      {
        id: 'V03',
        name: 'Commercial Freight',
        x: 740,
        y: 270,
        lane: 2,
        speed: 68,
        targetSpeed: 68,
        direction: 'EAST (088°)',
        headingDeg: 88,
        status: 'SAFE',
        color: '#a855f7', // Purple
        rangeMeters: 280,
        bleRangeMeters: 90,
        isUser: false,
        brakeLight: false,
        emergencyType: null,
        battery: 98,
        protocol: 'Wi-Fi Direct'
      },
      {
        id: 'V04',
        name: 'Civic EV',
        x: 1030,
        y: 190,
        lane: 1,
        speed: 70,
        targetSpeed: 70,
        direction: 'EAST (088°)',
        headingDeg: 88,
        status: 'SAFE',
        color: '#10b981', // Emerald
        rangeMeters: 280,
        bleRangeMeters: 90,
        isUser: false,
        brakeLight: false,
        emergencyType: null,
        battery: 79,
        protocol: 'Wi-Fi Direct'
      }
    ];

    // Hazards / Disasters on Road
    this.hazards = []; // { id, type, x, y, label, severity, description, active }

    // Active Packets traveling between nodes
    this.packets = []; // { id, fromId, toId, progress: 0..1, type, payload, color }

    // Multi-Hop Relays active
    this.multiHopChains = [];

    // Blind spot state for V01
    this.blindSpot = {
      leftDetected: false,
      rightDetected: false,
      nearVehicleId: null,
      distanceMeters: null
    };

    // Collision alert state
    this.collisionAlert = {
      active: false,
      targetVehicleId: null,
      distance: null,
      relativeSpeed: null,
      riskLevel: 'NONE', // NONE, LOW, MODERATE, HIGH, CRITICAL
      ttcSeconds: null
    };

    // Alternate route suggestion
    this.routeAdvice = {
      hazardDetected: false,
      hazardType: null,
      blockedRoad: 'National Highway 48 (Corridor A)',
      alternateRoad: 'West Mountain Bypass (Link Route B)',
      etaDelta: '+4 mins',
      distanceDelta: '+2.8 km',
      safetyConfidence: '98%',
      suggested: false
    };

    // Message Log Console
    this.logs = [];
    this.maxLogs = 80;

    // Direct connections map { 'V01-V02': true }
    this.activeLinks = new Set();
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event ${event}:`, e); }
      });
    }
  }

  addLog(entry) {
    const timestamp = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    const logItem = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: timestamp,
      sender: entry.sender || 'SYS',
      receiver: entry.receiver || 'BROADCAST',
      message: entry.message,
      type: entry.type || 'INFO', // INFO, BEACON, EMERGENCY, RELAY, WARNING, SUCCESS
      hops: entry.hops !== undefined ? entry.hops : 0,
      protocol: entry.protocol || (this.isOfflineMode ? 'V2V P2P' : 'CELLULAR'),
      rssi: entry.rssi || '-62 dBm'
    };

    this.logs.unshift(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    this.emit('logAdded', logItem);
  }

  getUserVehicle() {
    return this.vehicles.find(v => v.id === this.myVehicleId) || this.vehicles[0];
  }

  getVehicleById(id) {
    return this.vehicles.find(v => v.id === id);
  }

  addVehicle(custom) {
    if (this.vehicles.length >= 8) {
      return null;
    }
    const idx = this.vehicles.length + 1;
    const newId = 'V0' + idx;
    const colors = ['#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#e11d48'];
    const lane = (idx % 3) + 1;
    const yPos = 110 + (lane - 1) * 80;
    const xPos = 120 + ((idx * 160) % 900);

    const vehicle = {
      id: newId,
      name: `Vehicle ${newId}`,
      x: xPos,
      y: yPos,
      lane: lane,
      speed: 68 + Math.floor(Math.random() * 10),
      targetSpeed: 70,
      direction: 'EAST (088°)',
      headingDeg: 88,
      status: 'SAFE',
      color: colors[(idx - 1) % colors.length],
      rangeMeters: 280,
      bleRangeMeters: 90,
      isUser: false,
      brakeLight: false,
      emergencyType: null,
      battery: 80 + Math.floor(Math.random() * 18),
      protocol: 'Wi-Fi Direct / BLE 5.4'
    };

    this.vehicles.push(vehicle);
    this.addLog({
      sender: newId,
      receiver: 'BROADCAST',
      message: `Node ${newId} joined ad-hoc P2P network mesh`,
      type: 'INFO',
      hops: 0
    });
    this.emit('vehiclesChanged', this.vehicles);
    return vehicle;
  }

  removeVehicle(id) {
    if (this.vehicles.length <= 2) return false;
    const targetId = id || this.vehicles[this.vehicles.length - 1].id;
    if (targetId === this.myVehicleId) return false; // Don't remove user vehicle

    this.vehicles = this.vehicles.filter(v => v.id !== targetId);
    this.addLog({
      sender: targetId,
      receiver: 'BROADCAST',
      message: `Node ${targetId} left V2V communication cluster`,
      type: 'INFO'
    });
    this.emit('vehiclesChanged', this.vehicles);
    return true;
  }

  resetSimulation() {
    this.hazards = [];
    this.packets = [];
    this.multiHopChains = [];
    this.collisionAlert = {
      active: false,
      targetVehicleId: null,
      distance: null,
      relativeSpeed: null,
      riskLevel: 'NONE',
      ttcSeconds: null
    };
    this.routeAdvice.hazardDetected = false;
    this.routeAdvice.suggested = false;

    // Reset vehicle positions and states
    this.vehicles.forEach((v, i) => {
      v.status = 'SAFE';
      v.brakeLight = false;
      v.emergencyType = null;
      v.targetSpeed = 70 + (i % 2) * 4;
      v.speed = v.targetSpeed;
    });

    this.vehicles[0].x = 180;
    this.vehicles[0].y = 190;
    if (this.vehicles[1]) { this.vehicles[1].x = 440; this.vehicles[1].y = 190; }
    if (this.vehicles[2]) { this.vehicles[2].x = 720; this.vehicles[2].y = 270; }
    if (this.vehicles[3]) { this.vehicles[3].x = 1000; this.vehicles[3].y = 190; }

    this.addLog({
      sender: 'SYS',
      receiver: 'ALL',
      message: 'Simulation reset to baseline nominal parameters. Direct V2V mesh operational.',
      type: 'SUCCESS'
    });

    this.emit('simulationReset');
    this.emit('vehiclesChanged', this.vehicles);
  }
}

window.v2vState = new V2VState();
