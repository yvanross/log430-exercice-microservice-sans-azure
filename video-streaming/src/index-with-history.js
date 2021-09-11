const express = require("express");
const http = require("http");
const mongodb = require("mongodb");

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

if (!process.env.DBHOST) {
  throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
  throw new Error("Please specify the name of the database using environment variable DBNAME");
}

//
// Extracts environment variables to globals for convenience.
//

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

console.log(`Forwarding video requests to ${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}.`);

//
// Send the "viewed" to the history microservice.
//
function sendViewedMessage(videoPath) {
  const postOptions = { // Options to the HTTP POST request.
    method: "POST", // Sets the request method as POST.
    headers: {
      "Content-Type": "application/json", // Sets the content type for the request's body.
    },
  };
  
  const requestBody = { // Body of the HTTP POST request.
    videoPath: videoPath 
  };
  
  const req = http.request( // Send the "viewed" message to the history microservice.
  "http://history/viewed",
  postOptions
  );
  
  req.on("close", () => {
    console.log("Sent 'viewed' message to history microservice.");
  });
  
  req.on("error", (err) => {
    console.error("Failed to send 'viewed' message!");
    console.error(err && err.stack || err);
  });
  
  console.log(JSON.stringify(requestBody));
  req.write(JSON.stringify(requestBody)); // Write the body to the request.
  req.end(); // End the request.
}

function main() {
  return mongodb.MongoClient.connect(DBHOST) // Connect to the database.
  .then(client => {
    const db = client.db(DBNAME);
    const videosCollection = db.collection("videos");
    
    app.get("/video", (req, res) => {
      console.log("video-streaming/src/index-with-history.js called with /video?id=" + req.query.id);
      const videoId = new mongodb.ObjectId(req.query.id);
      console.log(videoId);
      videosCollection.findOne({ _id: videoId })
      .then(videoRecord => {
        if (!videoRecord) {
          res.sendStatus(404);
          return;
        }
        
        console.log(`Translated id ${videoId} to path ${videoRecord.videoPath}.`);
        
        const forwardRequest = http.request( // Forward the request to the video storage microservice.
          {
            host: VIDEO_STORAGE_HOST,
            port: VIDEO_STORAGE_PORT,
            path:`/video?path=${videoRecord.videoPath}`, // Video path now retrieved from the database.
            method: 'GET',
            headers: req.headers
          }, 
          forwardResponse => {
            res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
            forwardResponse.pipe(res);
          }
          );
          
          req.pipe(forwardRequest);
          sendViewedMessage(req.query.id); // send message to history
          
        })
        .catch(err => {
          console.error("Database query failed.");
          console.error(err && err.stack || err);
          res.sendStatus(500);
        });
      });
      
      //
      // Starts the HTTP server.
      //
      app.listen(PORT, () => {
        console.log(`Microservice listening, please load the data file db-fixture/videos.json into your database before testing this microservice.`);
      });
    });
  }
  
  main()
  .then(() => console.log("Microservice online."))
  .catch(err => {
    console.error("Microservice failed to start.");
    console.error(err && err.stack || err);
  });
  