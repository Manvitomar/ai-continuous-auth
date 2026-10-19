/**
 * Privacy-Preserving Keyboard Telemetry Tracker
 * 
 * ZERO-CONTENT PRIVACY GUARANTEE:
 * This tracker NEVER accesses, reads, or records event.key, event.code, 
 * character values, or input form contents.
 * Only anonymous millisecond timestamps (performance.now()) are captured.
 */

export class KeyboardTracker {
  constructor() {
    this.activeDownTimes = new Map(); // Map of anonymous event id -> timestamp
    this.holdTimes = [];              // Array of hold durations (ms)
    this.flightTimes = [];            // Array of inter-key latency (ms)
    this.lastKeyUpTime = null;
    this.keyPressCount = 0;
    this.windowStartTime = performance.now();
    this.counter = 0;
  }

  handleKeyDown = (event) => {
    // Generate an anonymous identifier based strictly on monotonic sequence
    // DO NOT record event.key, event.code, or target value!
    const anonId = this.counter++;
    const now = performance.now();

    this.activeDownTimes.set(anonId, now);

    // Calculate flight time from previous keyup to this keydown
    if (this.lastKeyUpTime !== null) {
      const flight = now - this.lastKeyUpTime;
      // Filter out long idle gaps (> 5000ms)
      if (flight >= 10 && flight <= 5000) {
        this.flightTimes.push(flight);
      }
    }

    this.keyPressCount++;
  };

  handleKeyUp = () => {
    const now = performance.now();
    // Retrieve earliest unresolved keydown timestamp
    const firstKey = this.activeDownTimes.keys().next().value;
    if (firstKey !== undefined) {
      const downTime = this.activeDownTimes.get(firstKey);
      this.activeDownTimes.delete(firstKey);

      const hold = now - downTime;
      if (hold >= 5 && hold <= 2000) {
        this.holdTimes.push(hold);
      }
    }

    this.lastKeyUpTime = now;
  };

  getMetricsAndReset() {
    const now = performance.now();
    const durationSeconds = Math.max(0.5, (now - this.windowStartTime) / 1000);

    const holds = this.holdTimes.slice();
    const flights = this.flightTimes.slice();
    const totalCount = this.keyPressCount;

    // Reset buffer for next window
    this.holdTimes = [];
    this.flightTimes = [];
    this.keyPressCount = 0;
    this.windowStartTime = now;
    this.activeDownTimes.clear();

    // Calculations
    const meanHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 95.0;
    const stdHold = holds.length > 1
      ? Math.sqrt(holds.reduce((acc, val) => acc + Math.pow(val - meanHold, 2), 0) / holds.length)
      : 15.0;

    const meanFlight = flights.length ? flights.reduce((a, b) => a + b, 0) / flights.length : 140.0;
    const stdFlight = flights.length > 1
      ? Math.sqrt(flights.reduce((acc, val) => acc + Math.pow(val - meanFlight, 2), 0) / flights.length)
      : 30.0;

    const typingSpeedCpm = (totalCount / durationSeconds) * 60;

    // Ratio of pauses (> 400ms)
    const longPauses = flights.filter(f => f > 400).length;
    const pauseRatio = flights.length ? Math.min(0.95, longPauses / flights.length) : 0.12;

    return {
      mean_hold_time: Math.round(meanHold * 10) / 10,
      std_hold_time: Math.round(stdHold * 10) / 10,
      mean_flight_time: Math.round(meanFlight * 10) / 10,
      std_flight_time: Math.round(stdFlight * 10) / 10,
      typing_speed_cpm: Math.round(typingSpeedCpm * 10) / 10,
      pause_ratio: Math.round(pauseRatio * 100) / 100,
      sample_count: totalCount
    };
  }
}
