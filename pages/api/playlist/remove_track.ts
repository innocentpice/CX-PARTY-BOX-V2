import type { NextApiRequest, NextApiResponse } from "next";
import PlaylistChannel from "src/sse/channel/PlaylistChannel";

export default async function RemoveTrackAPI(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { trackID } = req.query;
  if (!trackID || trackID === "")
    return res.status(403).send("Please submit trackID param");

  PlaylistChannel.removeTrack(trackID as string);
  res.status(200).send("success");
}
