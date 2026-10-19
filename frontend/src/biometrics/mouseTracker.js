/**
 * Privacy-Preserving Mouse Kinematics Tracker
 * 
 * Captures kinematic velocities, acceleration, jerk, curvature,
 * click hold duration, and scroll intensity.
 */

export class MouseTracker {
  constructor() {
    this.points = []; // [{x, y, t}]
    this.clickDownTimes = [];
    this.clickDurations = [];
    this.moveCount = 0;
    this.clickCount = 0;
    this.totalScrollDelta = 0;
    this.windowStartTime = performance.now();
  }

  handleMouseMove = (event) => {
    const now = performance.now();
    this.points.push({ x: event.clientX, y: event.clientY, t: now });
    this.moveCount++;

    // Limit buffer to prevent memory growth
    if (this.points.length > 300) {
      this.points.shift();
    }
  };

  handleMouseDown = () => {
    this.clickDownTimes.push(performance.now());
    this.clickCount++;
  };

  handleMouseUp = () => {
    const now = performance.now();
    const downTime = this.clickDownTimes.shift();
    if (downTime) {
      const duration = now - downTime;
      if (duration >= 5 && duration <= 3000) {
        this.clickDurations.push(duration);
      }
    }
  };

  handleWheel = (event) => {
    this.totalScrollDelta += Math.abs(event.deltaY || 0);
  };

  getMetricsAndReset() {
    const now = performance.now();
    const durationSeconds = Math.max(0.5, (now - this.windowStartTime) / 1000);

    const pts = this.points.slice();
    const clicks = this.clickDurations.slice();
    const scrollDelta = this.totalScrollDelta;
    const moves = this.moveCount;
    const clickEvents = this.clickCount;

    // Reset buffer
    this.points = [];
    this.clickDurations = [];
    this.clickDownTimes = [];
    this.moveCount = 0;
    this.clickCount = 0;
    this.totalScrollDelta = 0;
    this.windowStartTime = now;

    // Kinematic calculations
    const velocities = [];
    const accelerations = [];
    const jerks = [];
    let arcLength = 0;

    for (let i = 1; i < pts.length; i++) {
      const dt = pts[i].t - pts[i - 1].t;
      if (dt <= 0) continue;

      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      arcLength += dist;

      const v = dist / dt; // px/ms
      velocities.push(v);

      if (velocities.length > 1) {
        const dv = v - velocities[velocities.length - 2];
        const a = Math.abs(dv / dt); // px/ms^2
        accelerations.push(a);

        if (accelerations.length > 1) {
          const da = a - accelerations[accelerations.length - 2];
          const j = Math.abs(da / dt); // px/ms^3
          jerks.push(j);
        }
      }
    }

    // Curvature: total arc length / straight line distance
    let curvatureRatio = 1.25;
    if (pts.length >= 2) {
      const totalDx = pts[pts.length - 1].x - pts[0].x;
      const totalDy = pts[pts.length - 1].y - pts[0].y;
      const euclideanDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      if (euclideanDist > 10 && arcLength >= euclideanDist) {
        curvatureRatio = Math.min(5.0, Math.max(1.0, arcLength / euclideanDist));
      }
    }

    const meanVelocity = velocities.length
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0.85;

    const maxVelocity = velocities.length
      ? Math.max(...velocities)
      : 2.2;

    const meanAcceleration = accelerations.length
      ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length
      : 0.045;

    const meanJerk = jerks.length
      ? jerks.reduce((a, b) => a + b, 0) / jerks.length
      : 0.012;

    const meanClickDuration = clicks.length
      ? clicks.reduce((a, b) => a + b, 0) / clicks.length
      : 85.0;

    const movementToClickRatio = clickEvents > 0 ? moves / clickEvents : Math.max(1.0, moves);
    const scrollIntensity = scrollDelta / durationSeconds;

    return {
      mean_velocity: Math.round(meanVelocity * 1000) / 1000,
      max_velocity: Math.round(maxVelocity * 1000) / 1000,
      mean_acceleration: Math.round(meanAcceleration * 10000) / 10000,
      mean_jerk: Math.round(meanJerk * 10000) / 10000,
      curvature_ratio: Math.round(curvatureRatio * 100) / 100,
      mean_click_duration: Math.round(meanClickDuration * 10) / 10,
      movement_to_click_ratio: Math.round(movementToClickRatio * 10) / 10,
      scroll_intensity: Math.round(scrollIntensity * 10) / 10,
      total_moves: moves
    };
  }
}
