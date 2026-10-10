# VoiceGuard Frontend Demo

This is a basic responsive and interactive frontend for the VoiceGuard application - a real-time deepfake audio detector for phone calls.

## Features Implemented

### UI Components
- **Call Interface**: Realistic call screen with caller info, timer, and controls
- **VoiceGuard Alert System**: Non-disruptive overlay that appears when synthetic voice is detected
- **Audio Visualizer**: Animated waveform showing audio activity
- **Responsive Design**: Works on mobile and desktop screens
- **Dark/Light Mode Support**: Adapts to system preferences

### Interactive Elements
- **Call Timer**: Tracks call duration in real-time
- **End Call Button**: Terminates the call
- **Flag Number Button**: Reports suspicious numbers to community database
- **Settings Button**: Opens configuration options (mock implementation)
- **Alert Actions**: Options to end call or flag number from alert screen

### Simulation Features
- **Mock Deepfake Detection**: Randomly simulates detection events (10% chance every 3-7 seconds)
- **Vibration Feedback**: Uses Vibration API when available
- **Status Updates**: Visual indicators for monitoring vs. detection states
- **Auto-hiding Alerts**: Alerts disappear after 8 seconds if not acted upon

## How It Relates to VoiceGuard Concept

This frontend demonstrates the user interface aspects of VoiceGuard as described in the concept:

1. **Real-time Processing**: The mock detection runs periodically to simulate real-time analysis
2. **On-device Operation**: All simulation runs in the browser (would interface with actual TensorFlow.js model in production)
3. **Privacy-preserving**: No data leaves the device/client in this implementation
4. **Subtle Alerting**: Uses non-intrusive overlay with haptic feedback
5. **User Control**: Provides clear options to respond to detected threats
6. **Accessibility**: Includes ARIA labels and semantic HTML

## Files Created
- `index.html`: Main structure and content
- `style.css`: Responsive styling with dark mode support
- `script.js`: Interactive logic and simulation
- `README.md`: This file

## To View
Open `index.html` in any modern browser. For mobile testing, use device emulation in browser dev tools or host on a local server.

## Production Considerations
In a real VoiceGuard implementation:
1. The mock detection would be replaced with a TensorFlow.js/WebAssembly model running in a WebWorker
2. Actual audio stream access would require getUserMedia or platform-specific APIs
3. The overlay would integrate with native call screens via browser extensions or mobile APIs
4. Vibration patterns would be customizable
5. Alert persistence and dismissal would follow platform guidelines
6. Analytics and reporting would be anonymized and opt-in