# Live HR Mobile Integration - Planning Document

## Overview

This document outlines the approaches for connecting heart rate monitors to the Live HR Watcher system when building the mobile app. The goal is to enable real-time HR monitoring for groups of athletes during training sessions.

### Current Architecture

The existing web-based system uses a push model:
- Athletes push HR readings via `POST /api/athlete/live-hr/push`
- Coach dashboard receives real-time updates via SSE stream
- Sessions are managed per coach with participant tracking

The mobile app needs to bridge the gap between HR hardware and this API.

---

## Connection Approaches

### Approach A: Each Athlete's Phone → Their Belt

Each athlete installs the mobile app, pairs their own HR belt, and the app pushes data to the server.

```
Athlete 1: [HR Belt] ←BLE→ [Their Phone] ←Internet→ [Server] → Coach Dashboard
Athlete 2: [HR Belt] ←BLE→ [Their Phone] ←Internet→ [Server] → Coach Dashboard
```

**Technical Requirements:**
- Mobile app (React Native or Flutter)
- BLE Heart Rate Profile implementation
- Background mode for continuous HR streaming
- Push notifications to alert athletes when session starts

**Libraries:**
- React Native: `react-native-ble-plx`
- Flutter: `flutter_blue_plus`

**Pros:**
- Unlimited number of athletes
- Works anywhere (no distance limitation)
- Athletes can be spread out (on ice, outdoor runs, etc.)
- No additional hardware cost

**Cons:**
- Every athlete needs smartphone with app installed
- Athletes must remember to bring phone and have it charged
- App must run in background during training
- Initial setup friction (install app, pair device)

**Best For:**
- Remote athletes
- Outdoor training where athletes spread out
- Situations where athletes already track via phone

---

### Approach B: All Belts → Coach's Single Phone

The coach's phone connects directly to all HR belts in proximity.

```
[HR Belt 1] ←┐
[HR Belt 2] ←┼─BLE→ [Coach's Phone] → Server → Coach Dashboard
[HR Belt 3] ←┘
```

**Technical Requirements:**
- Mobile app with multi-device BLE connections
- Device identification (mapping belt to athlete)
- Robust connection management (reconnect on drops)

**Limitations:**
- **Connection limit:** ~7-10 simultaneous BLE connections per phone
- **Range:** ~10-30 meters (varies by environment)
- **Interference:** Many BLE devices in proximity can cause issues

**Pros:**
- Athletes only need their HR belt
- No app installation for athletes
- Simple for small groups

**Cons:**
- Hard limit on group size (~10 athletes max)
- All athletes must stay within Bluetooth range
- Connection stability issues with many devices
- Coach phone battery drain

**Best For:**
- Small groups (<10 athletes)
- Indoor training in single room
- Situations where athletes don't have smartphones

---

### Approach C: Dedicated HR Gateway/Receiver

A hardware device designed for multi-athlete HR capture, relaying data to the server.

```
[20+ HR Belts] ──ANT+/BLE──→ [Gateway Device] ──WiFi/4G──→ [Server] → Coach Dashboard
```

**Hardware Options:**

| Device | Capacity | Protocol | Price Range | Notes |
|--------|----------|----------|-------------|-------|
| **Polar Team Pro** | 40+ athletes | Proprietary | $$$$ | Full team solution with sensors included |
| **Garmin ANT+ Stick** | 10-20 | ANT+ | $ | Requires laptop, ANT+ belts only |
| **NPE CABLE** | 4 devices | ANT+/BLE→BLE | $$ | Bridge device, limited capacity |
| **Wahoo KICKR** | N/A | ANT+/BLE | N/A | Not applicable, bike trainer only |
| **Custom Raspberry Pi** | 7-10 BLE | BLE | $ | DIY, same BLE limits as phone |
| **Specialized Gateways** | 20-50+ | ANT+ | $$-$$$ | Devices like Viiiiva, North Pole Engineering |

**ANT+ vs BLE:**
- **ANT+**: Better for multi-device (broadcast model), many sports HR straps support it
- **BLE**: Connection-based, limited simultaneous connections per receiver

**Recommended Hardware for Large Groups:**

1. **Polar Team Pro System**
   - Purpose-built for team sports
   - Includes HR sensors, charging dock, iPad app
   - Handles 40+ athletes
   - Has its own analytics (would need integration)
   - High cost but complete solution

2. **ANT+ USB Receiver + Laptop**
   - Use ANT+ USB stick (Garmin, Dynastream)
   - Software captures all ANT+ HR broadcasts in range
   - Requires athletes use ANT+ compatible belts
   - Lower cost, more DIY
   - Would need custom software to relay to your API

