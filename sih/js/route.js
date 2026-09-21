/**
 * V2V Rescue Link - Alternate Route & Detour Navigation Engine
 * Renders offline vector route topology showing blocked highway vs peer-negotiated bypass.
 */

class RouteEngine {
  constructor(state, containerId) {
    this.state = state;
    this.containerId = containerId;
    this.canvas = null;
    this.ctx = null;
    this.detourAccepted = false;
  }

  init() {
    this.canvas = document.getElementById(this.containerId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.render();

    // Re-render when route recalculated
    this.state.on('routeRecalculated', () => {
      this.render();
    });

    window.addEventListener('resize', () => this.render());
  }

  setDetourAccepted(accepted) {
    this.detourAccepted = accepted;
    this.render();
    this.state.addLog({
      sender: 'NAV_OFFLINE',
      receiver: 'DRIVER_HUD',
      message: accepted ? 'Alternate Route B accepted. Waypoints uploaded to vehicle OBU.' : 'Default route retained.',
      type: 'INFO'
    });
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width = this.canvas.clientWidth || 700;
    const h = this.canvas.height = this.canvas.clientHeight || 340;

    ctx.clearRect(0, 0, w, h);

    // Background terrain grid
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    // Subtle topographical grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Coordinates for the route network
    // Start node: Left center
    const startX = 60, startY = h / 2;
    // Junction point: where detour splits
    const juncX = w * 0.35, juncY = h / 2;
    // Blocked point on primary route
    const blockX = w * 0.65, blockY = h / 2;
    // Primary route end
    const endX = w - 60, endY = h / 2;

    // Bypass detour curve points
    const detourApexX = w * 0.55, detourApexY = h * 0.20;

    const isHazard = this.state.routeAdvice.hazardDetected;

    // Draw Primary Route (Bottom/Straight)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(juncX, juncY);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#3b82f6'; // Safe segment
    ctx.lineCap = 'round';
    ctx.stroke();

    // Blocked segment of primary route
    ctx.beginPath();
    ctx.moveTo(juncX, juncY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 10;
    if (isHazard) {
      ctx.strokeStyle = '#ef4444'; // Red blocked
      ctx.setLineDash([8, 6]);
    } else {
      ctx.strokeStyle = '#10b981'; // Green clear
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw Detour Alternate Route (Arching Top)
    ctx.beginPath();
    ctx.moveTo(juncX, juncY);
    ctx.quadraticCurveTo(detourApexX, detourApexY - 30, endX, endY);
    ctx.lineWidth = isHazard ? 8 : 4;
    ctx.strokeStyle = isHazard ? '#10b981' : 'rgba(16, 185, 129, 0.3)';
    if (isHazard) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Animated pulses along alternate route if recommended
    if (isHazard) {
      const pulseProgress = (Date.now() % 2000) / 2000;
      const t = pulseProgress;
      // Quadratic bezier point calculation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      const px = (1 - t) * (1 - t) * juncX + 2 * (1 - t) * t * detourApexX + t * t * endX;
      const py = (1 - t) * (1 - t) * juncY + 2 * (1 - t) * t * (detourApexY - 30) + t * t * endY;

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Nodes & Labels
    // Start Node (Current Convoy Position)
    this.drawNode(ctx, startX, startY, 'Convoy Origin', '#00f0ff', true);
    // Junction
    this.drawNode(ctx, juncX, juncY, 'Exit 14 (Detour Point)', '#e2e8f0', false);
    // Destination
    this.drawNode(ctx, endX, endY, 'Destination (Safe Zone)', '#10b981', false);

    // Hazard Marker on primary road
    if (isHazard) {
      ctx.beginPath();
      ctx.arc(blockX, blockY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(blockX, blockY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✕', blockX, blockY + 4);

      // Warning label
      ctx.fillStyle = '#ff4d6d';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('ROAD BLOCKED: ' + (this.state.routeAdvice.hazardType || 'HAZARD AHEAD'), blockX, blockY + 34);
    }

    // Detour label
    ctx.fillStyle = isHazard ? '#10b981' : 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ RECOMMENDED ALTERNATE BYPASS (Route B)', detourApexX, detourApexY - 45);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Distance: +2.8 km | ETA: +4m | Congestion: CLEAR', detourApexX, detourApexY - 30);
  }

  drawNode(ctx, x, y, label, color, isCurrent) {
    ctx.beginPath();
    ctx.arc(x, y, isCurrent ? 9 : 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 20);
  }
}

window.RouteEngine = RouteEngine;
