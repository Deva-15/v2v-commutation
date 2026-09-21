/**
 * V2V Rescue Link - Main Application Controller
 * Wires together all 27 features, tabs, audio, simulation controls, message logs, and offline mode.
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = window.v2vState;
  const audio = window.v2vAudio;
  
  // Initialize Sub-Engines
  const multiHop = new window.MultiHopEngine(state, audio);
  const emergency = new window.EmergencyEngine(state, audio, multiHop);
  const simulation = new window.SimulationEngine('v2vCanvas', state, emergency, multiHop);
  const telemetry = new window.TelemetryController(state);
  const routeEngine = new window.RouteEngine(state, 'detourMapCanvas');
  const demoRunner = new window.DemoScenarioRunner(state, audio, emergency, multiHop, routeEngine);

  window.v2vApp = {
    state,
    audio,
    multiHop,
    emergency,
    simulation,
    telemetry,
    routeEngine,
    demoRunner
  };

  // Start Engines
  simulation.init();
  telemetry.init();
  routeEngine.init();

  // Setup UI Controllers
  setupNavigation();
  setupSimulationControls(simulation, state, emergency, demoRunner);
  setupEmergencyPanel(emergency, state);
  setupDisasterPanel(emergency, state);
  setupMultiHopUI(multiHop, state);
  setupMessageLogConsole(state);
  setupOfflineModeToggle(state);
  setupAudioToggle(audio);
  setupLandingRoadBanner();

  // Initial welcome log
  state.addLog({
    sender: 'V2V_CORE',
    receiver: 'ALL_NODES',
    message: 'V2V Rescue Link initialized. Direct ad-hoc Wi-Fi Aware & BLE Mesh operational.',
    type: 'SUCCESS'
  });
  state.addLog({
    sender: 'NET_SUPERVISOR',
    receiver: 'SEC_LAYER',
    message: 'Offline resilience confirmed. Zero cloud server dependency verified.',
    type: 'INFO'
  });
});

/**
 * 1. Navigation & View Switcher
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, [data-navigate]');
  const views = document.querySelectorAll('.app-view');

  function showView(viewId) {
    views.forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-target') === viewId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Resize canvas if switching to simulation or route
    if (viewId === 'viewSimulation' && window.v2vApp.simulation) {
      setTimeout(() => window.v2vApp.simulation.resizeCanvas(), 50);
    }
    if (viewId === 'viewRoute' && window.v2vApp.routeEngine) {
      setTimeout(() => window.v2vApp.routeEngine.render(), 50);
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target') || link.getAttribute('data-navigate');
      if (target) {
        showView(target);
      }
    });
  });

  // Mobile hamburger menu toggle
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('primaryNav');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-open');
      });
    });
  }
}

/**
 * 2. Simulation Control Bar
 */
function setupSimulationControls(simulation, state, emergency, demoRunner) {
  // Play / Pause
  const playPauseBtn = document.getElementById('btnSimPlayPause');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      state.isSimRunning = !state.isSimRunning;
      playPauseBtn.innerHTML = state.isSimRunning 
        ? '<span>⏸</span> Pause Sim' 
        : '<span>▶</span> Resume Sim';
      playPauseBtn.classList.toggle('btn-paused', !state.isSimRunning);
    });
  }

  // Speed Multiplier
  const speedBtn = document.getElementById('btnSimSpeed');
  if (speedBtn) {
    const speeds = [1.0, 2.0, 4.0];
    let speedIdx = 0;
    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      state.simSpeed = speeds[speedIdx];
      speedBtn.textContent = `${state.simSpeed}x Speed`;
    });
  }

  // Add Vehicle
  const addBtn = document.getElementById('btnSimAddVehicle');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const added = state.addVehicle();
      if (!added) {
        showToast('Max vehicle limit reached (8 vehicles).');
      } else {
        showToast(`Vehicle ${added.id} spawned on highway.`);
      }
    });
  }

  // Remove Vehicle
  const removeBtn = document.getElementById('btnSimRemoveVehicle');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const removed = state.removeVehicle();
      if (!removed) {
        showToast('Minimum 2 vehicles required for V2V link.');
      } else {
        showToast('Vehicle removed from simulation.');
      }
    });
  }

  // Reset Simulation
  const resetBtn = document.getElementById('btnSimReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.resetSimulation();
      showToast('Simulation reset to nominal highway parameters.');
    });
  }

  // Demo Scenario Launcher
  const demoLaunchBtns = document.querySelectorAll('.btn-launch-demo');
  demoLaunchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      demoRunner.start();
    });
  });

  const demoNextBtn = document.getElementById('demoNextStepBtn');
  if (demoNextBtn) {
    demoNextBtn.addEventListener('click', () => {
      demoRunner.next();
    });
  }

  const demoCloseBtn = document.getElementById('demoCloseBtn');
  if (demoCloseBtn) {
    demoCloseBtn.addEventListener('click', () => {
      demoRunner.stop();
    });
  }

  const closeSuccessBanner = document.getElementById('closeSuccessBanner');
  if (closeSuccessBanner) {
    closeSuccessBanner.addEventListener('click', () => {
      document.getElementById('demoFinalSuccessBanner').classList.add('hidden');
    });
  }
}

