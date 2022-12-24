import { useRef, useEffect, useState, useMemo, useCallback, use } from "react";
import PlayList from "src/components/Playlist";
import SearchYoutube from "src/components/SearchYoutube";
import CXPlayer from "src/lib/CxPlayer";
import Log from "src/lib/CxPlayer/log";

import type { Video } from "youtube-sr";

export default function HomePage() {
  const [searching, setSearching] = useState<Boolean>(false);
  const [playingTrack, setPlayingTrack] = useState<Video>();

  const onPlaylistChangeHandler = useCallback(
    ({ playlist }: { playlist: Video[] }): void => {
      setPlayingTrack(playlist[0]);
    },
    []
  );

  return (
    <>
      <div>
        <SearchYoutube />
      </div>
      <div>
        <PlayList onChange={onPlaylistChangeHandler} />
      </div>
    </>
  );
}
