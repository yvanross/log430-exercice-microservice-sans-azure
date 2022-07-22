const express = require("express");
const fs = require("fs");
const path = require("path");

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

//
// Registers a HTTP GET route for video streaming.
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

app.get("/", (req, res) => {
    res.send("use: localhost:4000/video?path=SampleVideo_1280x720_1mb.mp4");
  });
  
//
// Starts the HTTP server.
//
app.listen(PORT, () => {
    console.log(`video-storage Microservice online on port: ` + PORT);
});
