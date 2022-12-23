import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const resposne =
    `#EXTM3U\n` +
    `#EXT-X-VERSION:3\n` +
    `#EXT-X-TARGETDURATION:1000000\n` +
    `#EXT-X-MEDIA-SEQUENCE:0\n` +
    (() => {
      let result = "";

      const chunkSize = 1024 * 1024;

      for (let start = 0; start <= 6336632; start += chunkSize) {
        result +=
          `#EXTINF:10,\n` +
          `https://ht1cgx-3000.preview.csb.app/api/youtube_split/zD_3Ixr2hjI?range=${start}-${
            start + chunkSize
          }\n`;
      }
      return result;
    })() +
    `#EXT-X-ENDLIST\n`;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("content-type", "application/vnd.apple.mpegurl");
  res.status(200).send(resposne);
}
