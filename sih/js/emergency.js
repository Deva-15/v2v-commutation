/**
 * V2V Rescue Link - Emergency & Disaster Detection Engine
 * Coordinates emergency triggers, sudden braking, forward collision prediction,
 * and 8 specific environmental disaster scenarios.
 */

class EmergencyEngine {
  constructor(state, audio, multiHop) {
    this.state = state;
    this.audio = audio;
    this.multiHop = multiHop;
    
    // Disaster Catalog with detailed scenario parameters
    this.disasterCatalog = {
      flood: {
        title: 'FLASH FLOOD ON ROADWAY',
        icon: '🌊',
        severity: 'HIGH',
        distanceMeters: 450,
        description: 'Water accumulation exceeding 40cm reported across all lanes at Mile 14. Severe hydroplaning hazard.',
        speedLimitSuggestion: 20,
        recommendDetour: true,
        altRoute: 'Mountain Ridge Bypass 4B'
      },
      landslide: {
        title: 'LANDSLIDE / ROCKFALL DEBRIS',
        icon: '⛰️',
        severity: 'CRITICAL',
        distanceMeters: 520,
        description: 'Boulders and mud debris covering eastern carriageway. Road completely impassable.',
        speedLimitSuggestion: 0,
        recommendDetour: true,
        altRoute: 'West Valley Detour Route 2'
      },
      earthquake: {
        title: 'EARTHQUAKE STRUCTURAL DAMAGE',
        icon: '⚡',
        severity: 'CRITICAL',
        distanceMeters: 600,
        description: 'Seismic activity detected; overpass fissure detected at Marker KM-82. Highway closed.',
        speedLimitSuggestion: 0,
        recommendDetour: true,
        altRoute: 'Valley Service Road B'
      },
      road_block: {
        title: 'FULL ROAD BLOCKAGE',
        icon: '🚧',
        severity: 'HIGH',
        distanceMeters: 380,
        description: 'Construction barrier breach and overturned flatbed blocking lane 1 & 2.',
        speedLimitSuggestion: 15,
        recommendDetour: true,
        altRoute: 'Old Highway 9 Express Link'
      },
      fallen_tree: {
        title: 'FALLEN TREE OBSTRUCTION',
        icon: '🌲',
        severity: 'MODERATE',
        distanceMeters: 300,
        description: 'Large pine tree downed across right lane due to high winds. Single lane squeeze.',
        speedLimitSuggestion: 35,
        recommendDetour: false,
        altRoute: null
      },
      major_accident: {
        title: 'MAJOR MULTI-VEHICLE ACCIDENT',
        icon: '💥',
        severity: 'CRITICAL',
        distanceMeters: 480,
        description: '3-vehicle pileup with fuel leak. Emergency services summoned via ad-hoc beacon.',
        speedLimitSuggestion: 0,
        recommendDetour: true,
        altRoute: 'Outer Ring Bypass Exit 12'
      },
      fire: {
        title: 'WILDFIRE / HEAVY SMOKE HAZARD',
        icon: '🔥',
        severity: 'HIGH',
        distanceMeters: 550,
        description: 'Zero visibility due to dense smoke plume and burning foliage along embankment.',
        speedLimitSuggestion: 25,
        recommendDetour: true,
        altRoute: 'Windward Foothills Highway'
      },
      black_ice: {
        title: 'DANGEROUS ROAD CONDITIONS (BLACK ICE)',
        icon: '❄️',
        severity: 'HIGH',
        distanceMeters: 250,
        description: 'Invisible surface ice layer detected by traction control sensor. Friction coefficient < 0.15.',
        speedLimitSuggestion: 30,
        recommendDetour: false,
        altRoute: null
      }
    };
  }

