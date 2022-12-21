import { createSession } from "better-sse";
import { v4 as uuidv4 } from "uuid";
import PlaylistChannel from "src/sse/channel/PlaylistChannel";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function sse(req: NextApiRequest, res: NextApiResponse) {
  const session = await createSession(req, res);
  session.id(uuidv4());
  PlaylistChannel.register(session);
}
