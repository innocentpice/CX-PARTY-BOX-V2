import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PLAYLIST_EVENTS } from "src/sse/channel/PLAYLIST_EVENTS";
import type { Video } from "youtube-sr";

type PlayListProps = {
  onChange?: ({ playlist }: { playlist: Video[] }) => void | undefined;
};

export default function PlayList({ onChange }: PlayListProps) {
  const [playlist, setPlaylist] = useState<Video[]>([]);

  useEffect(() => {
    onChange?.({ playlist });
  }, [playlist, onChange]);

  const eventSteam = useRef<EventSource>();
  useEffect(() => {
    const sse = new EventSource("/api/sse");

    sse.onopen = () => {
      fetch(`/api/playlist`)
        .then((res) => res.json())
        .then(setPlaylist);
    };

    sse.addEventListener(PLAYLIST_EVENTS.PLAYLIST_TRACK_ADDED, ({ data }) => {
      setPlaylist(JSON.parse(data));
    });

    sse.addEventListener(PLAYLIST_EVENTS.PLAYLIST_TRACK_REMOVED, ({ data }) => {
      setPlaylist(JSON.parse(data));
    });

    eventSteam.current = sse;
  }, []);

  return (
    <>
      <div className="box-scroll">
        {playlist.map((track) => (
          <div key={`playlisttrack_${track.id}`}>
            <div className="list-queue">
              <div style={{ width: 50, height: 50, display: "inline-block" }}>
                <Image
                  src={track.thumbnail?.url as string}
                  width={50}
                  height={50}
                  alt="thumbnail"
                />
              </div>
              <div style={{ display: "inline-block" }}>{track.title}</div>
              <div className="box-btn-del">
                <button
                  className="btn"
                  onClick={() => {
                    fetch(
                      `/api/playlist/remove_track?trackID=${encodeURIComponent(
                        track?.id as string
                      )}`
                    );
                  }}
                >
                  <i className="fa fa-close" /> REMOVE
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
