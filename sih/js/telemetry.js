/**
 * V2V Rescue Link - Cockpit Telemetry & Instrumentation Controller
 * Updates dashboard telemetry gauges, neighbor vehicle cards, blind-spot radar,
 * collision warning HUD, and continuous monitoring metrics.
 */

class TelemetryController {
  constructor(state) {
    this.state = state;
    this.radarCanvas = null;
    this.radarCtx = null;
    this.radarSweepAngle = 0;
  }

  init() {
    this.radarCanvas = document.getElementById('blindSpotRadarCanvas');
    if (this.radarCanvas) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }

    this.bindEvents();
    this.startUpdateLoops();
  }

  bindEvents() {
    this.state.on('vehiclesChanged', () => this.updateDashboard());
    this.state.on('collisionStatusChanged', (data) => this.updateCollisionHUD(data));
    this.state.on('blindSpotChanged', (data) => this.updateBlindSpotHUD(data));
  }

  startUpdateLoops() {
    // 10Hz telemetry refresh
    setInterval(() => {
      this.updateDashboard();
      this.updateMonitoringMetrics();
    }, 100);

    // 60fps radar sweep animation
    const renderRadar = () => {
      this.renderBlindSpotRadar();
      requestAnimationFrame(renderRadar);
    };
    requestAnimationFrame(renderRadar);
  }

  updateDashboard() {
    const user = this.state.getUserVehicle();
    if (!user) return;

    // My Vehicle Stats
    const speedEl = document.getElementById('hudSpeedVal');
    if (speedEl) speedEl.textContent = Math.round(user.speed);

    const headingEl = document.getElementById('hudHeadingVal');
    if (headingEl) headingEl.textContent = user.direction;

    const batteryEl = document.getElementById('hudBatteryVal');
    const batteryBarEl = document.getElementById('hudBatteryBar');
    if (batteryEl) batteryEl.textContent = `${this.state.power.battery}%`;
    if (batteryBarEl) batteryBarEl.style.width = `${this.state.power.battery}%`;

    const safetyStatusEl = document.getElementById('hudSafetyStatus');
    if (safetyStatusEl) {
      safetyStatusEl.textContent = user.status;
      safetyStatusEl.className = `status-chip status-${user.status.toLowerCase()}`;
    }

    // Nearby Vehicles List
    const peersContainer = document.getElementById('nearbyPeersList');
    if (peersContainer) {
      const peers = this.state.vehicles.filter(v => v.id !== user.id);
      
      let html = '';
      peers.forEach(peer => {
        const dx = peer.x - user.x;
        const dy = peer.y - user.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distM = Math.round(distPx * 0.75);
        const relSpeed = Math.round(peer.speed - user.speed);
        const isConnected = distM <= Math.max(user.rangeMeters, peer.rangeMeters);
        const rssi = isConnected ? `-${Math.round(42 + (distM / user.rangeMeters) * 45)} dBm` : 'OUT OF RANGE';

        html += `
          <div class="peer-card ${isConnected ? 'connected' : 'disconnected'} ${peer.status === 'EMERGENCY' ? 'peer-emergency' : ''}">
            <div class="peer-header">
              <div class="peer-id-badge" style="border-left-color: ${peer.color}">
                <span class="peer-dot" style="background: ${peer.color}"></span>
                <strong>${peer.id}</strong> - ${peer.name}
              </div>
              <span class="peer-link-status ${isConnected ? 'active' : 'inactive'}">
                ${isConnected ? '● V2V LINK ACTIVE' : '○ DISCONNECTED'}
              </span>
            </div>
            <div class="peer-grid">
              <div class="peer-metric">
                <span class="metric-label">DISTANCE</span>
                <span class="metric-val ${distM < 20 ? 'val-danger' : ''}">${distM} m</span>
              </div>
              <div class="peer-metric">
                <span class="metric-label">SPEED / REL</span>
                <span class="metric-val">${Math.round(peer.speed)} km/h (${relSpeed >= 0 ? '+' : ''}${relSpeed})</span>
              </div>
              <div class="peer-metric">
                <span class="metric-label">SIGNAL (RSSI)</span>
                <span class="metric-val">${rssi}</span>
              </div>
              <div class="peer-metric">
                <span class="metric-label">PROTOCOL</span>
                <span class="metric-val">${peer.protocol}</span>
              </div>
            </div>
          </div>
        `;
      });

      peersContainer.innerHTML = html;
    }

    // Dynamic Link String: e.g. Vehicle V01 ↔ Vehicle V02 ↔ Vehicle V03
    const linkFlowEl = document.getElementById('v2vLinkChainDisplay');
    if (linkFlowEl) {
      const activeIds = this.state.vehicles.map(v => `<strong>${v.id}</strong>`).join('  <span class="mesh-arrow">↔</span>  ');
      linkFlowEl.innerHTML = activeIds;
    }
  }

  updateCollisionHUD(alert) {
    const hud = document.getElementById('collisionWarningBanner');
    if (!hud) return;

    if (alert.active) {
      hud.classList.remove('hidden');
      hud.className = `collision-banner risk-${alert.riskLevel.toLowerCase()}`;
      
      const targetEl = document.getElementById('colTargetVehicle');
      if (targetEl) targetEl.textContent = alert.targetVehicleId;

      const distEl = document.getElementById('colDistance');
      if (distEl) distEl.textContent = `${alert.distance} m`;

      const speedEl = document.getElementById('colSpeed');
      if (speedEl) speedEl.textContent = `${Math.round(alert.relativeSpeed)} km/h`;

      const riskEl = document.getElementById('colRisk');
      if (riskEl) riskEl.textContent = alert.riskLevel;

      const ttcEl = document.getElementById('colTtc');
      if (ttcEl) ttcEl.textContent = `${alert.ttcSeconds}s`;
    } else {
      hud.classList.add('hidden');
    }
  }

  updateBlindSpotHUD(bs) {
    const leftWarnEl = document.getElementById('blindSpotLeftIndicator');
    const rightWarnEl = document.getElementById('blindSpotRightIndicator');
    const statusTextEl = document.getElementById('blindSpotStatusText');

    if (leftWarnEl) {
      leftWarnEl.classList.toggle('active', bs.leftDetected);
    }
    if (rightWarnEl) {
      rightWarnEl.classList.toggle('active', bs.rightDetected);
    }

    if (statusTextEl) {
      if (bs.leftDetected) {
        statusTextEl.innerHTML = `<span class="text-danger">⚠️ VEHICLE IN LEFT BLIND SPOT (${bs.nearVehicleId} @ ${bs.distanceMeters}m)</span>`;
      } else if (bs.rightDetected) {
        statusTextEl.innerHTML = `<span class="text-danger">⚠️ VEHICLE IN RIGHT BLIND SPOT (${bs.nearVehicleId} @ ${bs.distanceMeters}m)</span>`;
      } else {
        statusTextEl.innerHTML = `<span class="text-safe">✓ BLIND SPOTS CLEAR (360° SENSOR ACTIVE)</span>`;
      }
    }
  }

  renderBlindSpotRadar() {
    if (!this.radarCanvas || !this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width = 240;
    const h = this.radarCanvas.height = 240;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Radar circular background
    ctx.fillStyle = '#0b1120';
    ctx.beginPath();
    ctx.arc(cx, cy, 105, 0, Math.PI * 2);
    ctx.fill();

    // Range rings
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - 105, cy);
    ctx.lineTo(cx + 105, cy);
    ctx.moveTo(cx, cy - 105);
    ctx.lineTo(cx, cy + 105);
    ctx.stroke();

    // Blind Spot Arc Zones (Left: 190° - 250°, Right: 290° - 350°)
    const bs = this.state.blindSpot;
    
    // Left Zone (y < 0 in canvas road)
    ctx.beginPath();
    ctx.arc(cx, cy, 75, Math.PI * 0.95, Math.PI * 1.4);
    ctx.lineWidth = 8;
    ctx.strokeStyle = bs.leftDetected ? 'rgba(239, 68, 68, 0.85)' : 'rgba(234, 179, 8, 0.2)';
    ctx.stroke();

    // Right Zone
    ctx.beginPath();
    ctx.arc(cx, cy, 75, Math.PI * 1.6, Math.PI * 2.05);
    ctx.lineWidth = 8;
    ctx.strokeStyle = bs.rightDetected ? 'rgba(239, 68, 68, 0.85)' : 'rgba(234, 179, 8, 0.2)';
    ctx.stroke();

    // Rotating sweep line
    this.radarSweepAngle = (this.radarSweepAngle + 0.04) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.radarSweepAngle) * 105, cy + Math.sin(this.radarSweepAngle) * 105);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Own Vehicle Marker in Center
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(cx - 6, cy - 12, 12, 24);
    ctx.shadowBlur = 0;

    // Nearby vehicles blips on radar
    const user = this.state.getUserVehicle();
    if (user) {
      this.state.vehicles.forEach(other => {
        if (other.id === user.id) return;
        const dx = (other.x - user.x) * 0.4;
        const dy = (other.y - user.y) * 0.4;
        const blipX = cx + dy; // Lateral map
        const blipY = cy - dx; // Longitudinal map

        if (Math.hypot(blipX - cx, blipY - cy) <= 100) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 4, 0, Math.PI * 2);
          ctx.fillStyle = other.color || '#ef4444';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#ffffff';
          ctx.font = '8px Orbitron, monospace';
          ctx.fillText(other.id, blipX + 6, blipY + 3);
        }
      });
    }
  }

  updateMonitoringMetrics() {
    const ppsEl = document.getElementById('monPpsVal');
    const latEl = document.getElementById('monLatVal');
    const peersCountEl = document.getElementById('monPeersCount');
    const hazardsCountEl = document.getElementById('monHazardsCount');

    if (ppsEl) {
      const base = 42 + Math.floor(Math.random() * 8);
      ppsEl.textContent = `${base} pkt/s`;
    }
    if (latEl) {
      const lat = 11.2 + (Math.random() * 2.5);
      latEl.textContent = `${lat.toFixed(1)} ms`;
    }
    if (peersCountEl) {
      peersCountEl.textContent = this.state.vehicles.length - 1;
    }
    if (hazardsCountEl) {
      hazardsCountEl.textContent = this.state.hazards.length;
    }
  }
}

window.TelemetryController = TelemetryController;
