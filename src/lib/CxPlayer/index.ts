// @ts-nocheck

import MP4Box from "mp4box";
import Log from "./log";

export default class CXPlayer {
  mp4boxfile: any;
  movieInfo: any;
  ms: MediaSource;
  video: HTMLVideoElement;

  constructor(video: HTMLVideoElement) {
    this.video = video;
    this.ms = new MediaSource();

    this.ms.addEventListener("sourceopen", (e) => {
      Log.info("MSE", "Source opened");
      Log.debug("MSE", e.target);
    });

    this.ms.addEventListener("sourceclose", (e) => {
      Log.info("MSE", "Source closed, no error");
    });

    video.src = window.URL.createObjectURL(this.ms);

    this.mp4boxfile = MP4Box.createFile();
    this.mp4boxfile.onMoovStart = function () {
      Log.info("Application", "Starting to parse movie information");
    };

    this.mp4boxfile.onReady = (info: any) => {
      Log.info("Application", "Movie information received");
      this.movieInfo = info;
      if (info.isFragmented) {
        this.ms.duration = info.fragment_duration / info.timescale;
      } else {
        this.ms.duration = info.duration / info.timescale;
      }
      this.initializeAllSourceBuffers();
    };

    this.mp4boxfile.onSidx = (sidx: any) => {
      console.log(sidx);
    };

    this.mp4boxfile.onItem = (item: any) => {
      var metaHandler = this.mp4boxfile.getMetaHandler();
      if (metaHandler.startsWith("mif1")) {
        var pitem = this.mp4boxfile.getPrimaryItem();
        console.log("Found primary item in MP4 of type " + item.content_type);
        if (pitem.id === item.id) {
          this.video.poster = window.URL.createObjectURL(
            new Blob([item.data.buffer])
          );
        }
      }
    };

    this.mp4boxfile.onSegment = (id, user, buffer, sampleNum, is_last) => {
      var sb = user;
      sb.segmentIndex++;
      sb.pendingAppends.push({
        id: id,
        buffer: buffer,
        sampleNum: sampleNum,
        is_last: is_last,
      });
      Log.info(
        "Application",
        "Received new segment for track " +
          id +
          " up to sample #" +
          sampleNum +
          ", segments pending append: " +
          sb.pendingAppends.length
      );
      this.onUpdateEnd(sb, true, false);
    };

    this.mp4boxfile.onSamples = function (id, user, samples) {
      Log.info(
        "Waiting Imple",
        "TextTrack #" + id,
        "Received " + samples.length + " new sample(s)"
      );
    };

    return this;
  }

  destroy() {
    window.URL.revokeObjectURL(this.video.src);
  }

  initializeAllSourceBuffers() {
    if (this.movieInfo) {
      var info = this.movieInfo;
      for (var i = 0; i < info.tracks.length; i++) {
        var track = info.tracks[i];
        this.addBuffer(track);
      }
      this.initializeSourceBuffers();
    }
  }

  initializeSourceBuffers() {
    var initSegs = this.mp4boxfile.initializeSegmentation();
    for (var i = 0; i < initSegs.length; i++) {
      var sb = initSegs[i].user;
      if (i === 0) {
        sb.ms.pendingInits = 0;
      }
      sb.addEventListener("updateend", this.onInitAppended.bind(this));
      Log.info("MSE - SourceBuffer #" + sb.id, "Appending initialization data");
      sb.appendBuffer(initSegs[i].buffer);
      sb.segmentIndex = 0;
      sb.ms.pendingInits++;
    }
  }

  onInitAppended(e) {
    var sb = e.target;
    if (sb.ms.readyState === "open") {
      this.updateBufferedString(sb, "Init segment append ended");
      sb.sampleNum = 0;
      sb.removeEventListener("updateend", this.onInitAppended);
      sb.addEventListener("updateend", this.onUpdateEnd(sb, true, true));
      /* In case there are already pending buffers we call onUpdateEnd to start appending them*/
      this.onUpdateEnd(sb, false, true);
      sb.ms.pendingInits--;
      if (sb.ms.pendingInits === 0) {
        this.mp4boxfile.start();
      }
    }
  }

  onUpdateEnd(sb, isNotInit, isEndOfAppend) {
    if (isEndOfAppend === true) {
      if (isNotInit === true) {
        this.updateBufferedString(sb, "Update ended");
      }
      if (sb.sampleNum) {
        this.mp4boxfile.releaseUsedSamples(sb.id, sb.sampleNum);
        delete sb.sampleNum;
      }
      if (sb.is_last) {
        try {
          if (
            sb.pendingAppends.length <= 0 &&
            sb.ms.readyState === "open" &&
            sb.ms.readyState === "updating"
          )
            sb.ms.endOfStream?.();
        } catch (err) {
          console.log("sb.ms.readyState", sb.ms.readyState, err);
        }
      }
    }
    if (
      sb.ms.readyState === "open" &&
      sb.updating === false &&
      sb.pendingAppends.length > 0
    ) {
      var obj = sb.pendingAppends.shift();
      Log.info(
        "MSE - SourceBuffer #" + sb.id,
        "Appending new buffer, pending: " + sb.pendingAppends.length
      );
      sb.sampleNum = obj.sampleNum;
      sb.is_last = obj.is_last;
      sb.appendBuffer(obj.buffer);
    }
  }

  updateBufferedString(sb, string) {
    var rangeString;
    if (sb.ms.readyState === "open") {
      rangeString = Log.printRanges(sb.buffered);
      Log.info(
        "MSE - SourceBuffer #" + sb.id,
        string +
          ", updating: " +
          sb.updating +
          ", currentTime: " +
          Log.getDurationString(this.video.currentTime, 1) +
          ", buffered: " +
          rangeString +
          ", pending: " +
          sb.pendingAppends.length
      );
    }
  }

  addBuffer(mp4track) {
    var sb;
    var ms = this.ms;
    var track_id = mp4track.id;
    var codec = mp4track.codec;
    var mime = 'video/mp4; codecs="' + codec + '"';

    if (MediaSource.isTypeSupported(mime)) {
      try {
        Log.info(
          "MSE - SourceBuffer #" + track_id,
          "Creation with type '" + mime + "'"
        );
        sb = ms.addSourceBuffer(mime);
        sb.addEventListener("error", function (e) {
          Log.error("MSE SourceBuffer #" + track_id, e);
        });
        sb.ms = ms;
        sb.id = track_id;
        this.mp4boxfile.setSegmentOptions(track_id, sb, {
          nbSamples: mp4track.nb_samples || 1024 * 1024,
        });
        sb.pendingAppends = [];
      } catch (e) {
        Log.error(
          "MSE - SourceBuffer #" + track_id,
          "Cannot create buffer with type '" + mime + "'" + e
        );
      }
    } else {
      Log.warn(
        "MSE",
        "MIME type '" +
          mime +
          "' not supported for creation of a SourceBuffer for track id " +
          track_id
      );
    }
  }
}