3. **Multiple ANT+ Receivers**
   - Spread receivers around venue
   - Each captures nearby athletes
   - Central software aggregates

**Pros:**
- Handles large groups (20-50+ athletes)
- Athletes only need their belt (with correct protocol)
- Better range than phone BLE
- Dedicated hardware = more reliable
- No app needed for athletes

**Cons:**
- Hardware purchase cost
- Need to bring equipment to training
- Setup time at venue
- May require athletes to use specific belt brand/protocol
- Integration work with gateway's output format

**Best For:**
- Team sports (hockey, football, cycling teams)
- Regular training at same venue
- Organizations willing to invest in hardware
- Groups of 10-50 athletes

---

## Scenario Recommendations

| Scenario | Recommended | Reason |
|----------|-------------|--------|
| 25 hockey players on bikes | **C** (Gateway) | Too many for BLE, contained environment |
| Hockey players on ice | **C** (Gateway) or **A** (if phones feasible) | Spread out but within rink, gateway with good placement works |
| CrossFit WOD (large class) | **C** (Gateway) | High density, single room |
| Small group <10 | **B** (Coach phone) | Simple, no extra hardware |
| Mixed scenarios | **A** (Athlete phones) | Most flexible |
| Remote/distributed athletes | **A** (Athlete phones) | Only option that works remotely |

---

## Implementation Phases

### Phase 1: Athlete App with BLE (Approach A)

Implement basic BLE HR connection in mobile app:

1. BLE scanning for Heart Rate Service (UUID: `0x180D`)
2. Connect and subscribe to HR Measurement (UUID: `0x2A37`)
3. Push readings to existing `/api/athlete/live-hr/push` endpoint
4. Handle background mode and reconnection
5. Session join flow (scan QR code or enter code)

**Estimated Effort:** Core mobile app feature

**Files to Modify:**
- New: Mobile app BLE service
- Existing: May need WebSocket upgrade for lower latency (current SSE works but WebSocket better for mobile)

### Phase 2: Coach Multi-Connect (Approach B)

Add multi-device connection to coach's mobile app:

1. Scan and list all nearby HR devices
2. Let coach assign devices to athletes
3. Maintain multiple simultaneous connections
4. Push all readings to server

**Estimated Effort:** Additional mobile feature

**Consideration:** Could be same app with "coach mode" toggle

### Phase 3: Gateway Integration (Approach C)

Integrate with dedicated hardware:

1. Research and select gateway hardware
2. Build integration layer (gateway → your API)
3. Device-to-athlete mapping UI
4. Possibly run relay software on laptop at venue

**Estimated Effort:** Hardware selection + custom integration

**Options:**
- If Polar Team Pro: Integrate with Polar's API
- If ANT+ receiver: Build custom relay software
- If custom gateway: Define protocol and build receiver

---

## Technical Notes

### Bluetooth Heart Rate Profile

Standard UUIDs (works with most HR monitors):
```
Heart Rate Service:        0x180D
Heart Rate Measurement:    0x2A37  (notify)
Body Sensor Location:      0x2A38  (read)
Heart Rate Control Point:  0x2A39  (write)
```

HR Measurement format (first byte is flags):
- Bit 0: HR value format (0 = UINT8, 1 = UINT16)
- Bit 1-2: Sensor contact status
- Bit 3: Energy expended present
- Bit 4: RR-Interval present

### Compatible HR Monitors (BLE Heart Rate Profile)

Most sports HR straps work with standard BLE:
- Polar H10, H9, OH1
- Garmin HRM-Pro, HRM-Dual
- Wahoo TICKR, TICKR X
- Suunto Smart Belt
- Generic chest straps

**Note:** Some devices are locked:
- Apple Watch (only broadcasts to Apple apps)
- Some Fitbit models
- Whoop (proprietary)

### ANT+ Heart Rate Profile

Device Profile: Heart Rate Monitor (0x78)
- Broadcast model (one-to-many)
- Better for multi-device capture
- Many sports HR straps support both ANT+ and BLE

---

## Open Questions

1. **Primary use case priority?** Which scenario is most common/important?
2. **Budget for hardware?** Gateway solutions range from $100 to $5000+
3. **Athlete smartphone availability?** Do most athletes have phones at training?
4. **Venue WiFi reliability?** Gateway needs connectivity to push data
5. **Existing HR belts?** What brands/models do athletes currently use?

---

## Next Steps

1. Decide primary approach based on most common scenario
2. If Approach C: Research and test gateway hardware options
3. If Approach A/B: Include BLE HR in mobile app requirements
4. Consider hybrid: App for flexibility + gateway for large team sessions

---

*Document created: January 2026*
*For: Mobile app development planning*
