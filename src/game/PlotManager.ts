export class PlotManager {
  // Narrative Zones:
  // 0 = The Verdant Plains
  // 1 = The Scorched Desert
  // 2 = The Ashen City
  public currentZone: number = 0;

  constructor() {}

  /**
   * Returns the absolute chunk boundaries for the current narrative zone.
   * The procedural engine is forbidden from creating walkable chunks outside these bounds.
   */
  public getZoneBounds(): { minX: number, maxX: number, minY: number, maxY: number } {
    switch (this.currentZone) {
      case 0: // Plains (Easy)
        // A wide horizontal strip
        return { minX: -20, maxX: 20, minY: 0, maxY: 40 };
      case 1: // Desert (Medium)
        // Pushes the player north
        return { minX: -20, maxX: 20, minY: -40, maxY: 0 };
      case 2: // Ashen City (Hard)
        // Deep north
        return { minX: -20, maxX: 20, minY: -80, maxY: -40 };
      default:
        return { minX: -20, maxX: 20, minY: 0, maxY: 40 };
    }
  }

  /**
   * Advances the plot when a major environmental crisis is solved.
   */
  public advancePlot() {
    this.currentZone++;
    console.log(`Plot Advanced to Zone: ${this.currentZone}`);
    // A global event that GameManager can listen to for cinematic transitions
    window.dispatchEvent(new CustomEvent('plot-advanced', { detail: { newZone: this.currentZone } }));
  }
}
