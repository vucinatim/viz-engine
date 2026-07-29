import type {
  VizModelAnimationLoopMode,
  VizModelAnimationPlayback,
} from "@viz-engine/contracts";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoopRepeat,
  Object3D,
} from "three";

const positiveModulo = (
  value: number,
  divisor: number,
): number => {
  if (divisor <= 0) {
    return 0;
  }
  return ((value % divisor) + divisor) % divisor;
};

export const sampleVizModelClipTime = ({
  timelineTimeSeconds,
  clipDurationSeconds,
  speed = 1,
  phaseSeconds = 0,
  loopMode = "loop",
}: {
  timelineTimeSeconds: number;
  clipDurationSeconds: number;
  speed?: number;
  phaseSeconds?: number;
  loopMode?: VizModelAnimationLoopMode;
}): number => {
  if (
    !Number.isFinite(clipDurationSeconds) ||
    clipDurationSeconds <= 0
  ) {
    return 0;
  }

  const authoredTime =
    (Number.isFinite(timelineTimeSeconds)
      ? timelineTimeSeconds
      : 0) *
      (Number.isFinite(speed) ? speed : 1) +
    (Number.isFinite(phaseSeconds) ? phaseSeconds : 0);

  if (loopMode === "once") {
    return Math.min(
      clipDurationSeconds,
      Math.max(0, authoredTime),
    );
  }

  if (loopMode === "ping-pong") {
    const period = clipDurationSeconds * 2;
    const phase = positiveModulo(authoredTime, period);
    return phase <= clipDurationSeconds
      ? phase
      : period - phase;
  }

  return positiveModulo(authoredTime, clipDurationSeconds);
};

export interface VizThreeDeterministicClipPlayer {
  readonly mixer: AnimationMixer;
  update(
    timelineTimeSeconds: number,
    playback?: VizModelAnimationPlayback,
  ): void;
  dispose(): void;
}

const resolveClip = (
  clips: readonly AnimationClip[],
  clipId: string | undefined,
): AnimationClip | undefined => {
  if (!clipId) {
    return clips[0];
  }

  return (
    clips.find(
      (clip, index) =>
        clip.name === clipId ||
        `clip-${index}` === clipId,
    ) ?? clips[0]
  );
};

export const createVizThreeDeterministicClipPlayer = ({
  root,
  clips,
}: {
  root: Object3D;
  clips: readonly AnimationClip[];
}): VizThreeDeterministicClipPlayer => {
  const mixer = new AnimationMixer(root);
  let activeClip: AnimationClip | undefined;
  let activeAction: AnimationAction | undefined;

  const selectClip = (
    clipId: string | undefined,
  ): AnimationClip | undefined => {
    const clip = resolveClip(clips, clipId);
    if (clip === activeClip) {
      return clip;
    }

    if (activeAction) {
      activeAction.stop();
    }
    activeClip = clip;
    activeAction = clip
      ? mixer.clipAction(clip)
      : undefined;

    if (activeAction) {
      activeAction.reset();
      activeAction.enabled = true;
      activeAction.setLoop(LoopRepeat, Infinity);
      activeAction.play();
    }

    return clip;
  };

  return {
    mixer,
    update(timelineTimeSeconds, playback = {}) {
      const clip = selectClip(playback.clipId);
      if (!clip || !activeAction) {
        return;
      }

      const weight = Number.isFinite(playback.weight)
        ? Math.min(1, Math.max(0, playback.weight ?? 1))
        : 1;
      activeAction.enabled = weight > 0;
      activeAction.setEffectiveWeight(weight);
      mixer.setTime(
        sampleVizModelClipTime({
          timelineTimeSeconds,
          clipDurationSeconds: clip.duration,
          ...(playback.speed === undefined
            ? {}
            : { speed: playback.speed }),
          ...(playback.phaseSeconds === undefined
            ? {}
            : { phaseSeconds: playback.phaseSeconds }),
          ...(playback.loopMode === undefined
            ? {}
            : { loopMode: playback.loopMode }),
        }),
      );
      root.updateMatrixWorld(true);
    },
    dispose() {
      if (activeAction) {
        activeAction.stop();
      }
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      activeAction = undefined;
      activeClip = undefined;
    },
  };
};
