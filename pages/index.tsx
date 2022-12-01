import { useRef, useEffect, useState } from "react";
import CXPlayer from "../src/lib/CxPlayer";
import Log from "../src/lib/CxPlayer/log";

export default function HomePage() {
  // const musicURL = "/api/youtube/xa-h_bo3Izw";
  const musicURL = "/api/youtube/-b5L2Udw3Qg";
  const [playerVersion, setPlayerVersion] = useState("");
  useEffect(() => {
    setPlayerVersion("MediaSource" in window ? "steaming" : "native");
  }, []);

  return (
    <div style={{ width: "100vw", height: "40vh" }}>
      {playerVersion == "steaming" ? (
        <DesktopPlayer musicURL={musicURL} />
      ) : (
        <></>
      )}

      {playerVersion == "native" ? (
        <video src={musicURL} playsInline controls width="100%" height="100%" />
      ) : (
        <></>
      )}
    </div>
  );
}

function DesktopPlayer({ musicURL }: { musicURL: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<CXPlayer>();
  const bufferingState = useRef<Boolean>(false);
  const bufferAbotController = useRef<AbortController>();

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = new CXPlayer(videoRef.current);

    Play();

    return () => {
      bufferAbotController.current?.abort?.();
      playerRef.current?.destroy();
    };
  }, []);

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
      const response = await fetch(musicURL, {
        signal: bufferAbotController.current.signal,
        headers: { Range: `bytes=${start}-${start + 1024 * 1024}` },
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
      controls
      width="100%"
      height="100%"
      onTimeUpdate={() => {
        const video = videoRef.current;
        const player = playerRef.current;
        if (!video || !player) return;
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
