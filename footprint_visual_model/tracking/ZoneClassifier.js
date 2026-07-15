export const COLORS = {
  INTERIOR: 0xff4d4d,
  INTERIOR_ROOM: 0xff4d4d,
  EXTERIOR: 0x39d96a,
  WINDOW_PERIMETER: 0x39d96a,
  TOPSIDE: 0x4ea3ff,
  FLOOR_LEVEL: 0xffd64d,
  UNKNOWN: 0xf5f8ff,
};

export class ZoneClassifier {
  static classify(position, ceilingHeight = 8.5, roomBounds = null) {
    if (!position) {
      return { type: "UNKNOWN", color: COLORS.UNKNOWN };
    }

    const zone = this.classifyZone(position, ceilingHeight, roomBounds);
    return {
      type: zone,
      color: COLORS[zone] || COLORS.UNKNOWN,
    };
  }

  static classifyZone(position, ceilingHeight = 8.5, roomBounds = null) {
    if (typeof position.z === "number" && position.z > 7.0) {
      return "TOPSIDE";
    }

    if (typeof position.z === "number" && position.z < 2.0) {
      return "FLOOR_LEVEL";
    }

    if (typeof position.y === "number" && position.y >= 10.4) {
      return "WINDOW_PERIMETER";
    }

    if (this.isInsideOfficeBoundary(position, roomBounds)) {
      return "INTERIOR_ROOM";
    }

    return "EXTERIOR";
  }

  static isInsideOfficeBoundary(position, roomBounds = null) {
    if (!position) return false;

    const bounds = roomBounds || {
      minX: 0,
      maxX: 12,
      minY: 0,
      maxY: 12,
    };

    return (
      position.x > bounds.minX &&
      position.x < bounds.maxX &&
      position.y > bounds.minY &&
      position.y < bounds.maxY
    );
  }
}
