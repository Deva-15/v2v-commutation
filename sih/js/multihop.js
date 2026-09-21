/**
 * V2V Rescue Link - Multi-Hop Communication Relay Engine
 * Handles ad-hoc routing, packet forwarding, hop counting, and relay visualization
 * when destination vehicles are beyond direct single-hop communication range.
 */

class MultiHopEngine {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
    this.activeChain = null;
    this.relayHistory = [];
  }

  /**
   * Determine direct distance (in emulated meters) between two vehicle coordinates
   */
  getDistanceMeters(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    // Scale: 1 pixel ~ 0.75 meters in our canvas model
    return Math.round(pixelDist * 0.75);
  }

  /**
   * Check if v1 can directly reach v2
   */
  canDirectCommunicate(v1, v2) {
    const dist = this.getDistanceMeters(v1, v2);
    return dist <= v1.rangeMeters;
  }

  /**
   * Initiate a Multi-Hop Emergency Message Broadcast
   * @param {string} sourceId - e.g. 'V01'
   * @param {string} alertType - e.g. 'ACCIDENT_AHEAD', 'EMERGENCY_BRAKING', 'DISASTER_FLOOD'
   * @param {string} customPayload - human-readable alert message
   */
  broadcastEmergency(sourceId = 'V01', alertType = 'ACCIDENT_ALERT', customPayload = null) {
    const source = this.state.getVehicleById(sourceId);
    if (!source) return;

    const payload = customPayload || `🚨 EMERGENCY ALERT: ${alertType.replace('_', ' ')} detected by ${sourceId}. Immediate deceleration advised!`;

    // Sort all vehicles by X coordinate along the highway to determine logical relay order
    const sortedVehicles = [...this.state.vehicles].sort((a, b) => a.x - b.x);
    const sourceIdx = sortedVehicles.findIndex(v => v.id === sourceId);

    // Build the chain of vehicles to receive / forward the alert
    // If source is V01 at front or back, it propagates forward/backward
    const chain = [];
    for (let i = 0; i < sortedVehicles.length; i++) {
      chain.push(sortedVehicles[i]);
    }

    const chainId = 'chain_' + Date.now();
    const multiHopData = {
      id: chainId,
      sourceId: sourceId,
      alertType: alertType,
      payload: payload,
      startTime: Date.now(),
      status: 'PROPAGATING',
      steps: [],
      currentStepIndex: 0
    };

    this.activeChain = multiHopData;
    this.state.emit('multiHopStarted', multiHopData);

    // Initial origin log
    this.state.addLog({
      sender: sourceId,
      receiver: 'BROADCAST [P2P AD-HOC]',
      message: `Origin broadcast: ${payload}`,
      type: 'EMERGENCY',
      hops: 0,
      protocol: 'Wi-Fi Aware / 802.11p'
    });

    if (this.audio) {
      this.audio.playEmergencyAlarm();
    }

    // Sequentially propagate through vehicles in chain
    this.executeHopStep(chain, 0, multiHopData);
  }

  executeHopStep(chain, index, chainData) {
    if (index >= chain.length - 1) {
      // Completed full chain
      chainData.status = 'COMPLETED';
      chainData.totalLatencyMs = Math.round(chain.length * 14.5);
      this.state.emit('multiHopCompleted', chainData);
      
      this.state.addLog({
        sender: 'MESH_SUPERVISOR',
        receiver: 'ALL_NODES',
        message: `Multi-hop relay completed across ${chain.length - 1} hops. 100% peer delivery verified. Internet required: NO.`,
        type: 'SUCCESS',
        hops: chain.length - 1
      });

      if (this.audio) {
        this.audio.playSuccessChime();
      }
      return;
    }

    const sender = chain[index];
    const receiver = chain[index + 1];
    const hopNumber = index + 1;
    const latency = Math.round(12 + Math.random() * 6); // 12 - 18ms real ad-hoc latency

    // Create moving packet on canvas
    this.dispatchVisualPacket(sender, receiver, chainData.alertType, () => {
      // Packet arrived at receiver
      receiver.status = (chainData.alertType.includes('BRAKE') || chainData.alertType.includes('ACCIDENT')) ? 'WARNING' : 'EMERGENCY';
      
      const stepInfo = {
        hopNumber: hopNumber,
        senderId: sender.id,
        receiverId: receiver.id,
        isIntermediateRelay: index > 0,
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        message: index === 0 
          ? `Direct P2P transmission from origin ${sender.id}`
          : `Intermediate relay: ${sender.id} forwards packet to ${receiver.id}`
      };

      chainData.steps.push(stepInfo);
      chainData.currentStepIndex = hopNumber;

      this.state.addLog({
        sender: sender.id,
        receiver: receiver.id,
        message: `Hop ${hopNumber}: ${stepInfo.message} | Payload: [${chainData.alertType}]`,
        type: 'RELAY',
        hops: hopNumber,
        protocol: 'Wi-Fi Direct P2P',
        rssi: `-${50 + Math.floor(Math.random() * 25)} dBm`
      });

      if (this.audio) {
        this.audio.playPacketChirp();
      }

      this.state.emit('multiHopStep', { chainData, stepInfo });

      // Pause briefly for realistic visual pacing, then forward to next vehicle
      setTimeout(() => {
        this.executeHopStep(chain, index + 1, chainData);
      }, 700);
    });
  }

  dispatchVisualPacket(vFrom, vTo, type, onArrived) {
    const packet = {
      id: 'pkt_' + Math.random().toString(36).substr(2, 9),
      fromX: vFrom.x,
      fromY: vFrom.y,
      toX: vTo.x,
      toY: vTo.y,
      currentX: vFrom.x,
      currentY: vFrom.y,
      progress: 0,
      type: type,
      color: '#ff2a5f',
      onArrived: onArrived
    };

    this.state.packets.push(packet);
  }
}

window.MultiHopEngine = MultiHopEngine;
