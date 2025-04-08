import os
import json
import pymongo
from azure.storage.blob import BlobServiceClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection details from environment variables
mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION")

# Azure Blob Storage connection details from environment variables
connection_string = os.getenv("BLOB_STORAGE_CONNECTION_STRING")
container_name = os.getenv("CONTAINER_NAME", "docs-index")

# Initialize Blob Service Client
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
container_client = blob_service_client.get_container_client(container_name)

# Custom JSON encoder to handle non-serializable types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()  # Convert datetime to ISO 8601 string
        return super().default(obj)

# Function to delete all blobs from the container
def delete_all_blobs():
    print(f"Deleting all blobs from the container: {container_name}...")
    try:
        # List all blobs in the container
        blobs = container_client.list_blobs()
        for blob in blobs:
            print(f"Deleting blob: {blob.name}")
            container_client.delete_blob(blob.name)
        print("All blobs have been deleted successfully.")
    except Exception as e:
        print(f"An error occurred while deleting blobs: {str(e)}")

# Function to migrate documents
def migrate_documents():
    print("Starting document migration...")
    documents = collection.find()
    for doc in documents:
        # Convert MongoDB document to JSON
        doc_copy = doc.copy()
        doc_copy["_id"] = str(doc["_id"])  # Convert ObjectId to string
        json_data = json.dumps(doc_copy, cls=CustomJSONEncoder)  # Use custom encoder

        # Define blob name
        blob_name = f"{doc_copy['_id']}.json"
        blob_client = container_client.get_blob_client(blob_name)

        # Upload JSON document to Azure Blob Storage
        print(f"Uploading document with _id: {doc_copy['_id']} to blob: {blob_name}")
        blob_client.upload_blob(json_data, overwrite=True)

    print("Document migration completed.")

# Connect to MongoDB
print("Connecting to MongoDB...")
client = pymongo.MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]
print("Connected to MongoDB.")

# Trigger the deletion of all blobs
delete_all_blobs()

# Trigger the migration
migrate_documents()

