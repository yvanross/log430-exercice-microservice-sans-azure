const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const app = express();

//
// Throws an error if the PORT environment variable is missing.
//
if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

//
// Extracts the PORT environment variable.
//
const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
console.log(`Gateway forwarding video requests to ${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}.`);

//
// Registers a HTTP GET route for video storage.
//
app.get("/video", (req, res) => {
  
  // SampleVideo_1280x720_1mb.mp4
    const videoPath = path.join("./videos", req.query.path);
    console.log("video-storage will read: " + videoPath);
    fs.stat(videoPath, (err, stats) => {
        if (err) {
            console.error("An error occurred ");
            res.sendStatus(500);
            return;
        }
        res.writeHead(200, {
            "Content-Length": stats.size,
            "Content-Type": "video/mp4",
        });
        fs.createReadStream(videoPath).pipe(res);
    });
});

// on local docker use : VIDEO_STORAGE_HOST='host.docker.internal'
app.get("/gateway", (req, res) => {
    console.log(req.query.path);
    const videoPath = "/video?path=" + req.query.path;
    const fullpath = VIDEO_STORAGE_HOST.toString()+":" + VIDEO_STORAGE_PORT.toString()+ videoPath;
      console.log("gateway will call: " + fullpath)
      console.log(videoPath);
      const forwardRequest = http.request( // Forward the request to the video storage microservice.
          {
              host: VIDEO_STORAGE_HOST,
              port: VIDEO_STORAGE_PORT,
              path: videoPath,
              method: 'GET',
              headers: req.headers
          }, 
          forwardResponse => {
            console.log("RESPONSE");
            console.log(forwardResponse.statusCode);
              res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
              forwardResponse.pipe(res);
          }
      );
      
      req.pipe(forwardRequest);
  });
  
app.get("/", (req, res) => {
    res.send("use: localhost:4000/video?path=SampleVideo_1280x720_1mb.mp4");
  });
  
//
// Starts the HTTP server.
//
app.listen(PORT, () => {
    console.log(`video-storage Microservice online on port: ` + PORT);
});
