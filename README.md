# V2V-RESCUE-LINK 🚗🔗

### Intelligent Network-Independent Vehicle-to-Vehicle Safety Communication System

V2V-RESCUE-LINK is an AI-powered, network-independent Vehicle-to-Vehicle (V2V) safety communication system designed to enable vehicles to exchange critical safety and emergency information without relying on cellular networks, mobile data, Internet connectivity, or cloud servers.

The system uses **Bluetooth 5.4 Mesh and Wi-Fi Direct** concepts to support direct vehicle-to-vehicle communication and **multi-hop message relay**, allowing emergency alerts to travel from one vehicle to another beyond the direct communication range.

### 🚨 Key Features

* **Network-independent V2V communication** — works without Internet or cellular connectivity.
* **Multi-hop alert relay** — forwards emergency messages through nearby vehicles (V01 → V02 → V03 → V04).
* **Real-time hazard detection** — simulates accidents, sudden braking, floods, landslides, roadblocks, and other hazards.
* **Priority-based emergency alerts** — critical safety messages are given higher priority.
* **Offline safety assistance** — designed for tunnels, mountain regions, signal-blocked zones, and disaster situations.
* **Live vehicle monitoring** — displays vehicle ID, speed, RSSI, and nearby peer vehicles.
* **Real-time packet logging** — shows sender, receiver, timestamp, hop count, payload, and RSSI.
* **Highway simulation** — visualizes moving vehicles, communication ranges, and mesh connections.

### 🛠️ Technology Stack

* HTML5
* CSS3
* JavaScript (ES6+)
* HTML5 Canvas 2D
* Web Audio API
* Simulated Bluetooth Mesh / Wi-Fi Direct communication
* Multi-hop relay logic

### ⚙️ How It Works

1. A vehicle detects an accident, hazard, or emergency event.
2. An emergency alert packet is generated.
3. The alert is transmitted to nearby vehicles.
4. If the destination vehicle is outside the direct communication range, intermediate vehicles relay the message.
5. The system records the communication details in the live packet log.
6. The receiving vehicles display the warning through the simulated dashboard.

Example:

**V01 → V02 → V03 → V04**

This multi-hop approach allows an emergency message to travel beyond the range of a single vehicle-to-vehicle connection.

### 💻 Prototype

The current prototype is a **100% client-side browser simulation** with no backend, cloud server, or Internet dependency. It provides a simulated environment for testing V2V communication, vehicle movement, RF-range visualization, emergency alerts, and multi-hop message propagation.

### 🎯 Smart India Hackathon 2026

**Problem Statement ID:** 26203
**Theme:** Smart Vehicles
**Category:** Software
**Team:** Trend Trackers
**Project:** V2V-RESCUE-LINK

The project addresses the problem of improving vehicle communication and road safety by enabling vehicles to exchange emergency information even when conventional communication infrastructure is unavailable.

### 🔮 Future Scope

The communication logic is designed with a future transition toward **ESP32-class hardware**, allowing the software prototype to eventually be validated with physical wireless communication modules and vehicle units. Future development can include real-world RF testing, congestion handling, improved hazard detection, and pilot-fleet testing.
