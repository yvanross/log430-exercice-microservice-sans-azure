const express = require("express");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const amqp = require("amqplib");

if (!process.env.DBHOST) {
    throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
    throw new Error("Please specify the name of the database using environment variable DBNAME");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

//
// Connect to the database.
//
function connectDb() {
    return mongodb.MongoClient.connect(DBHOST) 
        .then(client => {
            return client.db(DBNAME);
        });
}

//
// Connect to the RabbitMQ server.
//
function connectRabbit() {

    console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);

    return amqp.connect(RABBIT) // Connect to the RabbitMQ server.
        .then(messagingConnection => {
            console.log("Connected to RabbitMQ.");

            return messagingConnection.createChannel(); // Create a RabbitMQ messaging channel.
        });
}

//
// Setup event handlers.
//
function setupHandlers(app, db, messageChannel) {

    const videosCollection = db.collection("videos");

    app.post("/viewed", (req, res) => { // Handle the "viewed" message via HTTP POST request.
        const videoPath = req.body.videoPath; // Read JSON body from HTTP request.
        videosCollection.insertOne({ videoPath: videoPath }) // Record the "view" in the database.
            .then(() => {
                console.log(`Added video ${videoPath} to history.`);
                res.sendStatus(200);
            })
            .catch(err => {
                console.error(`Error adding video ${videoPath} to history.`);
                console.error(err && err.stack || err);
                res.sendStatus(500);
            });
    });

    app.get("/history", (req, res) => {
        const skip = parseInt(req.query.skip);
        const limit = parseInt(req.query.limit);
        videosCollection.find()
            .skip(skip)
            .limit(limit)
            .toArray()
            .then(documents => {
                res.json({ history: documents });
            })
            .catch(err => {
                console.error(`Error retrieving history from database.`);
                console.error(err && err.stack || err);
                res.sendStatus(500);
            });
    });
    
    function consumeViewedMessage(msg) { // Handler for coming messages.
        console.log("Received a 'viewed' message");

        const parsedMsg = JSON.parse(msg.content.toString()); // Parse the JSON message.
        
        return videosCollection.insertOne({ videoPath: parsedMsg.videoPath }) // Record the "view" in the database.
            .then(() => {
                console.log("Acknowledging message was handled.");
                
                messageChannel.ack(msg); // If there is no error, acknowledge the message.
            });
    };

    return messageChannel.assertQueue("viewed", {}) // Assert that we have a "viewed" queue.
        .then(() => {
            console.log("Asserted that the 'viewed' queue exists.");

            return messageChannel.consume("viewed", consumeViewedMessage); // Start receiving messages from the "viewed" queue.
        });
}

//
// Start the HTTP server.
//
function startHttpServer(db, messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        app.use(bodyParser.json()); // Enable JSON body for HTTP requests.
        setupHandlers(app, db, messageChannel);

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
    console.log("Hello world!");

    return connectDb()                                          // Connect to the database...
        .then(db => {                                           // then...
            return connectRabbit()                              // connect to RabbitMQ...
                .then(messageChannel => {                       // then...
                    return startHttpServer(db, messageChannel); // start the HTTP server.
                });
        });
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });    