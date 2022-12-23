import { createChannel } from "better-sse";
import { PLAYLIST_EVENTS } from "./PLAYLIST_EVENTS";
import ytdl from "ytdl-core";
import YoutubeSR from "youtube-sr";
import type { Channel, Session } from "better-sse";
import type { Video } from "youtube-sr";

declare global {
  var PLAYLIST_CANNEL: Channel;
}

if (!global.PLAYLIST_CANNEL) {
  global.PLAYLIST_CANNEL = createChannel();
}

class PlaylistChannel {
  private channel: Channel;

  private playlistStore: Video[] = [];

  private get playlist(): Video[] {
    return this.playlistStore;
  }
  private set playlist(playlists: Video[]) {
    this.playlistStore = playlists;
    this.channel.broadcast(
      this.playlistStore,
      PLAYLIST_EVENTS.PLAYLIST_TRACK_REMOVED
    );
    console.log(
      `PLAYLIST STORE UPDATE:`,
      this.playlistStore.map((item: Video) => item.id)
    );
  }

  constructor() {
    this.channel = global.PLAYLIST_CANNEL;
    this._setInitialTrack();
  }
  async _setInitialTrack() {
    if (!this.playlist.length) {
      const videoResult: Video = await YoutubeSR.getVideo(
        `https://www.youtube.com/watch?v=UfY14wLwubc`
      );

      this.playlist = [videoResult];
      return;
    }
  }

  register(session: Session) {
    this.channel.register(session);
    console.log(`PlaylistChannel Session [${session.lastId}]: joined`);
  }

  addTrack(track: Video) {
    if (this.playlist.findIndex((item) => item.id == track.id) >= 0) {
      return;
    }

    this.playlist = [...this.playlist, track];
  }

  removeTrack(trackID: String) {
    (async () => {
      const result = this.playlist.filter((item) => item.id !== trackID);
      if (!result.length) {
        const info = await ytdl.getInfo(
          `https://www.youtube.com/watch?v=${trackID}`
        );
        const videoResult: Video = await YoutubeSR.getVideo(
          `https://www.youtube.com/watch?v=${info.related_videos[1].id}`
        );

        this.playlist = [...result, videoResult];
        return;
      }

      this.playlist = [...result];
    })();
  }

  getPlaylist(): Video[] {
    return this.playlist;
  }
}

export default new PlaylistChannel();
