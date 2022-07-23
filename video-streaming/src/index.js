const express = require("express");
const http = require("http");
const path = require("path");

const app = express();

//
// Throws an error if the any required environment variables are missing.
//

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.VIDEO_STORAGE_HOST) {
    throw new Error("Please specify the host name for the video storage microservice in variable VIDEO_STORAGE_HOST.");
}

if (!process.env.VIDEO_STORAGE_PORT) {
    throw new Error("Please specify the port number for the video storage microservice in variable VIDEO_STORAGE_PORT.");
}

//
// Extracts environment variables to globals for convenience.
//
const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
console.log(`Gateway forwarding video requests to ${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}.`);

//
// Registers a HTTP GET route for video streaming.
//
app.get("/", (req, res) => {
    res.send("video-streaming: localhost:"+ PORT + "/video?path=SampleVideo_1280x720_1mb.mp4");
  });
app.get("/video", (req, res) => {
  console.log(req.query.path);
  const videoPath = "/video?path=" + req.query.path;
  const fullpath = VIDEO_STORAGE_HOST.toString()+":" + VIDEO_STORAGE_PORT.toString()+ videoPath;
    console.log("video-streaming will call: " + fullpath)
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
            res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
            forwardResponse.pipe(res);
        }
    );
    
    req.pipe(forwardRequest);
});

//
// Starts the HTTP server.
//
app.listen(PORT, () => {
    console.log(`video-streaming Microservice online on port: ` + PORT);
});
