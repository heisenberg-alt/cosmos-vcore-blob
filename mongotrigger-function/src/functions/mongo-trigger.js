const { app } = require('@azure/functions');
const { exec } = require("child_process");
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config(); // Load environment variables from .env file

// MongoDB and Azure Blob Storage configuration from environment variables
const mongoUri = process.env.MONGO_URI;
const databaseName = process.env.DATABASE_NAME || "blob-test";
const collectionName = process.env.COLLECTION_NAME || "mycollection";
const blobStorageConnectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
const containerName = process.env.CONTAINER_NAME || "mongo-exports";
const blobName = process.env.BLOB_NAME || "export.json";

// Function to export MongoDB documents directly to Azure Blob Storage
function mongoTriggerFunction(context) {
    return new Promise((resolve, reject) => {
        try {
            // Initialize Azure Blob Storage client
            const blobServiceClient = BlobServiceClient.fromConnectionString(blobStorageConnectionString);
            const containerClient = blobServiceClient.getContainerClient(containerName);

            // Ensure the container exists
            containerClient.createIfNotExists().then(() => {
                context.log(`Container "${containerName}" is ready.`);

                const blobClient = containerClient.getBlockBlobClient(blobName);

                // Construct the mongoexport command
                const command = `mongoexport --uri="${mongoUri}" --db="${databaseName}" --collection="${collectionName}" --jsonArray`;
                context.log("Running command:", command);

                // Execute the mongoexport command
                const childProcess = exec(command, { maxBuffer: 1024 * 1024 * 50 }); // Increase buffer size if needed

                // Log errors from mongoexport
                childProcess.stderr.on("data", (data) => {
                    context.log(`Error output from mongoexport: ${data}`);
                });

                // Log the output from mongoexport
                childProcess.stdout.on("data", (data) => {
                    context.log(`Mongoexport output: ${data}`);
                });

                // Handle the close event of the mongoexport process
                childProcess.on("close", (code) => {
                    if (code === 0) {
                        context.log("Mongoexport process completed successfully. Starting upload to Azure Blob Storage...");

                        // Upload the output of mongoexport to Azure Blob Storage
                        blobClient.uploadStream(childProcess.stdout, 4 * 1024 * 1024, 20, {
                            onProgress: (progress) => {
                                context.log(`Uploaded ${progress.loadedBytes} bytes to Azure Blob Storage.`);
                            },
                        }).then(() => {
                            context.log(`MongoDB collection exported successfully to blob "${blobName}" in container "${containerName}".`);
                            resolve();
                        }).catch((uploadError) => {
                            context.log("Error uploading to Azure Blob Storage:", uploadError);
                            reject(uploadError);
                        });
                    } else {
                        const error = new Error(`Mongoexport process exited with code ${code}.`);
                        context.log(error.message);
                        reject(error);
                    }
                });
            }).catch((containerError) => {
                context.log("Error ensuring container exists:", containerError);
                reject(containerError);
            });
        } catch (error) {
            context.log("Unexpected error:", error);
            reject(error);
        }
    });
}

// Azure Function Timer trigger handler
app.timer('mongo-trigger', {
    schedule: '0 */2 * * * *', // Runs every 2 minutes
    handler: async (myTimer, context) => {
        const timeStamp = new Date().toISOString();
        context.log(`Timer trigger function ran at ${timeStamp}`);

        try {
            await mongoTriggerFunction(context);
            context.log("Export and upload completed successfully.");
        } catch (error) {
            context.log(`Error during export and upload process: ${error.message}`);
        }
    }
});
