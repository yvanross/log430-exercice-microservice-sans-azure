//
// An example of running integration tests against the "metadata" microservice using Jest.
//

// docker-compose up # to start test database
const axios = require("axios");
const mongodb = require("mongodb");

describe("metadata microservice", () => {
    
    const BASE_URL = "http://localhost:3000"; // Base URL for our HTTP server.
    const DBHOST = "mongodb://localhost:27017"; // Have the database running on this computer.
    const DBNAME = "testdb";

    //
    // Import the module we are testing.
    //

    const { startMicroservice } = require("./index"); 

    //
    // Setup the HTTP server.
    //

    let microservice; // Saves a reference to the our microservice object.

    beforeAll(async () => {
        microservice = await startMicroservice(DBHOST, DBNAME); // Start server before all tests.
    });

    afterAll(async () => {
        await microservice.close();  // Close server after all tests.
    });

    //
    // Wrapper function for doing a HTTP GET request so that we don't have to repeat the base URL 
    // across multiple tests.
    //
    function httpGet(route) {
        const url = `${BASE_URL}${route}`;
        console.log(`Requesting ${url}`);
        return axios.get(url);
    }

    // 
    // Helper function to load a database fixture into our database.
    //
    async function loadDatabaseFixture(collectionName, records) {
        // you need to run docker-compose up in metadata directory to start testdb
        await microservice.db.dropDatabase(); // Reset the test database.

        const collection = microservice.db.collection(collectionName);
        await collection.insertMany(records); // Insert the database fixture.
    }
    
    //
    // Tests go here.
    //
    
    test("/videos route retrieves data via videos collection", async () => {

        const id1 = new mongodb.ObjectId();
        const id2 = new mongodb.ObjectId();
        const videoPath1 = "my-video-1.mp4";
        const videoPath2 = "my-video-2.mp4";

        const testVideos = [
            {
                _id: id1,
                videoPath: videoPath1
            },
            {
                _id: id2,
                videoPath: videoPath2
            },
        ];

        // Load database fixture into the database.
        await loadDatabaseFixture("videos", testVideos);
        
        const response = await httpGet("/videos");  // Make a request to the videos route.
        expect(response.status).toEqual(200);       // Expect HTTP status code 200 (ok).

        const videos = response.data.videos;        // Check the videos retrieved are the ones we put in the database.
        expect(videos.length).toEqual(2);
        expect(videos[0]._id).toEqual(id1.toString());
        expect(videos[0].videoPath).toEqual(videoPath1);
        expect(videos[1]._id).toEqual(id2.toString());
        expect(videos[1].videoPath).toEqual(videoPath2);
    });

});