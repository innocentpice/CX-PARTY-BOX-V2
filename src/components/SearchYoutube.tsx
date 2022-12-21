import { useEffect, useRef, useState } from "react";
import type { Video } from "youtube-sr";

export default function SearchYoutube() {
  const keywordSearchRef = useRef<NodeJS.Timeout>();
  const [searchResult, setSearchResult] = useState<Video[]>([]);

  useEffect(() => {
    return () => {
      clearTimeout(keywordSearchRef.current);
    };
  }, []);

  const searchYoutubeHandler = (keyword: string) => {
    clearTimeout(keywordSearchRef.current);

    if (keyword === "") return;
    keywordSearchRef.current = setTimeout(() => {
      fetch(`/api/searchYoutube?keyword=${encodeURIComponent(keyword)}`)
        .then((res) => res.json())
        .then((result) => setSearchResult(result));
    }, 1000);
  };

  const addTrackToPlaylistHandler = (track: Video) => {
    fetch(`/api/playlist/add_track`, {
      headers: {
        "Content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(track),
    });
  };

  return (
    <>
      <div className="box-search">
        <input
          className="text-search"
          placeholder="Search"
          onChange={(e) => {
            searchYoutubeHandler(e.target.value);
          }}
        />
      </div>
      <div className="box-scroll">
        {searchResult.map((track) => (
          <div key={`searchResult_${track.id}`}>
            <div className="list-queue-search">
              <div style={{ width: 50, height: 50, display: "inline-block" }}>
                <img src={track.thumbnail?.url} height="100%" />
              </div>
              <div style={{ display: "inline-block" }}>{track.title}</div>
              <button
                className="btn"
                onClick={() => addTrackToPlaylistHandler(track)}
              >
                <i className="fa fa-plus" aria-hidden="true" /> ADD
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
