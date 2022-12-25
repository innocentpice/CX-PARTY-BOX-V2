import { useRef, useEffect, useState, useMemo, useCallback, use } from "react";
import PlayList from "src/components/Playlist";
import SearchYoutube from "src/components/SearchYoutube";
import DesktopPlayer from "src/components/DesktopPlayer";

import type { Video } from "youtube-sr";

export default function HomePage() {
  // const musicURL = "/api/youtube/xa-h_bo3Izw";
  // const musicURL = "/api/youtube/-b5L2Udw3Qg";

  const [playerVersion, setPlayerVersion] = useState("");
  useEffect(() => {
    setPlayerVersion("MediaSource" in window ? "steaming" : "nativeVideo");
  }, []);

  const [searching, setSearching] = useState<Boolean>(false);
  const [playingTrack, setPlayingTrack] = useState<Video>();

  const musicURL = useMemo(
    () =>
      playingTrack?.id
        ? `/api/youtube/${playingTrack?.id}`
        : "/api/youtube/-b5L2Udw3Qg",
    [playingTrack?.id]
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
      {playerVersion != "steaming" ? (
        <button
          onClick={() => {
            setPlayerVersion((prev) =>
              prev === "nativeAudio" ? "nativeVideo" : "nativeAudio"
            );
          }}
        >
          TOGGLE AUDIO
        </button>
      ) : (
        <></>
      )}

      <div style={{ display: !searching ? "none" : "block" }}>
        <SearchYoutube />
      </div>
      <div style={{ display: searching ? "none" : "block" }}>
        <PlayList onChange={onPlaylistChangeHandler} />
      </div>
    </>
  );
}