import type { VizEditorGraphRuntimeInspection } from "@viz-engine/editor-control";
import React, { type ChangeEvent, useEffect, useMemo, useRef } from "react";
import { Music, Pause, Play, Repeat, Upload } from "lucide-react";

import { Button } from "./ui/button";
import { useV2EditorActions, useV2EditorSnapshot } from "./v2-editor-provider";

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00.00";
  }

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const wholeSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const centiseconds = Math.floor((seconds % 1) * 100)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${wholeSeconds}.${centiseconds}`;
};

const DEFAULT_LIBRARY_TRACK = "[HipHop] 808 Rap.mp3";

const renderGraphRuntimeSummary = (
  graphRuntime: VizEditorGraphRuntimeInspection,
): string => {
  if (graphRuntime.graphs.length === 0) {
    return "no graphs";
  }

  return graphRuntime.graphs
    .map((graph) => `${graph.name}: ${Object.keys(graph.values).length} outputs`)
    .join(" · ");
};

export const V2AudioPanel = ({
  bundledTracks,
}: {
  bundledTracks: string[];
}) => {
  const snapshot = useV2EditorSnapshot();
  const actions = useV2EditorActions();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    actions.bindAudioElement(audioRef.current);

    return () => {
      actions.bindAudioElement(null);
    };
  }, [actions]);

  useEffect(() => {
    if (
      bundledTracks.length === 0 ||
      snapshot.snapshot.audioSession.source ||
      snapshot.audio.fileName
    ) {
      return;
    }

    const defaultTrack =
      bundledTracks.find((track) => track === DEFAULT_LIBRARY_TRACK) ??
      bundledTracks[0];
    if (!defaultTrack) {
      return;
    }
    actions.loadBundledAudioTrack(defaultTrack);
  }, [
    actions,
    bundledTracks,
    snapshot.audio.fileName,
    snapshot.snapshot.audioSession.source,
  ]);

  const durationSeconds = useMemo(() => {
    const fromAudio = snapshot.audio.durationSeconds;

    if (fromAudio > 0) {
      return fromAudio;
    }

    return (
      snapshot.snapshot.transport.durationFrames / snapshot.snapshot.transport.fps
    );
  }, [
    snapshot.audio.durationSeconds,
    snapshot.snapshot.transport.durationFrames,
    snapshot.snapshot.transport.fps,
  ]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    actions.loadAudioFile(file);
  };

  const selectedBundledTrack =
    snapshot.snapshot.audioSession.source?.uri?.startsWith("/music/")
      ? snapshot.snapshot.audioSession.source.label
      : "";

  return (
    <div className="absolute inset-0 grid grid-cols-[88px_1fr]">
      <div className="border-r border-white/10 bg-black/20 p-3">
        <div className="flex h-full flex-col items-center justify-between">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              Mode
            </p>
            <p className="mt-2 text-sm text-white">
              {snapshot.snapshot.transport.mode}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              Input
            </p>
            <p className="mt-2 text-sm text-white">
              {snapshot.snapshot.audioDiagnostics.inputMode}
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-col">
        <audio ref={audioRef} className="hidden" />
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Audio Session
            </p>
            <p className="truncate text-sm text-white/80">
              {snapshot.audio.fileName ??
                snapshot.snapshot.audioSession.source?.label ??
                "No local audio file loaded"}
            </p>
          </div>

          <Button
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/10"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Load Audio
          </Button>

          <Button
            aria-label="Play or pause preview"
            variant="outline"
            className={[
              "border-white/10 text-white hover:bg-white/10",
              snapshot.snapshot.transport.isPlaying
                ? "bg-white text-black hover:bg-white/90"
                : "bg-transparent",
            ].join(" ")}
            onClick={() => {
              void actions.togglePlayback();
            }}
          >
            {snapshot.snapshot.transport.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            aria-label="Toggle looped preview playback"
            variant="outline"
            className={[
              "border-white/10 text-white hover:bg-white/10",
              snapshot.snapshot.transport.loop
                ? "bg-white text-black hover:bg-white/90"
                : "bg-transparent",
            ].join(" ")}
            onClick={() => {
              actions.setLoop(!snapshot.snapshot.transport.loop);
            }}
          >
            <Repeat className="mr-2 h-4 w-4" />
            {snapshot.snapshot.transport.loop ? "Loop On" : "Loop Off"}
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 px-4 py-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  Bundled Tracks
                </p>
                <select
                  value={selectedBundledTrack}
                  onChange={(event) => {
                    if (!event.target.value) {
                      return;
                    }
                    actions.loadBundledAudioTrack(event.target.value);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/30"
                >
                  <option value="" disabled>
                    Select bundled audio
                  </option>
                  {bundledTracks.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
                source {snapshot.audio.sourceKind ?? "none"}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white">
                <Music className="h-4 w-4 text-white/55" />
                <span className="text-sm">Transport</span>
              </div>
              <div className="font-mono text-xs text-white/65">
                {formatTime(snapshot.audio.currentTimeSeconds)} /{" "}
                {formatTime(durationSeconds)}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={snapshot.snapshot.transport.durationFrames - 1}
              value={snapshot.snapshot.transport.currentFrame}
              onChange={(event) => {
                actions.seekToFrame(Number(event.target.value));
              }}
              className="w-full accent-white"
            />

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/55">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                frame {snapshot.snapshot.transport.currentFrame}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                {snapshot.snapshot.transport.fps} fps
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                {snapshot.snapshot.transport.loop ? "loop on" : "loop off"}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-[1fr_1fr] gap-3">
            <div className="overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                Audio Diagnostics
              </p>
              <div className="space-y-2 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  input mode {snapshot.snapshot.audioDiagnostics.inputMode}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  live input {snapshot.snapshot.audioDiagnostics.usesLiveAudio ? "active" : "inactive"}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  baked artifacts {snapshot.snapshot.audioDiagnostics.usesBakedArtifacts ? "active" : "inactive"}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  bound element {snapshot.audio.hasBoundElement ? "yes" : "no"}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  error {snapshot.audio.error ?? "none"}
                </div>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                Graph Runtime
              </p>
              <div className="space-y-2 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {renderGraphRuntimeSummary(snapshot.graphRuntime)}
                </div>
                {snapshot.graphRuntime.graphs.map((graph) => (
                  <div
                    key={graph.graphId}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="font-medium text-white">{graph.name}</div>
                    <div className="mt-1 text-white/55">
                      frame {graph.checkpoint?.frame ?? snapshot.graphRuntime.frame}
                    </div>
                    {graph.issues.length > 0 && (
                      <div className="mt-1 text-amber-200">
                        {graph.issues.length} issue{graph.issues.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