  /**
   * Trigger Sudden Emergency Braking (EEBL - Electronic Emergency Brake Light)
   */
  triggerEmergencyBraking(vehicleId = 'V01') {
    const vehicle = this.state.getVehicleById(vehicleId);
    if (!vehicle) return;

    vehicle.brakeLight = true;
    vehicle.targetSpeed = 10;
    vehicle.speed = 15;
    vehicle.status = 'EMERGENCY';

    if (this.audio) {
      this.audio.playBrakingScreech();
    }

    const payload = `⚠️ EMERGENCY BRAKING: Vehicle ${vehicleId} decelerated sharply (-8.4 m/s²). Trailing distance buffer collapsing!`;
    
    this.state.addLog({
      sender: vehicleId,
      receiver: 'NEARBY_VEHICLES [BLE/Wi-Fi]',
      message: payload,
      type: 'WARNING',
      hops: 0,
      protocol: 'BLE 5.4 Low Latency (<3ms)'
    });

    // Alert immediate neighbors
    this.state.vehicles.forEach(v => {
      if (v.id !== vehicleId) {
        v.status = 'WARNING';
        v.targetSpeed = Math.max(25, v.speed - 25);
      }
    });

    this.state.emit('emergencyBrakingTriggered', {
      vehicleId,
      deceleration: '-8.4 m/s²',
      reactionTimeGained: '1.4 seconds'
    });

    // Propagate via multi-hop
    this.multiHop.broadcastEmergency(vehicleId, 'EMERGENCY_BRAKING', payload);

    // Restore brake light after 4 seconds
    setTimeout(() => {
      vehicle.brakeLight = false;
      vehicle.targetSpeed = 68;
    }, 4000);
  }

  /**
   * Trigger Disaster Scenario
   */
  triggerDisaster(disasterKey) {
    const disaster = this.disasterCatalog[disasterKey];
    if (!disaster) return;

    // Place hazard on road canvas ahead of user vehicle
    const userVehicle = this.state.getUserVehicle();
    const hazardX = userVehicle ? Math.min(1050, userVehicle.x + 380) : 750;
    const hazardY = 190; // center lane

    const hazardObj = {
      id: 'hazard_' + Date.now(),
      type: disasterKey,
      x: hazardX,
      y: hazardY,
      title: disaster.title,
      icon: disaster.icon,
      severity: disaster.severity,
      distanceMeters: disaster.distanceMeters,
      description: disaster.description,
      active: true
    };

    this.state.hazards = [hazardObj];

    // Trigger visual route detour advice if applicable
    if (disaster.recommendDetour) {
      this.state.routeAdvice.hazardDetected = true;
      this.state.routeAdvice.hazardType = disaster.title;
      this.state.routeAdvice.alternateRoad = disaster.altRoute;
      this.state.routeAdvice.suggested = true;
      this.state.emit('routeRecalculated', this.state.routeAdvice);
    }

    this.state.addLog({
      sender: 'V01_SENSORS',
      receiver: 'BROADCAST [V2V MESH]',
      message: `DISASTER DETECTED: ${disaster.title} (${disaster.distanceMeters}m ahead). ${disaster.description}`,
      type: 'EMERGENCY',
      hops: 0
    });

    this.state.emit('disasterDetected', hazardObj);

    // Automatically generate emergency warning message & show nearby vehicles receiving it
    this.multiHop.broadcastEmergency(
      this.state.myVehicleId, 
      `DISASTER_${disasterKey.toUpperCase()}`,
      `⚠️ DISASTER DETECTED: ${disaster.title} ${disaster.distanceMeters}m ahead! Decelerate immediately & divert.`
    );
  }

  /**
   * Trigger Manual Emergency (Accident, Medical, Breakdown, Fire, Hazard)
   */
  triggerEmergency(type, vehicleId = 'V01') {
    const titles = {
      accident: 'Vehicle Collision & Airbag Deploy',
      breakdown: 'Severe Mechanical Breakdown / Wheel Failure',
      medical: 'Medical Emergency - SOS Driver Incapacitation',
      fire: 'Vehicle Thermal Runaway / Underhood Fire',
      hazard: 'Unidentified Dangerous Debris on Roadway'
    };

    const targetVehicle = this.state.getVehicleById(vehicleId) || this.state.getUserVehicle();
    targetVehicle.status = 'EMERGENCY';
    targetVehicle.emergencyType = type;

    const title = titles[type] || type.toUpperCase();
    const payload = `🚨 EMERGENCY ALERT: Vehicle ${targetVehicle.id} reports ${title}. Immediate safe perimeter advised.`;

    this.state.emit('emergencyAlert', {
      type: type,
      vehicleId: targetVehicle.id,
      title: title,
      payload: payload
    });

    this.multiHop.broadcastEmergency(targetVehicle.id, type.toUpperCase(), payload);
  }

