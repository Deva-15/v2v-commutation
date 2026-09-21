# V2V RESCUE LINK
### *Network-Independent Vehicle-to-Vehicle Communication & Emergency Warning System*

> **"Communicate. Warn. Rescue. Without Internet."**

[![Direct V2V](https://img.shields.io/badge/Direct%20V2V-Active-00f0ff.svg)](#)
[![Internet Required](https://img.shields.io/badge/Internet%20Required-NO%20%E2%9D%8C-10b981.svg)](#)
[![Multi-Hop Relay](https://img.shields.io/badge/Multi--Hop%20Relay-Supported-a855f7.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-100%25%20Offline%20Local%20P2P-38bdf8.svg)](#)

---

## 🎯 Project Overview

**V2V RESCUE LINK** is a smart-transportation safety platform engineered to exchange critical emergency and safety telemetry directly between nearby vehicles **WITHOUT depending on the internet, mobile data, cellular towers, Wi-Fi routers, or central cloud servers**.

In major disasters (earthquakes, flash floods, hurricanes, landslides, remote mountain passes, and highway tunnels), traditional cellular base stations collapse or lose power. By utilizing direct peer-to-peer wireless technologies (**Wi-Fi Direct**, **Wi-Fi Aware / NAN**, and **Bluetooth 5.4 Mesh / Coded PHY**), V2V Rescue Link ensures that life-saving emergency warnings propagate between vehicles with sub-15 millisecond latency.

---

## 🚀 Key Features

1. **Futuristic Landing & Overview**: High-tech automotive interface with animated highway traffic and wireless signal propagation waves.
2. **Live V2V Cockpit & Dashboard**: Real-time vehicle ID, speed gauge, compass heading, battery reserve, signal strength (RSSI), and peer vehicle cards.
3. **No Internet Required Panel**: Prominent verification banner demonstrating zero cellular or cloud dependency.
4. **Interactive Highway Simulation Canvas**: Real-time road physics with moving vehicles, communication radius circles, dynamic mesh link generation, and photon packet flow.
5. **Drag-and-Drop Testing**: Interactive canvas allowing users to drag vehicles closer or farther to test link establishment and out-of-range boundaries.
6. **Disaster Detection Catalog**: Simulated detection of 8 major disasters (Flash floods, Landslides, Earthquakes, Roadblocks, Fallen trees, Major pileups, Wildfires, Black ice).
7. **Emergency Alert System**: Direct triggers for accidents, sudden braking (EEBL), mechanical breakdowns, medical SOS, and vehicle fires.
8. **Multi-Hop Communication Relay**: Autonomous mesh forwarding (`V01 → V02 → V03 → V04`) enabling alerts to reach trailing vehicles far beyond direct single-hop radio range.
9. **Collision Prediction (FCW)**: Real-time calculation of Distance, Relative Speed, and Time-To-Collision (TTC) with audio-visual cockpit alarms.
10. **Emergency Braking Warning (EEBL)**: Instant deceleration broadcast giving trailing drivers up to 1.4 seconds of advance warning before physical brake lights are visible.
11. **360° Blind-Spot Radar (BSW)**: Proximity radar and left/right wing mirror indicators that illuminate when adjacent vehicles enter blind zones.
12. **Offline Alternate-Route Engine**: Decentralized detour recalculation that detects blocked corridors and suggests peer-verified alternate bypasses.
13. **Low-Power Operation Mode**: Energy-efficient adaptive beaconing algorithms (10% duty cycle / 90% micro-sleep) ensuring minimal draw on vehicle batteries.
14. **Phone-Off / Background Hardware Architecture**: Comprehensive architectural roadmap for dedicated automotive On-Board Units (OBUs) operating 24/7 on vehicle 12V power.
15. **Real-Time Packet Log Console**: Live streaming console displaying timestamps, sender/receiver, payload, hop counts, and RSSI signal levels.
16. **Unique Features Comparison Matrix**: Side-by-side comparison table proving advantages over Cellular (Google Maps/Waze) and Satellite SOS.
17. **One-Click Guided Demo Scenario**: Scripted 6-stage presentation scenario built for hackathon judges and evaluators.

---

## 🔬 Technology & Physical Hardware Architecture

### Software Prototype Stack
- **Core**: Vanilla HTML5, Vanilla JavaScript (ES6+ modular object-oriented architecture)
- **Styling**: Vanilla CSS3 (Custom Glassmorphism Design System, CSS Variables, Responsive Grid/Flexbox)
- **Simulation**: HTML5 Canvas 2D Kinematics and RF Vector Engine
- **Audio Synthesizer**: Native Web Audio API (zero external sound file dependencies)

### Physical Vehicle On-Board Unit (OBU) Hardware BOM
- **Microcontroller**: ESP32-S3 Dual-Core Xtensa 240MHz (2.4GHz Wi-Fi 802.11 b/g/n + BLE 5.0 Mesh / Coded PHY)
- **Positioning**: u-blox NEO-8M GNSS Module (10Hz concurrent GPS/GLONASS/Galileo)
- **Inertial Sensor**: MPU-6050 6-Axis Accelerometer & Gyroscope (impact and rollover detection)
- **Vehicle Bus**: MCP2515 SPI-to-CAN Bus Controller (reading OBD-II wheel speeds and ABS triggers)
- **Audio/Visual Alert**: Piezo Buzzer (85dB) + 1.3" I2C OLED Driver Display
- **Power**: 12V-to-5V Automotive Buck Converter with Load Dump Protection

---

## 🏃 How to Run the Application Locally

The application is 100% self-contained with **zero npm or backend build dependencies**.

### Option 1: Python Built-in Server
```bash
# In the project root directory (c:\Users\ashri\sih)
python -m http.server 8080
```
Open your browser and navigate to: `http://localhost:8080`

### Option 2: Node.js / NPX Serve
```bash
npx -y serve .
```

### Option 3: Direct File Opening
You can double-click or open `index.html` directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.

---

## 🏆 Hackathon Demonstration Script (For Judges)

1. Open the website and observe the **"NO INTERNET REQUIRED"** status banner and animated road traffic.
2. Click **"Run Demo Scenario"** in the top header or landing hero.
3. Watch the automated sequence:
   - **Stage 1**: Vehicles V01-V04 cruising in normal formation.
   - **Stage 2**: A major multi-vehicle accident is detected 480m ahead of V01.
   - **Stage 3**: V01 generates and cryptographically signs an emergency alert payload.
   - **Stage 4**: Multi-hop relay fires: V01 sends directly to V02, which repeats to V03, which repeats to V04 (which was out of direct range of V01).
   - **Stage 5**: The offline detour engine calculates that NH-48 is blocked and activates the West Mountain Bypass.
   - **Stage 6**: Celebratory milestone banner verifies: *"Emergency information successfully propagated through nearby vehicles without internet."*
4. Explore the **V2V Simulation Lab** tab: drag vehicles around to observe real-time dynamic RF range halo boundaries and connection states.
5. Trigger **Emergency Braking** or any **Disaster** from the respective tabs to hear the Web Audio synthesizer and see the cockpit telemetry react instantly.
