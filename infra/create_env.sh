#!/bin/bash

# Variables
SUBSCRIPTION_ID=$1
LOCATION=$2
RESOURCE_GROUP=$3

# Define the .env file path
ENV_FILE=".env"

# Create the .env file
touch $ENV_FILE

# Add environment variables to the .env file
echo "SUBSCRIPTION_ID=${SUBSCRIPTION_ID}" >> $ENV_FILE
echo "LOCATION=${LOCATION}" >> $ENV_FILE
echo "RESOURCE_GROUP=${RESOURCE_GROUP}" >> $ENV_FILE

# Print a message indicating the .env file has been created
echo ".env file created successfully with the specified environment variables."