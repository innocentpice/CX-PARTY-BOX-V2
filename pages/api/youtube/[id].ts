import ytdl from "ytdl-core";
import { PassThrough } from "stream";
import request from "request";

import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    responseLimit: false,
  },
};

export async function Start(
  req: NextApiRequest,
  res: NextApiResponse,
  audio?: boolean
) {
  const id = req.query.id as string;

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

  const range = req.query.range || req.headers.range;
  const parts = `${range}`.replace(/bytes=/, "").split("-");
  const start = parseInt(`0${parts[0]}`, 10);
  const end = parseInt(`0${parts[1] || ""}`, 10);

  console.log(
    `ID: ${id} ${range} ${JSON.stringify({
      range: {
        ...(start ? { start } : { start: 0 }),
        ...(end ? { end } : {}),
      },
    })}`
  );

  let contentLength = 0;

  const newSteam = new PassThrough();

  res.status(start || end ? 206 : 200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", targetFormat.mimeType || "video/mp4");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const steam = ytdl.downloadFromInfo(info, {
    range: {
      ...(start ? { start } : { start: 0 }),
      ...(end ? { end } : {}),
    },
    filter: (format) => format.url === targetFormat.url,
    ...(!audio ? { dlChunkSize: 1024 } : {}),
  });

  return new Promise<Boolean>((resolve, reject) => {
    steam
      // .on("info", (info, format) => {Ï
      //   console.log(format);
      // })
      .on("data", (chunk) => {
        if (chunk.length) {
          contentLength += chunk.length;
          newSteam.push(chunk);
        }
      })
      .on("end", () => {
        request(
          targetFormat.url,
          { headers: { range: "bytes=0-1" } },
          // @ts-ignore
          (_error: any, response: any, _body: any) => {
            const totalLength =
              response.headers["content-range"]?.split("/")[1];

            res.setHeader("Content-Length", contentLength);
            res.setHeader(
              "Content-Range",
              `bytes ${start}-${end ? end : start + contentLength}/${
                totalLength || targetFormat.contentLength || "*"
              }`
            );

            newSteam.pipe(res);
            newSteam.push(null);
            resolve(true);
          }
        );
      });
  });
}

export default async function getAudio(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await Start(req, res, false).catch((err) => {
    console.log(err);
    res.status(500).json({ err: err.message });
  });
}
