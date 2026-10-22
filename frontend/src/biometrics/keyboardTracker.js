/**
 * Privacy-Preserving Keystroke Dynamics Tracker
 * 
 * ZERO-CONTENT PRIVACY GUARANTEE:
 * This tracker NEVER accesses, reads, or records event.key, typed characters,
 * passwords, or sensitive input contents.
 * Only anonymous hardware timestamps (performance.now()) are captured.
 */

export class KeyboardTracker {
  constructor() {
    this.activeDownTimes = new Map(); // code -> timestamp
    this.holdTimes = [];              // Key hold durations (ms)
    this.flightTimes = [];            // Inter-key latency (ms)
    this.downToDownTimes = [];        // Digraph interval between keydowns (ms)
    
    this.lastKeyDownTime = null;
    this.lastKeyUpTime = null;
    this.keyPressCount = 0;
    this.overlapCount = 0;
    this.windowStartTime = performance.now();
    
    // Fallback baseline cache initialized to neutral human defaults
    this.lastValidMetrics = {
      mean_hold_time: 95.0,
      std_hold_time: 15.0,
      mean_flight_time: 140.0,
      std_flight_time: 30.0,
      typing_speed_cpm: 280.0,
      pause_ratio: 0.12,
      keystroke_overlap_ratio: 0.35,
      flight_time_cv: 0.22,
      sample_count: 0
    };
  }

  handleKeyDown = (event) => {
    const now = performance.now();
    // Use anonymized key code mapping (e.g. "KeyA", "Space") strictly for paired up/down correlation
    const code = event.code || 'KeyAnon';

    // 1. Detect keystroke overlap (roll-typing):
    // If another key is already held down when this keydown triggers
    if (this.activeDownTimes.size > 0) {
      this.overlapCount++;
    }

    // 2. Measure Down-to-Down interval (Di-graph transition latency)
    if (this.lastKeyDownTime !== null) {
      const d2d = now - this.lastKeyDownTime;
      if (d2d >= 15 && d2d <= 4000) {
        this.downToDownTimes.push(d2d);
      }
    }
    this.lastKeyDownTime = now;

    // 3. Measure Up-to-Down interval (Flight time)
    if (this.lastKeyUpTime !== null) {
      const flight = now - this.lastKeyUpTime;
      // Allow realistic flight transitions (10ms to 3000ms)
      if (flight >= 10 && flight <= 4000) {
        this.flightTimes.push(flight);
      }
    }

    this.activeDownTimes.set(code, now);
    this.keyPressCount++;
  };

  handleKeyUp = (event) => {
    const now = performance.now();
    const code = event.code || 'KeyAnon';

    if (this.activeDownTimes.has(code)) {
      const downTime = this.activeDownTimes.get(code);
      this.activeDownTimes.delete(code);

      const hold = now - downTime;
      if (hold >= 10 && hold <= 2000) {
        this.holdTimes.push(hold);
      }
    } else {
      // Fallback if keydown wasn't caught
      const firstKey = this.activeDownTimes.keys().next().value;
      if (firstKey) {
        const downTime = this.activeDownTimes.get(firstKey);
        this.activeDownTimes.delete(firstKey);
        const hold = now - downTime;
        if (hold >= 10 && hold <= 2000) {
          this.holdTimes.push(hold);
        }
      }
    }

    this.lastKeyUpTime = now;
  };

  getMetricsAndReset() {
    const now = performance.now();
    const durationSeconds = Math.max(0.5, (now - this.windowStartTime) / 1000);

    const holds = this.holdTimes.slice();
    const flights = this.flightTimes.slice();
    const d2d = this.downToDownTimes.slice();
    const totalCount = this.keyPressCount;
    const overlaps = this.overlapCount;

    // Reset buffer for next window
    this.holdTimes = [];
    this.flightTimes = [];
    this.downToDownTimes = [];
    this.keyPressCount = 0;
    this.overlapCount = 0;
    this.windowStartTime = now;
    this.activeDownTimes.clear();

    const hasSufficientData = totalCount >= 3;

    if (!hasSufficientData) {
      // Window had insufficient keystrokes: return cached metrics with 0 active sample count
      return {
        ...this.lastValidMetrics,
        sample_count: 0,
        hasSufficientData: false
      };
    }

    // Calculations based on real observed keystrokes
    const meanHold = holds.length
      ? holds.reduce((a, b) => a + b, 0) / holds.length
      : this.lastValidMetrics.mean_hold_time;

    const stdHold = holds.length > 1
      ? Math.sqrt(holds.reduce((acc, val) => acc + Math.pow(val - meanHold, 2), 0) / holds.length)
      : Math.max(8.0, meanHold * 0.18);

    // Primary flight metric blends Flight and Down-to-Down for robust di-graph timing
    const effectiveFlights = flights.length ? flights : (d2d.length ? d2d : [140.0]);
    const meanFlight = effectiveFlights.reduce((a, b) => a + b, 0) / effectiveFlights.length;

    const stdFlight = effectiveFlights.length > 1
      ? Math.sqrt(effectiveFlights.reduce((acc, val) => acc + Math.pow(val - meanFlight, 2), 0) / effectiveFlights.length)
      : Math.max(12.0, meanFlight * 0.22);

    const flightTimeCv = meanFlight > 0 ? stdFlight / meanFlight : 0.22;
    const typingSpeedCpm = (totalCount / durationSeconds) * 60;
    const overlapRatio = totalCount > 1 ? Math.min(1.0, overlaps / (totalCount - 1)) : 0.0;

    // Cognitive Pause Ratio (> 400ms)
    const longPauses = effectiveFlights.filter(f => f > 400).length;
    const pauseRatio = effectiveFlights.length ? Math.min(0.95, longPauses / effectiveFlights.length) : 0.12;

    const metrics = {
      mean_hold_time: Math.round(meanHold * 10) / 10,
      std_hold_time: Math.round(stdHold * 10) / 10,
      mean_flight_time: Math.round(meanFlight * 10) / 10,
      std_flight_time: Math.round(stdFlight * 10) / 10,
      typing_speed_cpm: Math.round(typingSpeedCpm * 10) / 10,
      pause_ratio: Math.round(pauseRatio * 100) / 100,
      keystroke_overlap_ratio: Math.round(overlapRatio * 100) / 100,
      flight_time_cv: Math.round(flightTimeCv * 1000) / 1000,
      sample_count: totalCount,
      hasSufficientData: true
    };

    this.lastValidMetrics = metrics;
    return metrics;
  }
}
