import request from "request";
import ytdl from "ytdl-core";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = req.query.id as string;
  const audio = true;
  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
  const targetFormat = info.formats
    .filter(
      (item) =>
        item.hasAudio &&
        (audio ? !item.hasVideo : item.hasVideo) &&
        (audio ? `${item.mimeType}`.includes("mp4") : true)
    )
    .sort((a, b) =>
      audio
        ? (a.bitrate || 0) - (b.bitrate || 0)
        : (b.bitrate || 0) - (a.bitrate || 0)
    )[0];

  request(
    targetFormat.url,
    { headers: { range: "bytes=0-1" } },
    // @ts-ignore
    (_error: any, response: any, _body: any) => {
      const totalLength = response.headers["content-range"]?.split("/")[1];

      const resposne =
        `#EXTM3U\n` +
        `#EXT-X-VERSION:3\n` +
        `#EXT-X-TARGETDURATION:1000000\n` +
        `#EXT-X-MEDIA-SEQUENCE:0\n` +
        (() => {
          let result = "";

          result +=
            `#EXTINF:10,\n` +
            `https://ht1cgx-3000.preview.csb.app/api/youtube_split/${id}?range=${0}-${totalLength}\n`;

          return result;
        })() +
        `#EXT-X-ENDLIST\n`;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("content-type", "application/vnd.apple.mpegurl");
      res.status(200).send(resposne);
    }
  );
}
