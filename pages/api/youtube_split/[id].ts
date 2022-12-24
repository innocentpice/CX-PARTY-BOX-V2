import ytdl from "ytdl-core";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import request from "request";

import type { NextApiRequest, NextApiResponse } from "next";

ffmpeg.setFfmpegPath(ffmpegPath);

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function Start(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = req.query.id as string;
    const range = req.query.range || req.headers.range;
    const parts = `${range}`.replace(/bytes=/, "").split("-");
    const start = parseInt(`0${parts[0]}`, 10);
    const end = parseInt(`0${parts[1]}`, 10);

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

    const steam = ytdl.downloadFromInfo(info, {
      range: {
        ...(start ? { start } : { start: 0 }),
        ...(end ? { end } : {}),
      },
      filter: (format) => format.url === targetFormat.url,
    });

    const newSteam = new PassThrough();

    await new Promise((resolve, reject) => {
      request(
        targetFormat.url,
        { headers: { range: "bytes=0-1" } },
        // @ts-ignore
        (_error: any, response: any, _body: any) => {
          const totalLength = response.headers["content-range"]?.split("/")[1];

          res.setHeader("Content-Length", totalLength);
          res.setHeader(
            "Content-Range",
            `bytes ${start}-${end}/${totalLength || "*"}`
          );
          res.status(start || end ? 200 : 200);
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Type", targetFormat.mimeType || "video/mp4");
          res.setHeader("X-Content-Type-Options", "nosniff");

          if (
            (!end && start == 0) ||
            (start == 0 && end == 1) ||
            start > totalLength
          ) {
            res.send("");
            reject();
            return;
          }

          newSteam.pipe(res);
          resolve(true);
        }
      );
    });

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(steam)
        .on("error", (err) => {
          reject(err);
        })
        .on("end", () => {
          console.log("END");
          newSteam.push(null);
          resolve(true);
        })
        .outputOptions([
          "-c:v h264",
          "-c:a aac",
          "-ac 2",
          "-map_metadata 0",
          "-f mpegts",
        ])
        .writeToStream(newSteam);
    });
  } catch (err) {
    try {
      console.log(err);
      // @ts-ignore
      res.status(500).json({ err: err?.message || "" });
    } catch (err) {
      console.log(err);
    }
  }
}
