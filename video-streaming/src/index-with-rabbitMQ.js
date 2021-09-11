const express = require("express");
const fs = require("fs");
const amqp = require('amqplib');
const mongodb = require("mongodb");
const http = require("http");



if (!process.env.DBHOST) {
  throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
  throw new Error("Please specify the name of the database using environment variable DBNAME");
}

if (!process.env.RABBIT) {
  throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const RABBIT = process.env.RABBIT;

//
// Connect to the RabbitMQ server.
//
function connectRabbit() {
  
  console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);
  
  return amqp.connect(RABBIT) // Connect to the RabbitMQ server.
  .then(connection => {
    console.log("Connected to RabbitMQ.");
    
    return connection.createChannel(); // Create a RabbitMQ messaging channel.
  });
}

//
// Send the "viewed" to the history microservice.
//
function sendViewedMessage(messageChannel, videoPath) {
  console.log(`Publishing message on "viewed" queue.`);
  
  const msg = { videoPath: videoPath };
  const jsonMsg = JSON.stringify(msg);
  messageChannel.publish("", "viewed", Buffer.from(jsonMsg)); // Publish message to the "viewed" queue.
}

//
// Setup event handlers.
//
function setupHandlers(app, messageChannel) {
  app.get("/video", async (req, res) => { // Route for streaming video.
    const client = await mongodb.MongoClient.connect(process.env.DBHOST);
    const db = client.db(process.env.DBNAME);
    const videosCollection = db.collection("videos");
    console.log("video-streaming/src/index-with-rabbitMQ.js called with /video?id=" + req.query.id);
    const videoId = new mongodb.ObjectId(req.query.id);
    console.log(videoId);
    const videoRecord  = await videosCollection.findOne({ _id: videoId });
    
    if (!videoRecord) {
      res.sendStatus(404);
      return;
    }
    
    console.log(`Translated id ${videoId} to path ${videoRecord.videoPath}.`);
      // Forward the request to the video storage microservice.
      const forwardRequest = http.request( 
        {
          host: process.env.VIDEO_STORAGE_HOST,
          port:  parseInt(process.env.VIDEO_STORAGE_PORT),
          path:`/video?path=${videoRecord.videoPath}`, // Video path now retrieved from the database.
          method: 'GET',
          headers: req.headers
        }, 
        forwardResponse => {
          res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
          forwardResponse.pipe(res);
        });
        
        req.pipe(forwardRequest);
        sendViewedMessage(messageChannel, req.query.id); // Send message to "history" microservice that this video has been "viewed".
        
      })
    // .catch(err => {
    //   console.error("Database query failed.");
    //   console.error(err && err.stack || err);
    //   res.sendStatus(500);
    // });
  }
  
  //
  // Start the HTTP server.
  //
  function startHttpServer(messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
      const app = express();
      setupHandlers(app, messageChannel);
      
      const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
      app.listen(port, () => {
        resolve(); // HTTP server is listening, resolve the promise.
      });
    });
  }
  
  //
  // Application entry point.
  //
  function main() {
    return connectRabbit()                          // Connect to RabbitMQ...
    .then(messageChannel => {                   // then...
      return startHttpServer(messageChannel); // start the HTTP server.
    })
    .catch(error =>{
      console.error(error);
    }); 
  }
  
  main()
  .then(() => console.log("Microservice online."))
  .catch(err => {
    console.error("Microservice failed to start.");
    console.error(err && err.stack || err);
  });