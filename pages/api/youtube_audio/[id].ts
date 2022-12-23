import type { NextApiRequest, NextApiResponse } from "next";
import { Start } from "pages/api/youtube/[id]";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function getAudio(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await Start(req, res, true).catch((err) => {
    console.log(err);
    res.status(500).json({ err: err.message });
  });
}
