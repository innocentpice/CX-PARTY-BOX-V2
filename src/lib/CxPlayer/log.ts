// @ts-nocheck

export class Log {
  enable: boolean;

  constructor() {
    this.enable = false;
  }

  info(...content) {
    if (!this.enable) return;
    console.log("Info:", ...content);
  }
  debug(...content) {
    if (!this.enable) return;
    console.log("Debug:", ...content);
  }
  error(...content) {
    if (!this.enable) return;
    console.log("Error:", ...content);
  }
  warn(...content) {
    if (!this.enable) return;
    console.log("Warning:", ...content);
  }
  printRanges(ranges) {
    var length = ranges.length;
    if (length > 0) {
      var str = "";
      for (var i = 0; i < length; i++) {
        if (i > 0) str += ",";
        str +=
          "[" +
          this.getDurationString(ranges.start(i)) +
          "," +
          this.getDurationString(ranges.end(i)) +
          "]";
      }
      return str;
    } else {
      return "(empty)";
    }
  }
  getDurationString(duration, _timescale?: any) {
    var neg;
    /* Helper function to print a number on a fixed number of digits */
    function pad(number, length) {
      var str = "" + number;
      var a = str.split(".");
      while (a[0].length < length) {
        a[0] = "0" + a[0];
      }
      return a.join(".");
    }
    if (duration < 0) {
      neg = true;
      duration = -duration;
    } else {
      neg = false;
    }
    var timescale = _timescale || 1;
    var duration_sec = duration / timescale;
    var hours = Math.floor(duration_sec / 3600);
    duration_sec -= hours * 3600;
    var minutes = Math.floor(duration_sec / 60);
    duration_sec -= minutes * 60;
    var msec = duration_sec * 1000;
    duration_sec = Math.floor(duration_sec);
    msec -= duration_sec * 1000;
    msec = Math.floor(msec);
    return (
      (neg ? "-" : "") +
      hours +
      ":" +
      pad(minutes, 2) +
      ":" +
      pad(duration_sec, 2) +
      "." +
      pad(msec, 3)
    );
  }
}

export default new Log();