/**
 * 3. Emergency Alerts Panel
 */
function setupEmergencyPanel(emergency, state) {
  const triggers = [
    { id: 'btnTriggerAccident', type: 'accident' },
    { id: 'btnTriggerBreakdown', type: 'breakdown' },
    { id: 'btnTriggerMedical', type: 'medical' },
    { id: 'btnTriggerFire', type: 'fire' },
    { id: 'btnTriggerHazard', type: 'hazard' },
    { id: 'btnTriggerBrake', action: () => emergency.triggerEmergencyBraking('V01') }
  ];

  triggers.forEach(t => {
    const el = document.getElementById(t.id);
    if (el) {
      el.addEventListener('click', () => {
        if (t.action) {
          t.action();
        } else {
          emergency.triggerEmergency(t.type, 'V01');
        }
        showToast(`Emergency alert broadcasted via direct V2V!`);
      });
    }
  });

  // Sudden Braking Quick Buttons
  const quickBrakeBtns = document.querySelectorAll('.btn-quick-brake');
  quickBrakeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      emergency.triggerEmergencyBraking('V01');
      showToast('⚠️ EMERGENCY BRAKING DETECTED BY V01');
    });
  });
}

/**
 * 4. Disaster Detection Panel
 */
function setupDisasterPanel(emergency, state) {
  const disasterBtns = document.querySelectorAll('[data-disaster]');
  disasterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const disasterKey = btn.getAttribute('data-disaster');
      emergency.triggerDisaster(disasterKey);
      showToast(`Disaster scenario active: ${disasterKey.toUpperCase()}`);
    });
  });

  const clearHazardsBtn = document.getElementById('btnClearHazards');
  if (clearHazardsBtn) {
    clearHazardsBtn.addEventListener('click', () => {
      state.hazards = [];
      state.routeAdvice.hazardDetected = false;
      state.routeAdvice.suggested = false;
      state.emit('routeRecalculated', state.routeAdvice);
      state.emit('vehiclesChanged', state.vehicles);
      state.addLog({
        sender: 'HIGHWAY_CREW',
        receiver: 'ALL_NODES',
        message: 'Road hazards cleared. Nominal traffic conditions restored.',
        type: 'SUCCESS'
      });
      showToast('All road hazards cleared.');
    });
  }
}

/**
 * 5. Multi-Hop Communication UI
 */
function setupMultiHopUI(multiHop, state) {
  const triggerRelayBtn = document.getElementById('btnTriggerMultiHop');
  if (triggerRelayBtn) {
    triggerRelayBtn.addEventListener('click', () => {
      multiHop.broadcastEmergency('V01', 'MULTI_HOP_TEST', '🚨 TEST BROADCAST: Multi-hop mesh relay test packet across convoy.');
      showToast('Multi-hop relay sequence initiated!');
    });
  }

  // Update step progression visually in the Multi-hop view
  state.on('multiHopStep', ({ chainData, stepInfo }) => {
    const stepEl = document.getElementById(`relayStepNode${stepInfo.hopNumber}`);
    if (stepEl) {
      stepEl.classList.add('step-active');
      const timeEl = stepEl.querySelector('.step-time');
      if (timeEl) timeEl.textContent = `${stepInfo.latencyMs}ms`;
    }
  });

  state.on('multiHopStarted', () => {
    document.querySelectorAll('.relay-step-card').forEach(c => c.classList.remove('step-active', 'step-done'));
  });

  state.on('multiHopCompleted', (chain) => {
    document.querySelectorAll('.relay-step-card').forEach(c => c.classList.add('step-done'));
    const badge = document.getElementById('multihopStatusBadge');
    if (badge) {
      badge.textContent = `COMPLETED (${chain.steps.length} Hops | ${chain.totalLatencyMs}ms)`;
    }
  });
}

