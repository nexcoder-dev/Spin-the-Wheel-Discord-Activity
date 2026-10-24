export class WheelEngine {
  static selectWinner(segments) {
    if (!segments || segments.length === 0) {
      throw new Error("Cannot select winner from empty segments list");
    }

    const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 1), 0);
    let randomWeight = Math.random() * totalWeight;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const weight = seg.weight || 1;
      if (randomWeight < weight) {
        return { segment: seg, index: i };
      }
      randomWeight -= weight;
    }

    const lastIndex = segments.length - 1;
    return { segment: segments[lastIndex], index: lastIndex };
  }

  static generateSpin(segments, currentWheelAngle = 0) {
    const totalSegments = segments.length;
    if (totalSegments === 0) {
      throw new Error("Cannot generate spin with zero segments");
    }

    const sliceAngle = 360 / totalSegments;
    const { segment: winningSegment, index: winningIndex } = this.selectWinner(segments);

    const fullRotations = Math.floor(Math.random() * 4) + 5;

    const sliceCenterAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);

    const maxJitter = (sliceAngle * 0.35);
    const jitter = (Math.random() * 2 - 1) * maxJitter;

    const desiredNormalizedAngle = (360 - ((sliceCenterAngle + jitter) % 360)) % 360;

    const currentNormalized = ((currentWheelAngle % 360) + 360) % 360;

    let forwardDelta = desiredNormalizedAngle - currentNormalized;
    if (forwardDelta < 0) {
      forwardDelta += 360;
    }

    const totalDelta = (fullRotations * 360) + forwardDelta;
    const targetAngle = currentWheelAngle + totalDelta;

    const durationMs = 4500 + Math.floor(Math.random() * 1000);

    return {
      winningSegment,
      winningIndex,
      targetAngle,
      durationMs,
      sliceAngle,
      totalRotations: fullRotations,
      timestamp: Date.now()
    };
  }
}
