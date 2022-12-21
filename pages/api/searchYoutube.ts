import YoutubeSR from "youtube-sr";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { keyword } = req.query;

  if (keyword === undefined || keyword === "")
    res.status(403).send("Please Submit your keyword param");

  try {
    const videoResult = await YoutubeSR.search(keyword as string, {
      limit: 5,
      type: "video",
      safeSearch: true,
    }).then((result) => {
      return result;
    });

    res.status(200).json(videoResult);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
}
