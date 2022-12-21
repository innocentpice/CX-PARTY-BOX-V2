import type { NextApiRequest, NextApiResponse } from "next";
import PlaylistChannel from "src/sse/channel/PlaylistChannel";

export default async function PlaylistInfoAPI(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json(PlaylistChannel.getPlaylist());
}
