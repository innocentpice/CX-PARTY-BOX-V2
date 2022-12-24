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
  const chunkDetail = useRef<
    | {
        musicURL: string;
        total: number;
        chunkSize: number;
        partPerChunk: number;
      }
    | undefined
  >();

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
    try {
      if (bufferingState.current) return;
      if (chunkDetail.current?.musicURL != musicURL) {
        await fetch(musicURL, { headers: { range: "bytes=0-1" } }).then(
          (response) => {
            const totalChunkFromHeader = parseInt(
              response.headers
                ?.get("content-range")
                ?.toString()
                ?.split("/")?.[1]
                ?.toString() || "0"
            );

            const initialChunkForLoad = parseInt(
              (totalChunkFromHeader * 0.1).toString()
            );
            const chunkSize = 1024 * 1024;
            const initialPartCount = initialChunkForLoad
              ? parseInt((initialChunkForLoad / chunkSize).toString())
              : 0 || 1;

            if (!(initialPartCount % 2)) {
              const newChunkSize = parseInt(
                ((chunkSize * initialPartCount) / 2).toString()
              );
              chunkDetail.current = {
                musicURL,
                total: totalChunkFromHeader,
                chunkSize: newChunkSize * 2,
                partPerChunk: 2,
              };
              return [newChunkSize, 2];
            }

            chunkDetail.current = {
              musicURL,
              total: totalChunkFromHeader,
              chunkSize,
              partPerChunk: initialPartCount,
            };

            return [chunkSize, initialPartCount];
          }
        );
      }

      bufferingState.current = true;
      bufferAbotController.current?.abort?.();

      const [chunksize, partCount] = [
        chunkDetail.current.chunkSize,
        chunkDetail.current.partPerChunk,
      ];
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

      for (let i = 1; i <= partCount; i++) {
        console.log(i, chunksize, partCount, chunkDetail.current);
        const response = await fetch(musicURL, {
          signal: bufferAbotController.current.signal,
          headers: { Range: `bytes=${start}-${start + chunksize}` },
        });

        const arrayBuffer = await response.arrayBuffer();
        // @ts-ignore
        arrayBuffer.fileStart = start;

        start = playerRef.current?.mp4boxfile.appendBuffer(
          arrayBuffer,
          i == partCount
        );
      }
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
