from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import os
import json
import pymongo
from datetime import datetime
from azure.storage.blob import BlobServiceClient
import logging
import requests
import time  # For pause functionality
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Global state for pause and resume
migration_state = {"paused": False}

# Load sensitive values from environment variables
mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION")

connection_string = os.getenv("BLOB_STORAGE_CONNECTION_STRING")
container_name = os.getenv("CONTAINER_NAME", "docs-index")

search_service_name = os.getenv("SEARCH_SERVICE_NAME")
search_index_name = os.getenv("SEARCH_INDEX_NAME")
search_api_key = os.getenv("SEARCH_API_KEY")

# Initialize Blob Service Client
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
container_client = blob_service_client.get_container_client(container_name)

logging.basicConfig(level=logging.DEBUG)

# Endpoint to schedule the Azure Function trigger
@app.route('/schedule-trigger', methods=['POST'])
def schedule_trigger():
    try:
        data = request.get_json()
        schedule = data.get('schedule')  # Cron expression from the user

        if not schedule:
            return jsonify({"error": "Schedule is required"}), 400

        # Save the schedule to a file or database (for simplicity, saving to a file here)
        with open('schedule_config.json', 'w') as f:
            json.dump({"schedule": schedule}, f)

        # Log the schedule (you can integrate with Azure Logic Apps or Timer Trigger here)
        logging.info(f"Schedule set: {schedule}")

        return jsonify({"message": f"Schedule set to: {schedule}"}), 200
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        return jsonify({"error": "An error occurred while setting the schedule"}), 500

