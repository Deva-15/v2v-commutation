/**
 * V2V Rescue Link - Canvas 2D Highway & Mesh Simulation Engine
 * Handles interactive road rendering, vehicle kinematics, wireless RF ranges,
 * dynamic ad-hoc mesh connections, animated data packets, and drag-and-drop.
 */

class SimulationEngine {
  constructor(canvasId, state, emergencyEngine, multiHopEngine) {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.state = state;
    this.emergency = emergencyEngine;
    this.multiHop = multiHopEngine;

    this.draggedVehicle = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.roadOffset = 0; // For endless highway motion
    this.animFrameId = null;
    this.lastTime = performance.now();

    // Visual options
    this.showRangeRings = true;
    this.showMeshLines = true;
    this.showPackets = true;
  }

  init() {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupInteractivity();
    this.startLoop();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent ? parent.clientWidth : 1100;
    this.canvas.height = 380;
  }

  setupInteractivity() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    const onStart = (e) => {
      const pos = getPos(e);
      // Check if clicked on any vehicle
      for (let i = this.state.vehicles.length - 1; i >= 0; i--) {
        const v = this.state.vehicles[i];
        const dx = pos.x - v.x;
        const dy = pos.y - v.y;
        if (Math.abs(dx) <= 35 && Math.abs(dy) <= 22) {
          this.draggedVehicle = v;
          this.dragOffsetX = dx;
          this.dragOffsetY = dy;
          this.canvas.style.cursor = 'grabbing';
          e.preventDefault();
          break;
        }
      }
    };

    const onMove = (e) => {
      if (!this.draggedVehicle) {
        // Hover cursor check
        const pos = getPos(e);
        let hovering = false;
        for (const v of this.state.vehicles) {
          if (Math.abs(pos.x - v.x) <= 35 && Math.abs(pos.y - v.y) <= 22) {
            hovering = true;
            break;
          }
        }
        this.canvas.style.cursor = hovering ? 'grab' : 'crosshair';
        return;
      }

      const pos = getPos(e);
      this.draggedVehicle.x = Math.max(40, Math.min(this.canvas.width - 40, pos.x - this.dragOffsetX));
      this.draggedVehicle.y = Math.max(100, Math.min(this.canvas.height - 80, pos.y - this.dragOffsetY));
      e.preventDefault();
    };

    const onEnd = () => {
      if (this.draggedVehicle) {
        this.draggedVehicle = null;
        this.canvas.style.cursor = 'default';
        this.state.emit('vehiclesChanged', this.state.vehicles);
      }
    };

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  startLoop() {
    const loop = (time) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      if (this.state.isSimRunning) {
        this.update(dt);
      }

      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  update(dt) {
    const effectiveDt = dt * this.state.simSpeed;

    // Advance road offset for parallax illusion
    this.roadOffset = (this.roadOffset + 120 * effectiveDt) % 80;

    // Update vehicle physics if not being dragged
    this.state.vehicles.forEach(v => {
      if (v === this.draggedVehicle) return;

      // Smooth speed adjustment towards targetSpeed
      if (v.speed < v.targetSpeed) {
        v.speed = Math.min(v.targetSpeed, v.speed + 15 * effectiveDt);
      } else if (v.speed > v.targetSpeed) {
        v.speed = Math.max(v.targetSpeed, v.speed - 30 * effectiveDt);
      }

      // Vehicles advance gently across the highway
      const speedPixelPerSec = (v.speed * 0.45);
      v.x += (speedPixelPerSec - 28) * effectiveDt;

      // Wrap around canvas smoothly
      if (v.x > this.canvas.width + 60) {
        v.x = -50;
      } else if (v.x < -60) {
        v.x = this.canvas.width + 40;
      }
    });

    // Update animated packets in flight
    for (let i = this.state.packets.length - 1; i >= 0; i--) {
      const pkt = this.state.packets[i];
      pkt.progress += 2.0 * effectiveDt; // ~0.5s transit
      if (pkt.progress >= 1.0) {
        pkt.progress = 1.0;
        if (pkt.onArrived) {
          pkt.onArrived();
        }
        this.state.packets.splice(i, 1);
      } else {
        pkt.currentX = pkt.fromX + (pkt.toX - pkt.fromX) * pkt.progress;
        pkt.currentY = pkt.fromY + (pkt.toY - pkt.fromY) * pkt.progress;
      }
    }

    // Check connections between all pairs
    this.checkRangeAndConnections();

    // Proximity, collision & blind spot evaluations
    if (this.emergency) {
      this.emergency.evaluateCollisions();
      this.emergency.evaluateBlindSpot();
    }
  }

  checkRangeAndConnections() {
    const currentLinks = new Set();
    const vehicles = this.state.vehicles;

    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const v1 = vehicles[i];
        const v2 = vehicles[j];
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distMeters = Math.round(distPx * 0.75);

        // Within direct Wi-Fi Direct / BLE Range?
        const range = Math.max(v1.rangeMeters, v2.rangeMeters);
        if (distMeters <= range) {
          const key = `${v1.id}-${v2.id}`;
          currentLinks.add(key);

          // If newly connected
          if (!this.state.activeLinks.has(key)) {
            this.state.activeLinks.add(key);
            this.state.addLog({
              sender: v1.id,
              receiver: v2.id,
              message: `V2V CONNECTION ESTABLISHED (${distMeters}m). Direct P2P link active.`,
              type: 'BEACON',
              protocol: 'Wi-Fi Direct / BLE 5.4',
              rssi: `-${Math.round(45 + (distMeters / range) * 35)} dBm`
            });
            this.state.emit('connectionEstablished', { v1: v1.id, v2: v2.id, distance: distMeters });
          }
        } else {
          const key = `${v1.id}-${v2.id}`;
          if (this.state.activeLinks.has(key)) {
            this.state.activeLinks.delete(key);
            this.state.addLog({
              sender: v1.id,
              receiver: v2.id,
              message: `VEHICLE OUT OF RANGE (${distMeters}m > ${range}m limit). Link gracefully terminated.`,
              type: 'INFO'
            });
            this.state.emit('connectionLost', { v1: v1.id, v2: v2.id });
          }
        }
      }
    }
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Highway & Asphalt
    this.renderHighway(ctx, w, h);

