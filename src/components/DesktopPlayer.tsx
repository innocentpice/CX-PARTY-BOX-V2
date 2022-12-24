import { useRef, useEffect, useState, useMemo, useCallback, use } from "react";
import CXPlayer from "src/lib/CxPlayer";
import Log from "src/lib/CxPlayer/log";

export default function DesktopPlayer({
  musicURL,
  onEnded,
}: {
  musicURL: string;
  onEnded: Function;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<CXPlayer>();
  const bufferingState = useRef<Boolean>(false);
  const bufferAbotController = useRef<AbortController>();
  const chunkSize = useRef<{
    musicURL?: string;
    size?: number;
  }>({});

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = new CXPlayer(videoRef.current);

    Play();

    return () => {
      bufferAbotController.current?.abort?.();
      playerRef.current?.destroy();
    };
  }, [musicURL]);

  const Play = async (playTime: number = 0) => {
    bufferAbotController.current?.abort?.();

    console.log(chunkSize.current);

    const chunksize =
      (chunkSize.current?.musicURL || "") == musicURL
        ? chunkSize.current?.size
        : await fetch(musicURL, { headers: { range: "bytes=0-1" } }).then(
            (response) => {
              const headerTotalRange = parseInt(
                response.headers
                  ?.get("content-range")
                  ?.toString()
                  ?.split("/")?.[1]
                  ?.toString() || "0"
              );

              const size = parseInt(`${headerTotalRange * 0.1}`) || 1024 * 1024;

              chunkSize.current = {
                musicURL,
                size,
              };
              return size;
            }
          );

    try {
      videoRef.current?.play().catch(console.log);
      let start = (() => {
        try {
          return playerRef.current?.mp4boxfile.seek(playTime, true).offset;
        } catch (err) {
          console.log(err);
          return 0;
        }
      })();

      playerRef.current?.mp4boxfile.start();

      bufferAbotController.current = new AbortController();

      bufferingState.current = true;
      const response = await fetch(musicURL, {
        signal: bufferAbotController.current.signal,
        headers: { Range: `bytes=${start}-${start + chunksize}` },
      });

      const arrayBuffer = await response.arrayBuffer();
      // @ts-ignore
      arrayBuffer.fileStart = start;

      start = playerRef.current?.mp4boxfile.appendBuffer(arrayBuffer, true);
      bufferingState.current = false;
    } catch (err) {
      bufferingState.current = false;
      console.log(err);
    }
  };

  return (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      controls
      width="100%"
      height="100%"
      onTimeUpdate={() => {
        const video = videoRef.current;
        const player = playerRef.current;
        if (!video || !player) return;

        if (video.currentTime >= video.duration - 1) {
          onEnded();
        }

        if (bufferingState.current) return;
        for (let i = 0; i < video.buffered.length; i++) {
          const end = video.buffered.end(i);
          if (video.currentTime >= end - 30) {
            return Play(end);
          }
        }
      }}
      onPlaying={(...param) => console.log("VPlaying", ...param)}
      onError={(...param) => console.log("VError", ...param)}
      onSeeking={(...param) => {
        const video = videoRef.current;
        const player = playerRef.current;
        if (!video || !player) return;

        // @ts-ignore
        if (video.lastSeekTime !== video.currentTime) {
          for (let i = 0; i < video.buffered.length; i++) {
            const start = video.buffered.start(i);
            const end = video.buffered.end(i);
            if (video.currentTime >= start && video.currentTime <= end) {
              return;
            }
          }

          Log.info(
            "Application",
            "Seeking called to video time " +
              Log.getDurationString(video.currentTime)
          );

          Play(video.currentTime);
          // @ts-ignore
          video.lastSeekTime = video.currentTime;
        }
      }}
    />
  );
}