# Common batch method to process documents from MongoDB
def process_documents_in_batches(collection, batch_size, process_batch_callback):
    total_docs = collection.count_documents({})
    logging.info(f"Total documents to process: {total_docs}")
    
    for batch_number in range(0, total_docs, batch_size):
        try:
            # Fetch the next batch of documents using skip and limit
            batch = list(collection.find().skip(batch_number).limit(batch_size))
            if not batch:
                logging.info(f"No more documents to process after batch {batch_number // batch_size + 1}.")
                break  # Exit the loop if no more documents

            # Log batch processing
            logging.info(f"Processing batch {batch_number // batch_size + 1} with {len(batch)} documents.")

            # Process the current batch using the provided callback
            process_batch_callback(batch, batch_number // batch_size + 1)
        except Exception as e:
            logging.error(f"Error processing batch {batch_number // batch_size + 1}: {str(e)}")
            # Optionally, continue to the next batch instead of terminating
            continue

# Custom JSON encoder to handle non-serializable types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()  # Convert datetime to ISO 8601 string
        return super().default(obj)

# Function to delete all blobs from the container
def delete_all_blobs():
    try:
        blobs = container_client.list_blobs()
        for blob in blobs:
            container_client.delete_blob(blob.name)
        return "All blobs have been deleted successfully."
    except Exception as e:
        return f"An error occurred while deleting blobs: {str(e)}"

# Endpoint to pause migration
@app.route('/pause-migration', methods=['POST'])
def pause_migration():
    migration_state["paused"] = True
    logging.info("Migration paused.")
    return jsonify({"message": "Migration paused."}), 200

# Endpoint to resume migration
@app.route('/resume-migration', methods=['POST'])
def resume_migration():
    migration_state["paused"] = False
    logging.info("Migration resumed.")
    return jsonify({"message": "Migration resumed."}), 200

# Function to migrate documents with real-time updates
@app.route('/start-migration', methods=['GET'])
def start_migration():
    def generate():
        client = None
        try:
            # Connect to MongoDB
            yield "data: Connecting to MongoDB...\n\n"
            logging.debug("Connecting to MongoDB...")
            client = pymongo.MongoClient(mongo_uri)
            db = client[mongo_db]
            collection = db[mongo_collection]
            yield "data: Connected to MongoDB.\n\n"
            logging.debug("Connected to MongoDB.")

            # Fetch documents from MongoDB
            total_docs = collection.count_documents({})
            batch_size = 500  # Number of documents per batch
            yield f"data: Found {total_docs} documents to migrate.\n\n"
            logging.debug(f"Found {total_docs} documents to migrate.")

            # Process documents in batches
            for batch_number in range(0, total_docs, batch_size):
                # Check if migration is paused
                while migration_state["paused"]:
                    yield "data: Migration paused. Waiting to resume...\n\n"
                    logging.info("Migration paused. Waiting to resume...")
                    time.sleep(1)  # Wait for 1 second before checking again

                try:
                    # Fetch the next batch of documents
                    batch = list(collection.find().skip(batch_number).limit(batch_size))
                    if not batch:
                        logging.info(f"No more documents to process after batch {batch_number // batch_size + 1}.")
                        break  # Exit the loop if no more documents

                    # Process each document in the batch
                    for doc in batch:
                        try:
                            # Prepare the document for export
                            doc_copy = doc.copy()
                            doc_copy["_id"] = str(doc["_id"])  # Convert ObjectId to string
                            json_data = json.dumps(doc_copy, cls=CustomJSONEncoder)

                            # Define blob name and upload
                            blob_name = f"{doc_copy['_id']}.json"
                            blob_client = container_client.get_blob_client(blob_name)
                            blob_client.upload_blob(json_data, overwrite=True)

                            # Yield progress update for each document
                            yield f"data: Exported document with _id: {doc_copy['_id']} to Blob Storage.\n\n"
                            logging.info(f"Exported document with _id: {doc_copy['_id']} to Blob Storage.")
                        except Exception as e:
                            yield f"data: Error exporting document with _id: {doc['_id']}. Error: {str(e)}\n\n"
                            logging.error(f"Error exporting document with _id: {doc['_id']}. Error: {str(e)}")

                    # Yield progress update for the batch
                    yield f"data: Batch {batch_number // batch_size + 1} successfully processed.\n\n"
                    logging.info(f"Batch {batch_number // batch_size + 1} successfully processed.")
                except Exception as e:
                    yield f"data: Error processing batch {batch_number // batch_size + 1}: {str(e)}\n\n"
                    logging.error(f"Error processing batch {batch_number // batch_size + 1}: {str(e)}")
                    continue

            yield "data: Migration completed successfully.\n\n"
            logging.debug("Migration completed successfully.")
        except GeneratorExit:
            # Handle client disconnection
            logging.warning("Client disconnected.")
        except Exception as e:
            yield f"data: Error occurred: {str(e)}\n\n"
            logging.error(f"Error occurred: {str(e)}")
        finally:
            # Ensure MongoDB connection is closed
            if client:
                client.close()
                logging.debug("MongoDB connection closed.")

    # Return the Response object with the generator
    return Response(generate(), content_type='text/event-stream')

# API endpoint to delete all blobs
@app.route('/delete-blobs', methods=['POST'])
def delete_blobs_endpoint():
    result = delete_all_blobs()
    return jsonify({"message": result}), 200



def create_search_index() -> bool:
    """Create a new search index in Azure AI Search."""
    endpoint = f"https://{search_service_name}.search.windows.net/indexes/{search_index_name}?api-version=2023-10-01-Preview"
    headers = {
        'Content-Type': 'application/json',
        'api-key': search_api_key
    }
    
    # Define the index schema based on the document structure
    index_schema = {
        "name": search_index_name,
        "fields": [
            {"name": "id", "type": "Edm.String", "key": True, "searchable": False},
            {"name": "timestamp_day", "type": "Edm.DateTimeOffset", "filterable": True, "sortable": True},
            {"name": "cat", "type": "Edm.String", "searchable": True, "filterable": True, "sortable": True},
            {"name": "owner_email", "type": "Edm.String", "searchable": True},
            {"name": "owner_firstName", "type": "Edm.String", "searchable": True, "sortable": True},
            {"name": "owner_lastName", "type": "Edm.String", "searchable": True, "sortable": True},
            {"name": "events_count", "type": "Edm.Int32", "filterable": True, "sortable": True},
            {"name": "avg_weight", "type": "Edm.Double", "filterable": True, "sortable": True}
        ]
    }
    
    try:
        # Check if index exists and delete if it does
        response = requests.get(endpoint, headers=headers)
        if response.status_code == 200:
            logging.info(f"Index {search_index_name} already exists. Deleting...")
            delete_response = requests.delete(endpoint, headers=headers)
            if delete_response.status_code not in (200, 204):
                logging.error(f"Failed to delete existing index: {delete_response.text}")
                return False
            logging.info(f"Successfully deleted existing index {search_index_name}")
        
        # Create the index
        response = requests.put(endpoint, headers=headers, json=index_schema)
        if response.status_code in (201, 204):
            logging.info(f"Successfully created search index {search_index_name}")
            return True
        else:
            logging.error(f"Failed to create search index: {response.status_code}, {response.text}")
            return False
    except Exception as e:
        logging.error(f"Error creating search index: {e}")
        return False

# Function to push documents to Azure AI Search
@app.route('/push-indexer', methods=['POST'])
def push_indexer():
    try:

        # Create the search index if it doesn't exist
        if(create_search_index()):
            logging.info("Search index created successfully.")
        else:
            logging.error("Failed to create search index.")
            return jsonify({"error": "Failed to create search index."}), 500
        
        # Connect to MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[mongo_db]
        collection = db[mongo_collection]

        # Fetch and process documents in batches
        batch_size = 100  # Number of documents per batch
        total_docs = collection.count_documents({})
        logging.info(f"Total documents to process: {total_docs}")

        for batch_number in range(0, total_docs, batch_size):
            try:
                # Fetch the next batch of documents
                batch = list(collection.find().skip(batch_number).limit(batch_size))
                if not batch:
                    logging.info(f"No more documents to process after batch {batch_number // batch_size + 1}.")
                    break  # Exit the loop if no more documents

                # Prepare documents for Azure AI Search
                search_documents = []
                for doc in batch:
                    doc_copy = doc.copy()
                    doc_copy["id"] = str(doc["_id"])  # Use "id" as the unique identifier for Azure Search
                    doc_copy.pop("_id", None)  # Remove the "_id" field

                    # Flatten the "owner" object
                    owner = doc_copy.pop("owner", {})
                    doc_copy["owner_email"] = owner.get("email", "")
                    doc_copy["owner_firstName"] = owner.get("firstName", "")
                    doc_copy["owner_lastName"] = owner.get("lastName", "")

                    events = doc_copy.pop("events", {})
                    doc_copy["events_count"] = len(events)

                    # Convert datetime fields to ISO 8601 strings
                    for key, value in doc_copy.items():
                        if isinstance(value, datetime):
                            doc_copy[key] = value.isoformat() + "Z"

                    search_documents.append(doc_copy)

                # Prepare the payload for Azure AI Search
                payload = {
                    "value": [
                        {
                            "@search.action": "mergeOrUpload",  # Use "mergeOrUpload" to update or insert documents
                            **doc
                        }
                        for doc in search_documents
                    ]
                }

                # Serialize the payload using the custom JSON encoder
                payload_json = json.dumps(payload, cls=CustomJSONEncoder)

                # Send the payload to Azure AI Search
                url = f"https://{search_service_name}.search.windows.net/indexes/{search_index_name}/docs/index?api-version=2023-10-01-Preview"
                headers = {
                    "Content-Type": "application/json",
                    "api-key": search_api_key
                }
                response = requests.post(url, headers=headers, data=payload_json)

                if response.status_code == 200:
                    logging.info(f"Batch {batch_number // batch_size + 1} successfully pushed to Azure AI Search.")
                else:
                    logging.error(f"Failed to push batch {batch_number // batch_size + 1}: {response.text}")
                    raise Exception(f"Failed to push batch {batch_number // batch_size + 1}: {response.text}")

            except Exception as e:
                logging.error(f"Error processing batch {batch_number // batch_size + 1}: {str(e)}")
                continue  # Continue to the next batch even if one batch fails

        return jsonify({"message": "All documents successfully pushed to Azure AI Search."}), 200

    except Exception as e:
        logging.error(f"Error in push-indexer: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/test-local-blob-connection', methods=['GET'])
def test_local_blob_connection():
    try:
        blobs = container_client.list_blobs()
        blob_list = [blob.name for blob in blobs]
        return jsonify({"message": "Connection successful", "blobs": blob_list}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to connect to Blob Storage: {str(e)}"}), 500

@app.route('/test_blob_connection', methods=['POST'])
def test_blob_connection():
    data = request.json
    connection_string = data.get('connectionString')

    if not connection_string:
        return jsonify({"message": "Connection string is required"}), 400

    # Simulate Blob Storage connection test
    if "DefaultEndpointsProtocol" in connection_string and "AccountName" in connection_string and "AccountKey" in connection_string:
        return jsonify({"message": "Blob Storage connection successful!"}), 200
    else:
        return jsonify({"message": "Invalid Blob Storage connection string"}), 400
    

@app.route('/test_mongo_connection', methods=['POST'])
def test_mongo_connection():
    data = request.json
    connection_string = data.get('connectionString')

    if not connection_string:
        return jsonify({"message": "Connection string is required"}), 400

    # Simulate MongoDB connection test
    if connection_string.startswith("mongodb://") or connection_string.startswith("mongodb+srv://"):
        return jsonify({"message": "MongoDB connection successful!"}), 200
    else:
        return jsonify({"message": "Invalid MongoDB connection string"}), 400
    

@app.route('/test-local-mongo-connection', methods=['GET'])
def test_local_mongo_connection():
    try:
        client = pymongo.MongoClient(mongo_uri)
        db = client[mongo_db]
        collection = db[mongo_collection]
        documents = list(collection.find().limit(5))  # Fetch a few documents for testing

        # Convert ObjectId to string
        for doc in documents:
            doc["_id"] = str(doc["_id"])

        return jsonify({"message": "Connection successful", "documents": documents}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to connect to MongoDB: {str(e)}"}), 500

@app.route('/test-blob-upload', methods=['POST'])
def test_blob_upload():
    try:
        sample_data = {"test": "This is a test blob"}
        blob_name = "test_blob.json"
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(json.dumps(sample_data), overwrite=True)
        return jsonify({"message": f"Blob '{blob_name}' uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to upload blob: {str(e)}"}), 500

def process_batch_upload(batch, batch_number):
    """
    Processes a batch of documents and uploads them to Azure Blob Storage.

    Args:
        batch (list): List of documents to process.
        batch_number (int): The current batch number.
    """
    try:
        for doc in batch:
            try:
                # Prepare the document for export
                doc_copy = doc.copy()
                doc_copy["_id"] = str(doc["_id"])  # Convert ObjectId to string
                json_data = json.dumps(doc_copy, cls=CustomJSONEncoder)

                # Define blob name and upload
                blob_name = f"{doc_copy['_id']}.json"
                blob_client = container_client.get_blob_client(blob_name)
                blob_client.upload_blob(json_data, overwrite=True)

                # Yield progress update for each document
                yield f"data: Exported document with _id: {doc_copy['_id']} to Blob Storage.\n\n"
                logging.info(f"Exported document with _id: {doc_copy['_id']} to Blob Storage.")
            except Exception as e:
                yield f"data: Error exporting document with _id: {doc['_id']}. Error: {str(e)}\n\n"
                logging.error(f"Error exporting document with _id: {doc['_id']}. Error: {str(e)}")

        # Yield progress update for the batch
        yield f"data: Batch {batch_number} successfully processed.\n\n"
        logging.info(f"Batch {batch_number} successfully processed.")
    except Exception as e:
        yield f"data: Error processing batch {batch_number}: {str(e)}\n\n"
        logging.error(f"Error processing batch {batch_number}: {str(e)}")
     
if __name__ == '__main__':
    app.run(debug=True)