    // 2. Draw Hazards & Disasters on Road
    this.renderHazards(ctx);

    // 3. Draw Range Rings (Halo fields)
    if (this.showRangeRings) {
      this.renderRangeRings(ctx);
    }

    // 4. Draw Mesh Connection Lines & Signal Waves
    if (this.showMeshLines) {
      this.renderMeshConnections(ctx);
    }

    // 5. Draw Vehicles
    this.renderVehicles(ctx);

    // 6. Draw Animated Data Packets in Flight
    if (this.showPackets) {
      this.renderPackets(ctx);
    }
  }

  renderHighway(ctx, w, h) {
    // Shoulder / Road Verge
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Roadway asphalt
    const roadTop = 80;
    const roadHeight = 240;
    ctx.fillStyle = '#172033';
    ctx.fillRect(0, roadTop, w, roadHeight);

    // Road top & bottom solid curb lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, roadTop);
    ctx.lineTo(w, roadTop);
    ctx.moveTo(0, roadTop + roadHeight);
    ctx.lineTo(w, roadTop + roadHeight);
    ctx.stroke();

    // Lane Dividers (Dashed White Lines)
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([24, 24]);
    ctx.lineDashOffset = -this.roadOffset;

    // Lane 1 divider (y = 160)
    ctx.beginPath();
    ctx.moveTo(0, roadTop + 80);
    ctx.lineTo(w, roadTop + 80);
    ctx.stroke();

    // Lane 2 divider (y = 240)
    ctx.beginPath();
    ctx.moveTo(0, roadTop + 160);
    ctx.lineTo(w, roadTop + 160);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Overhead HUD Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, 40);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, 40);

    // HUD Status overlay text
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📡 V2V AD-HOC HIGHWAY MESH  |  PROTOCOL: 802.11p / WI-FI AWARE NAN  |  INTERNET: NOT REQUIRED', 16, 24);

    const userV = this.state.getUserVehicle();
    if (userV) {
      ctx.textAlign = 'right';
      ctx.fillStyle = userV.status === 'EMERGENCY' ? '#ff2a5f' : (userV.status === 'WARNING' ? '#ffb703' : '#10b981');
      ctx.fillText(`MY VEHICLE: ${userV.id}  [${userV.speed.toFixed(0)} KM/H]  STATUS: ${userV.status}`, w - 16, 24);
    }
  }

  renderHazards(ctx) {
    this.state.hazards.forEach(hazard => {
      // Glow circle
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, 42, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();

      // Flashing alert border
      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();

      // Hazard icon
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hazard.icon || '⚠️', hazard.x, hazard.y - 6);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(hazard.title, hazard.x, hazard.y + 24);
    });
  }

  renderRangeRings(ctx) {
    const time = Date.now() / 1000;
    this.state.vehicles.forEach(v => {
      const radiusPx = v.rangeMeters / 0.75; // convert meters to pixels

      // Outer Wi-Fi Direct Range Ring
      ctx.beginPath();
      ctx.arc(v.x, v.y, radiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = v.isUser ? 'rgba(0, 240, 255, 0.22)' : 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Expanding Radio Beacon Ripple
      const rippleProgress = (time * 0.8 + (v.id.charCodeAt(2) || 0) * 0.3) % 1;
      const rippleRadius = radiusPx * rippleProgress;
      ctx.beginPath();
      ctx.arc(v.x, v.y, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 * (1 - rippleProgress)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner BLE Range Circle (90m ~ 120px)
      const blePx = v.bleRangeMeters / 0.75;
      ctx.beginPath();
      ctx.arc(v.x, v.y, blePx, 0, Math.PI * 2);
      ctx.fillStyle = v.isUser ? 'rgba(0, 240, 255, 0.03)' : 'rgba(59, 130, 246, 0.02)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  renderMeshConnections(ctx) {
    const vehicles = this.state.vehicles;
    const time = Date.now() / 1000;

    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const v1 = vehicles[i];
        const v2 = vehicles[j];
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distMeters = Math.round(dist * 0.75);

        if (distMeters <= Math.max(v1.rangeMeters, v2.rangeMeters)) {
          // Link strength 0..1
          const maxDist = Math.max(v1.rangeMeters, v2.rangeMeters) / 0.75;
          const strength = 1 - (dist / maxDist);

          // Draw Glowing Mesh Line
          ctx.beginPath();
          ctx.moveTo(v1.x, v1.y);
          ctx.lineTo(v2.x, v2.y);
          ctx.lineWidth = 1.5 + strength * 1.5;
          
          const isEmergencyLink = v1.status === 'EMERGENCY' || v2.status === 'EMERGENCY';
          ctx.strokeStyle = isEmergencyLink 
            ? `rgba(255, 42, 95, ${0.4 + strength * 0.5})` 
            : `rgba(0, 240, 255, ${0.25 + strength * 0.45})`;

          ctx.shadowColor = isEmergencyLink ? '#ff2a5f' : '#00f0ff';
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Moving photons along line to visualize continuous heartbeat exchange
          const photonCount = 2;
          for (let p = 0; p < photonCount; p++) {
            const pProgress = ((time * 1.2 + p * 0.5) % 1);
            const px = v1.x + dx * pProgress;
            const py = v1.y + dy * pProgress;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = isEmergencyLink ? '#ff4d6d' : '#ffffff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Distance Tag at midpoint
          const midX = (v1.x + v2.x) / 2;
          const midY = (v1.y + v2.y) / 2;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(midX - 22, midY - 10, 44, 16);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
          ctx.strokeRect(midX - 22, midY - 10, 44, 16);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px Orbitron, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${distMeters}m`, midX, midY - 1);
        }
      }
    }
  }

  renderVehicles(ctx) {
    this.state.vehicles.forEach(v => {
      ctx.save();
      ctx.translate(v.x, v.y);

      const isDragged = (v === this.draggedVehicle);

      // Drag highlight aura
      if (isDragged) {
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.fill();
      }

      // User Vehicle Reticle & Halo
      if (v.isUser) {
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vehicle Chassis (Futuristic Sleek Top-Down Car)
      const carW = 56;
      const carH = 26;

      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Main body rounded rect
      ctx.fillStyle = v.color || '#3b82f6';
      this.roundRect(ctx, -carW / 2, -carH / 2, carW, carH, 6, true, false);
      ctx.shadowBlur = 0; // reset

      // Windshield & Roof cabin
      ctx.fillStyle = '#0b1329';
      this.roundRect(ctx, -carW * 0.25, -carH * 0.35, carW * 0.55, carH * 0.7, 4, true, false);

      // Front Headlights (Facing East / Right)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.fillRect(carW / 2 - 2, -carH * 0.35, 3, 5);
      ctx.fillRect(carW / 2 - 2, carH * 0.35 - 5, 3, 5);
      ctx.shadowBlur = 0;

      // Rear Taillights / Brake Lights (Facing West / Left)
      if (v.brakeLight) {
        // Blazing red brake lights
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 20;
        ctx.fillRect(-carW / 2 - 2, -carH * 0.4, 4, 8);
        ctx.fillRect(-carW / 2 - 2, carH * 0.4 - 8, 4, 8);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#990022';
        ctx.fillRect(-carW / 2, -carH * 0.35, 2, 5);
        ctx.fillRect(-carW / 2, carH * 0.35 - 5, 2, 5);
      }

      // Center roof beacon LED
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = v.status === 'EMERGENCY' ? '#ff2a5f' : (v.status === 'WARNING' ? '#ffb703' : '#00f0ff');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Top Vehicle ID Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(v.id + (v.isUser ? ' [YOU]' : ''), 0, -carH / 2 - 6);

      // Bottom Speed & Status Badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px Inter, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${v.speed.toFixed(0)} km/h | ${v.status}`, 0, carH / 2 + 5);

      ctx.restore();
    });
  }

  renderPackets(ctx) {
    this.state.packets.forEach(pkt => {
      ctx.beginPath();
      ctx.arc(pkt.currentX, pkt.currentY, 6, 0, Math.PI * 2);
      ctx.fillStyle = pkt.color || '#ff2a5f';
      ctx.shadowColor = pkt.color || '#ff2a5f';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Packet ping ripple
      ctx.beginPath();
      ctx.arc(pkt.currentX, pkt.currentY, 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 42, 95, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini payload badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PACKET', pkt.currentX, pkt.currentY - 10);
    });
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

window.SimulationEngine = SimulationEngine;
