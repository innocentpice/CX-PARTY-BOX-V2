import type { NextApiRequest, NextApiResponse } from "next";
import PlaylistChannel from "src/sse/channel/PlaylistChannel";
import { Video } from "youtube-sr";

export default async function AddTrackAPI(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const track: Video = req.body;
  if (!track.id) {
    return res.status(403).send("Please check your track body");
  }

  PlaylistChannel.addTrack(track);
  res.status(200).send("success");
}
