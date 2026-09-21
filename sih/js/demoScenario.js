/**
 * V2V Rescue Link - Final Demonstration Scenario Engine
 * Orchestrates the complete 6-stage presentation scenario for hackathons and judges:
 * Normal Driving -> Accident Detected -> V01 Broadcast -> V02 Relay -> V03 Relay -> V04 Receives ->
 * Road Blocked -> Alternate Route Recommended -> 100% Offline Success!
 */

class DemoScenarioRunner {
  constructor(state, audio, emergency, multiHop, routeEngine) {
    this.state = state;
    this.audio = audio;
    this.emergency = emergency;
    this.multiHop = multiHop;
    this.route = routeEngine;

    this.currentStep = 0;
    this.isRunning = false;
    this.timer = null;
  }

  start() {
    this.isRunning = true;
    this.currentStep = 1;
    this.executeStep(1);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    this.hideDemoHUD();
  }

  executeStep(stepNum) {
    this.currentStep = stepNum;
    this.showDemoHUD(stepNum);

    switch(stepNum) {
      case 1:
        // Step 1: Normal Cruising
        this.state.resetSimulation();
        this.updateHUDText(
          'Stage 1: Nominal Highway Convoy',
          'Vehicles V01, V02, V03, and V04 are cruising on the highway at 72 km/h. Direct peer-to-peer radio beacons establish local mesh neighborhood. Internet required: NO.',
          'Next: Trigger Hazard Ahead'
        );
        this.timer = setTimeout(() => this.executeStep(2), 3500);
        break;

      case 2:
        // Step 2: Obstacle Appears Ahead of V01
        this.emergency.triggerDisaster('major_accident');
        this.updateHUDText(
          'Stage 2: Critical Incident Detected Ahead',
          'V01 optical & radar sensors detect a severe multi-vehicle accident & debris 480m ahead. Road completely blocked!',
          'Next: Initiate Direct V2V Broadcast'
        );
        this.timer = setTimeout(() => this.executeStep(3), 3200);
        break;

      case 3:
        // Step 3: V01 generates ACCIDENT DETECTED
        const v01 = this.state.getVehicleById('V01');
        if (v01) v01.status = 'EMERGENCY';
        this.updateHUDText(
          'Stage 3: V01 Generates Emergency Alert',
          'V01 signs local cryptographic safety payload: "🚨 ACCIDENT DETECTED". Transmits immediate peer-to-peer broadcast over Wi-Fi Aware NAN & BLE 5.4.',
          'Next: Multi-Hop Propagation'
        );
        this.timer = setTimeout(() => this.executeStep(4), 3000);
        break;

      case 4:
        // Step 4: Multi-hop propagation V01 -> V02 -> V03 -> V04
        this.multiHop.broadcastEmergency('V01', 'ACCIDENT_AHEAD', '🚨 ACCIDENT AHEAD: Road fully blocked at Mile 14. Decelerate immediately!');
        this.updateHUDText(
          'Stage 4: Multi-Hop Message Relay Active',
          'V01 reaches V02 directly. V04 is beyond V01 radio range! V02 and V03 autonomously act as repeaters: V01 → V02 → V03 → V04.',
          'Next: Alternate Route Recalculation'
        );
        this.timer = setTimeout(() => this.executeStep(5), 4500);
        break;

      case 5:
        // Step 5: Road blocked & Alternate Route available
        this.state.routeAdvice.hazardDetected = true;
        this.state.routeAdvice.hazardType = 'MAJOR ACCIDENT PILEUP';
        this.state.routeAdvice.suggested = true;
        this.state.emit('routeRecalculated', this.state.routeAdvice);
        
        this.updateHUDText(
          'Stage 5: Autonomous Detour Recalculation',
          'Decentralized OBU maps compute offline bypass: West Mountain Bypass Route B (+4 min ETA). Convoy avoids pileup zone!',
          'Next: Complete Demonstration'
        );
        this.timer = setTimeout(() => this.executeStep(6), 4000);
        break;

      case 6:
        // Step 6: Success Milestone & Big Summary Banner
        this.updateHUDText(
          'Stage 6: Demonstration Complete',
          '“Emergency information successfully propagated through nearby vehicles without internet, cell towers, or cloud servers!”',
          'Restart Scenario'
        );
        this.showFinalSuccessBanner();
        this.isRunning = false;
        break;
    }
  }

  showDemoHUD(step) {
    const hud = document.getElementById('demoScenarioModal');
    if (hud) hud.classList.remove('hidden');
    const stepCountEl = document.getElementById('demoStepCounter');
    if (stepCountEl) stepCountEl.textContent = `STEP ${step} OF 6`;
  }

  hideDemoHUD() {
    const hud = document.getElementById('demoScenarioModal');
    if (hud) hud.classList.add('hidden');
  }

  updateHUDText(title, desc, nextBtnText) {
    const titleEl = document.getElementById('demoStepTitle');
    const descEl = document.getElementById('demoStepDesc');
    const nextBtn = document.getElementById('demoNextStepBtn');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (nextBtn) nextBtn.textContent = nextBtnText;
  }

  showFinalSuccessBanner() {
    const banner = document.getElementById('demoFinalSuccessBanner');
    if (banner) {
      banner.classList.remove('hidden');
      if (this.audio) this.audio.playSuccessChime();
    }
  }

  next() {
    if (this.timer) clearTimeout(this.timer);
    if (this.currentStep < 6) {
      this.executeStep(this.currentStep + 1);
    } else {
      this.executeStep(1);
    }
  }
}

window.DemoScenarioRunner = DemoScenarioRunner;