/**
 * 6. Real-Time Communication Message Log Console
 */
function setupMessageLogConsole(state) {
  const consoleBody = document.getElementById('commLogTableBody');
  const filterBtns = document.querySelectorAll('.log-filter-btn');
  let currentFilter = 'ALL';

  function renderLogs() {
    if (!consoleBody) return;
    const filtered = currentFilter === 'ALL' 
      ? state.logs 
      : state.logs.filter(l => l.type === currentFilter);

    consoleBody.innerHTML = filtered.map(l => `
      <tr class="log-row log-${l.type.toLowerCase()}">
        <td class="log-time">${l.time}</td>
        <td class="log-sender"><strong>${l.sender}</strong></td>
        <td class="log-arrow">→</td>
        <td class="log-receiver"><strong>${l.receiver}</strong></td>
        <td class="log-msg">${l.message}</td>
        <td class="log-hop"><span class="badge-hop">Hop ${l.hops}</span></td>
        <td class="log-rssi">${l.rssi}</td>
      </tr>
    `).join('');
  }

  state.on('logAdded', () => renderLogs());

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderLogs();
    });
  });

  const clearBtn = document.getElementById('btnClearLogs');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.logs = [];
      renderLogs();
    });
  }
}

/**
 * 7. Offline Demo Mode Switch
 */
function setupOfflineModeToggle(state) {
  const toggleBtn = document.getElementById('offlineModeSwitch');
  const statusBadge = document.getElementById('offlineModeGlobalStatus');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      state.isOfflineMode = !state.isOfflineMode;
      toggleBtn.classList.toggle('active', state.isOfflineMode);
      
      if (statusBadge) {
        statusBadge.innerHTML = state.isOfflineMode
          ? '🟢 OFFLINE DEMO MODE: Internet: DISCONNECTED | V2V SIMULATION: ACTIVE'
          : '🟡 ONLINE MODE: External APIs Available | V2V P2P: ACTIVE';
        statusBadge.className = state.isOfflineMode ? 'badge-offline-on' : 'badge-offline-off';
      }

      showToast(state.isOfflineMode 
        ? 'Offline Mode Active: 100% peer-to-peer ad-hoc operation.' 
        : 'Online Mode toggled.');
    });
  }
}

/**
 * 8. Web Audio Synthesizer Toggle
 */
function setupAudioToggle(audio) {
  const audioBtn = document.getElementById('btnAudioToggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      audioBtn.innerHTML = isMuted 
        ? '<span>🔇</span> Audio: Muted' 
        : '<span>🔊</span> Audio: Active';
      audioBtn.classList.toggle('btn-audio-muted', isMuted);
    });
  }
}

/**
 * 9. Animated Road Preview Banner on Landing Page
 */
function setupLandingRoadBanner() {
  const canvas = document.getElementById('landingHeroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
    canvas.height = 140;
  }
  resize();
  window.addEventListener('resize', resize);

  let offset = 0;
  function animate() {
    offset = (offset + 1.2) % 40;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Dark road
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // White dashed road lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 16]);
    ctx.lineDashOffset = -offset;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3 Cars communicating
    const cars = [
      { x: w * 0.22, y: h / 2 - 18, color: '#00f0ff', id: 'V01' },
      { x: w * 0.52, y: h / 2 - 18, color: '#3b82f6', id: 'V02' },
      { x: w * 0.82, y: h / 2 - 18, color: '#10b981', id: 'V03' }
    ];

    // Draw radio beams between cars
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cars[0].x, cars[0].y + 9);
    ctx.lineTo(cars[1].x, cars[1].y + 9);
    ctx.lineTo(cars[2].x, cars[2].y + 9);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving signal packet
    const t = (Date.now() % 1600) / 1600;
    const pktX = cars[0].x + (cars[2].x - cars[0].x) * t;
    ctx.beginPath();
    ctx.arc(pktX, h / 2 - 9, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw cars
    cars.forEach(c => {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - 22, c.y, 44, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Orbitron, sans-serif';
      ctx.fillText(c.id, c.x - 10, c.y + 12);

      // Signal wave
      const pulseR = ((Date.now() / 8) % 30);
      ctx.beginPath();
      ctx.arc(c.x, c.y + 9, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${1 - pulseR / 30})`;
      ctx.stroke();
    });

    requestAnimationFrame(animate);
  }
  animate();
}

/**
 * Toast Notification Utility
 */
function showToast(msg) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'v2v-toast';
  toast.innerHTML = `<span class="toast-dot"></span> <span>${msg}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}
