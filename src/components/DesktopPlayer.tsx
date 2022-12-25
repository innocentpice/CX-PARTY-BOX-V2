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
  const maxChunkSize = useRef<number>(0);
  const chunkSizeForload = useRef<number>(0);
  const chunkRangeStart = useRef<number>(0);

  useEffect(() => {
    const initialTimeout = setTimeout(async () => {
      if (!videoRef.current) return;
      playerRef.current = new CXPlayer(videoRef.current);
      videoRef.current.play().catch(console.log);
      await fetch(musicURL, { headers: { range: "bytes=0-1" } }).then(
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

          chunkSizeForload.current = chunkSizePerPart;
          maxChunkSize.current = totalChunkFromHeader;
        }
      );
      loadBuffer();
    }, 0)

    return () => {
      clearTimeout(initialTimeout);
      bufferAbotController.current?.abort?.();
      playerRef.current?.destroy();
      chunkSizeForload.current = 0;
    };
  }, [musicURL]);

  const loadBuffer = async () => {
    if (!chunkSizeForload.current || !maxChunkSize.current) return;
    if (!playerRef.current) return;
    try {
      const chunkSize = chunkSizeForload.current;
      const start = chunkRangeStart.current;




      bufferAbotController.current?.abort();
      bufferAbotController.current = new AbortController();

      bufferingState.current = true;

      const fetchBufferResults = await bufferLoader(musicURL, start, chunkSize, maxChunkSize.current, bufferAbotController.current);
      const appendBuffer = toArrayBuffer(Buffer.concat(fetchBufferResults));

      // @ts-ignore
      appendBuffer.fileStart = start;
      chunkRangeStart.current = playerRef.current.mp4boxfile.appendBuffer(appendBuffer, true);

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

        if (bufferingState.current) return;
        for (let i = 0; i < video.buffered.length; i++) {
          const end = video.buffered.end(i);
          if (video.currentTime >= end - 30) {
            return loadBuffer();
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
          chunkRangeStart.current = playerRef.current?.mp4boxfile.seek(video.currentTime, true).offset;
          loadBuffer();
          // @ts-ignore
          video.lastSeekTime = video.currentTime;
        }
      }} />
  );
}



const bufferLoader = async (musicURL: string, start: number, chunkSize: number, maxChunkSize: number, bufferAbotController?: AbortController) => {
  const fetcher = async (musicURL: string, start: number, chunkSize: number) => {
    if (start > maxChunkSize) return Promise.resolve(Buffer.alloc(0));
    const rStart = start;
    const rEnd = start + chunkSize;
    return fetch(musicURL, {
      signal: bufferAbotController?.signal,
      headers: { Range: `bytes=${rStart}-${rEnd}` },
    }).then(response => response.arrayBuffer()).then((arrayBuffer) => Buffer.from(arrayBuffer));
  }

  return Promise.all(new Array(5).fill("").map((_, index) => fetcher(musicURL, index ? start + index + (index * chunkSize) : start, chunkSize)))
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}