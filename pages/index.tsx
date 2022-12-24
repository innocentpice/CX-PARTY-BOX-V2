import { useRef, useEffect, useState, useMemo, useCallback, use } from "react";
import PlayList from "src/components/Playlist";
import SearchYoutube from "src/components/SearchYoutube";
import CXPlayer from "src/lib/CxPlayer";
import Log from "src/lib/CxPlayer/log";

import type { Video } from "youtube-sr";

export default function HomePage() {
  // const musicURL = "/api/youtube/xa-h_bo3Izw";
  // const musicURL = "/api/youtube/-b5L2Udw3Qg";

  const [playerVersion, setPlayerVersion] = useState("");
  useEffect(() => {
    setPlayerVersion("MediaSource" in window ? "steaming" : "nativeAudio");
  }, []);

  const [searching, setSearching] = useState<Boolean>(false);
  const [playingTrack, setPlayingTrack] = useState<Video>();

  const musicURL = useMemo(
    () =>
      playingTrack?.id
        ? `/api/${playerVersion === "nativeAudio" ? "m3u8" : "youtube"}/${
            playingTrack?.id
          }`
        : "/api/youtube/-b5L2Udw3Qg",
    [playingTrack?.id, playerVersion]
  );

  const onPlaylistChangeHandler = useCallback(
    ({ playlist }: { playlist: Video[] }): void => {
      setPlayingTrack(playlist[0]);
    },
    []
  );

  const onEnded = useCallback(() => {
    if (!playingTrack?.id) return;
    fetch(`/api/playlist/remove_track?trackID=${playingTrack?.id}`);
  }, [playingTrack?.id]);

  const nativeVideoPlayerRef = useRef<HTMLVideoElement>(null);
  const nativeAudioPlayerRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const nativePlayer =
      playerVersion == "nativeVideo"
        ? nativeVideoPlayerRef.current
        : nativeAudioPlayerRef.current;

    if (!nativePlayer) return;

    nativePlayer.src = musicURL;
    nativePlayer.play().catch(console.log);
  }, [musicURL, playerVersion]);

  useEffect(() => {
    const nativePlayer =
      playerVersion == "nativeVideo"
        ? nativeVideoPlayerRef.current
        : nativeAudioPlayerRef.current;

    if (!playingTrack || !nativePlayer) return;

    const onplayHandler = () => {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: playingTrack.title,
        artist: playingTrack.title,
        album: playingTrack.title,
        // artwork: playingTrack.id
        //   ? [96, 128, 192, 256, 384, 512, 1024].map((size) => ({
        //       src: `/api/youtube_thumbnail/${playingTrack.id}/${size}`,
        //       sizes: `${size}x${size}`,
        //       type: "image/png",
        //     }))
        //   : [],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        const nativePlayer =
          playerVersion == "nativeVideo"
            ? nativeVideoPlayerRef.current
            : nativeAudioPlayerRef.current;
        nativePlayer?.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        const nativePlayer =
          playerVersion == "nativeVideo"
            ? nativeVideoPlayerRef.current
            : nativeAudioPlayerRef.current;
        nativePlayer?.pause();
      });

      navigator.mediaSession.setActionHandler("seekto", (event) => {
        const nativePlayer =
          playerVersion == "nativeVideo"
            ? nativeVideoPlayerRef.current
            : nativeAudioPlayerRef.current;

        if (!nativePlayer || !event.seekTime) return;

        if (event.fastSeek && "fastSeek" in nativePlayer) {
          nativePlayer.fastSeek(event.seekTime);
          return;
        }

        nativePlayer.currentTime = event.seekTime;
      });

      navigator.mediaSession.setActionHandler("nexttrack", onEnded);

      // @ts-ignore
      navigator.mediaSession.setActive?.(true);
    };

    onplayHandler();
    nativePlayer.addEventListener("timeupdate", onplayHandler);
    nativePlayer.addEventListener("play", onplayHandler);
    nativePlayer.addEventListener("playing", onplayHandler);
    nativePlayer.addEventListener("ended", onEnded);

    return () => {
      nativePlayer?.removeEventListener("timeupdate", onplayHandler);
      nativePlayer?.removeEventListener("play", onplayHandler);
      nativePlayer?.removeEventListener("playing", onplayHandler);
      nativePlayer?.removeEventListener("ended", onEnded);
    };
  }, [playingTrack, onEnded, playerVersion]);

  return (
    <>
      {playerVersion == "steaming" ? (
        <DesktopPlayer musicURL={musicURL} onEnded={onEnded} />
      ) : (
        <></>
      )}

      {playerVersion == "nativeVideo" ? (
        <video
          ref={nativeVideoPlayerRef}
          onEnded={onEnded}
          playsInline
          autoPlay
          controls
          width="100%"
          height="100%"
        />
      ) : (
        <></>
      )}

      {playerVersion == "nativeAudio" ? (
        <audio ref={nativeAudioPlayerRef} onEnded={onEnded} autoPlay controls />
      ) : (
        <></>
      )}

      <button
        onClick={() => {
          setSearching((prev) => !prev);
        }}
      >
        TOGGLE SEARCH
      </button>

      <button
        onClick={() => {
          setPlayerVersion((prev) =>
            prev === "nativeAudio" ? "nativeVideo" : "nativeAudio"
          );
        }}
      >
        TOGGLE AUDIO
      </button>

      <div style={{ display: !searching ? "none" : "block" }}>
        <SearchYoutube />
      </div>
      <div style={{ display: searching ? "none" : "block" }}>
        <PlayList onChange={onPlaylistChangeHandler} />
      </div>
    </>
  );
}

function DesktopPlayer({
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
