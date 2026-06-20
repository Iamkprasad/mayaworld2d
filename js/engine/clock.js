// Game Clock System - Tracks in-game hours, minutes, days, and years

export class GameClock {
  constructor(onHourChange, onDayChange) {
    this.hours = 6;     // Start at 06:00 (Dawn)
    this.minutes = 0;
    this.days = 1;
    this.years = 1;
    this.timeAccumulator = 0;
    this.minuteDurationMs = 100; // 1 real second = 10 in-game minutes (100ms per minute)
    
    this.onHourChange = onHourChange;
    this.onDayChange = onDayChange;

    this.eclipseCountdown = 20; // Eclipse occurs every 20 days
    this.eclipseActive = false;
    this.eclipseDurationHours = 3;
    this.eclipseActiveHour = 12; // Eclipse happens at noon
  }

  update(deltaTime) {
    this.timeAccumulator += deltaTime;
    
    if (this.timeAccumulator >= this.minuteDurationMs) {
      this.timeAccumulator = 0;
      this.tickMinute();
    }
  }

  tickMinute() {
    this.minutes += 1;
    if (this.minutes >= 60) {
      this.minutes = 0;
      this.tickHour();
    }
  }

  tickHour() {
    this.hours += 1;
    if (this.hours >= 24) {
      this.hours = 0;
      this.tickDay();
    }

    if (this.onHourChange) {
      this.onHourChange(this.hours);
    }

    // Eclipse status check
    if (this.eclipseActive && this.hours >= this.eclipseActiveHour + this.eclipseDurationHours) {
      this.eclipseActive = false;
      console.log("The solar eclipse has ended.");
    }
  }

  tickDay() {
    this.days += 1;
    if (this.days >= 365) {
      this.days = 1;
      this.years += 1;
    }

    this.eclipseCountdown -= 1;
    if (this.eclipseCountdown <= 0) {
      this.eclipseCountdown = 20; // Reset
      this.eclipseActive = true;
      console.log("A solar eclipse has begun!");
    }

    if (this.onDayChange) {
      this.onDayChange();
    }
  }

  getTimeString() {
    const hh = String(this.hours).padStart(2, '0');
    const mm = String(this.minutes).padStart(2, '0');
    return `${hh}:${mm} — Year ${this.years}`;
  }

  getTintClass() {
    if (this.eclipseActive && this.hours >= this.eclipseActiveHour && this.hours < this.eclipseActiveHour + this.eclipseDurationHours) {
      return 'eclipse-tint';
    }
    if (this.hours >= 20 || this.hours < 5) {
      return 'night-tint';
    }
    if (this.hours >= 17 && this.hours < 20) {
      return 'dusk-tint';
    }
    return 'day-tint';
  }

  reset(epochYears = 1) {
    this.hours = 6;
    this.minutes = 0;
    this.days = 1;
    this.years = epochYears;
    this.eclipseCountdown = 20;
    this.eclipseActive = false;
  }
}