  /**
   * Proximity & Forward Collision Warning (FCW) Evaluation Loop
   */
  evaluateCollisions() {
    const user = this.state.getUserVehicle();
    if (!user) return;

    let closestVehicle = null;
    let minDistance = Infinity;

    this.state.vehicles.forEach(other => {
      if (other.id === user.id) return;
      
      const dx = other.x - user.x;
      const dy = other.y - user.y;
      const distPixels = Math.sqrt(dx * dx + dy * dy);
      const distMeters = Math.round(distPixels * 0.75);

      // Only check vehicles ahead or near
      if (distMeters < minDistance) {
        minDistance = distMeters;
        closestVehicle = other;
      }
    });

    if (closestVehicle) {
      const relSpeedKmh = Math.abs(user.speed - closestVehicle.speed);
      const ttc = minDistance > 0 && relSpeedKmh > 0 
        ? ((minDistance) / (relSpeedKmh * (1000 / 3600))).toFixed(1)
        : 99;

      let risk = 'NONE';
      if (minDistance < 12 || (ttc < 2.0 && relSpeedKmh > 10)) {
        risk = 'CRITICAL';
      } else if (minDistance < 25 || (ttc < 3.5 && relSpeedKmh > 10)) {
        risk = 'HIGH';
      } else if (minDistance < 45) {
        risk = 'MODERATE';
      } else if (minDistance < 80) {
        risk = 'LOW';
      }

      const wasActive = this.state.collisionAlert.active;
      const isNowActive = (risk === 'HIGH' || risk === 'CRITICAL');

      this.state.collisionAlert = {
        active: isNowActive,
        targetVehicleId: closestVehicle.id,
        distance: minDistance,
        relativeSpeed: relSpeedKmh,
        direction: closestVehicle.x > user.x ? 'AHEAD' : 'REAR/SIDE',
        riskLevel: risk,
        ttcSeconds: ttc < 90 ? ttc : '>10'
      };

      if (isNowActive && !wasActive && this.audio) {
        this.audio.playCollisionWarning();
      }

      this.state.emit('collisionStatusChanged', this.state.collisionAlert);
    }
  }

  /**
   * Blind Spot Detection (BSW) Evaluation
   */
  evaluateBlindSpot() {
    const user = this.state.getUserVehicle();
    if (!user) return;

    let leftDetected = false;
    let rightDetected = false;
    let detectedId = null;
    let detectedDist = null;

    this.state.vehicles.forEach(other => {
      if (other.id === user.id) return;

      const dx = other.x - user.x; // + ahead, - behind
      const dy = other.y - user.y; // - above (lane 1), + below (lane 2/3)

      // Blind spot zone: laterally adjacent (+/- 50 to 110 px) and longitudinal offset (-60 to +30 px)
      if (dx >= -70 && dx <= 40) {
        if (dy < -30 && dy > -110) {
          leftDetected = true;
          detectedId = other.id;
          detectedDist = Math.round(Math.abs(dy) * 0.12 * 10) / 10;
        } else if (dy > 30 && dy < 110) {
          rightDetected = true;
          detectedId = other.id;
          detectedDist = Math.round(Math.abs(dy) * 0.12 * 10) / 10;
        }
      }
    });

    const changed = (this.state.blindSpot.leftDetected !== leftDetected || 
                     this.state.blindSpot.rightDetected !== rightDetected);

    this.state.blindSpot = {
      leftDetected,
      rightDetected,
      nearVehicleId: detectedId,
      distanceMeters: detectedDist
    };

    if (changed) {
      this.state.emit('blindSpotChanged', this.state.blindSpot);
    }
  }
}

window.EmergencyEngine = EmergencyEngine;
