import { KeyboardTracker } from './keyboardTracker';
import { MouseTracker } from './mouseTracker';

export class FeatureExtractor {
  constructor() {
    this.keyboardTracker = new KeyboardTracker();
    this.mouseTracker = new MouseTracker();
    this.isListening = false;
  }

  startListening() {
    if (this.isListening) return;
    this.isListening = true;

    window.addEventListener('keydown', this.keyboardTracker.handleKeyDown, { passive: true });
    window.addEventListener('keyup', this.keyboardTracker.handleKeyUp, { passive: true });

    window.addEventListener('mousemove', this.mouseTracker.handleMouseMove, { passive: true });
    window.addEventListener('mousedown', this.mouseTracker.handleMouseDown, { passive: true });
    window.addEventListener('mouseup', this.mouseTracker.handleMouseUp, { passive: true });
    window.addEventListener('wheel', this.mouseTracker.handleWheel, { passive: true });
  }

  stopListening() {
    if (!this.isListening) return;
    this.isListening = false;

    window.removeEventListener('keydown', this.keyboardTracker.handleKeyDown);
    window.removeEventListener('keyup', this.keyboardTracker.handleKeyUp);

    window.removeEventListener('mousemove', this.mouseTracker.handleMouseMove);
    window.removeEventListener('mousedown', this.mouseTracker.handleMouseDown);
    window.removeEventListener('mouseup', this.mouseTracker.handleMouseUp);
    window.removeEventListener('wheel', this.mouseTracker.handleWheel);
  }

  extractFeatureVector() {
    const kMetrics = this.keyboardTracker.getMetricsAndReset();
    const mMetrics = this.mouseTracker.getMetricsAndReset();

    // Construct the complete zero-content biometric feature vector
    return {
      mean_hold_time: kMetrics.mean_hold_time,
      std_hold_time: kMetrics.std_hold_time,
      mean_flight_time: kMetrics.mean_flight_time,
      std_flight_time: kMetrics.std_flight_time,
      typing_speed_cpm: kMetrics.typing_speed_cpm,
      pause_ratio: kMetrics.pause_ratio,

      mean_velocity: mMetrics.mean_velocity,
      max_velocity: mMetrics.max_velocity,
      mean_acceleration: mMetrics.mean_acceleration,
      mean_jerk: mMetrics.mean_jerk,
      curvature_ratio: mMetrics.curvature_ratio,
      mean_click_duration: mMetrics.mean_click_duration,

      movement_to_click_ratio: mMetrics.movement_to_click_ratio,
      scroll_intensity: mMetrics.scroll_intensity
    };
  }
}
