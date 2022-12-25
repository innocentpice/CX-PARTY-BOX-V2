import { useRef, useEffect } from "react";
import CXPlayer from "src/lib/CxPlayer";
import Log from "src/lib/CxPlayer/log";

export default function DesktopPlayer({
  musicURL, onEnded,
}: {
  musicURL: string;
  onEnded: Function;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<CXPlayer>();
  const bufferingState = useRef<Boolean>(false);
  const bufferAbotController = useRef<AbortController>();

  useEffect(() => {
    if (!videoRef.current)
      return;

    playerRef.current = new CXPlayer(videoRef.current);

    Play();

    return () => {
      bufferAbotController.current?.abort?.();
      playerRef.current?.destroy();
    };
  }, [musicURL]);

  const Play = async (playTime: number = 0) => {
    bufferAbotController.current?.abort?.();

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

      const chunkSize = await fetch(musicURL, { headers: { range: "bytes=0-1" } }).then(
        (response) => {
          const totalChunkFromHeader = parseInt(
            response.headers
              ?.get("content-range")
              ?.toString()
              ?.split("/")?.[1]
              ?.toString() || "0"
          );

          const chunkSizePerPart = parseInt(
            (totalChunkFromHeader * 0.01).toString()
          );

          return chunkSizePerPart;
        }
      );

      const fetcher = async (start: number) => {
        const rStart = start;
        const rEnd = start + chunkSize;
        return fetch(musicURL, {
          signal: bufferAbotController.current?.signal,
          headers: { Range: `bytes=${rStart}-${rEnd}` },
        }).then(response => response.arrayBuffer()).then((arrayBuffer) => Buffer.from(arrayBuffer));
      }


      const rStartGenerator = (index: number): number => {
        if (index) {
          return start + index + (index * chunkSize);
        }
        return start;
      }

      const fetchBufferResults = await Promise.all(new Array(5).fill("").map((_, index) => fetcher(rStartGenerator(index))))
      const appendBuffer = toArrayBuffer(Buffer.concat(fetchBufferResults));

      // @ts-ignore
      appendBuffer.fileStart = start;
      playerRef.current?.mp4boxfile.appendBuffer(appendBuffer, true);

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
        if (!video || !player)
          return;

        if (video.currentTime >= video.duration - 1) {
          onEnded();
        }

        if (bufferingState.current)
          return;
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
        if (!video || !player)
          return;

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
      }} />
  );
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}