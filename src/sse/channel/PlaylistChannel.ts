import { createChannel } from "better-sse";
import type { Channel, Session } from "better-sse";
import type { Video } from "youtube-sr";
import { PLAYLIST_EVENTS } from "./PLAYLIST_EVENTS";

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
    this.playlist = this.playlist.filter((item) => item.id !== trackID);
  }

  getPlaylist(): Video[] {
    return this.playlist;
  }
}

export default new PlaylistChannel();
