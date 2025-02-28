#!/bin/bash

# Define the .env file path
ENV_FILE=".env"

# Create the .env file
touch $ENV_FILE

# Add environment variables to the .env file
echo "MY_VARIABLE=value" >> $ENV_FILE
echo "ANOTHER_VARIABLE=another_value" >> $ENV_FILE
echo "DATABASE_URL=your_database_url" >> $ENV_FILE

# Print a message indicating the .env file has been created
echo ".env file created successfully with the specified environment variables."