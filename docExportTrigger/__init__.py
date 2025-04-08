import logging
import os
import json
import requests
from datetime import datetime
import azure.functions as func


def main(mytimer: func.TimerRequest) -> None:
    logging.info('Timer trigger function executed.')

    # Load the schedule configuration
    try:
        with open('schedule_config.json', 'r') as f:
            config = json.load(f)
            schedule = config.get('schedule')
            if not schedule:
                raise ValueError("No schedule found in schedule_config.json")
            logging.info(f"Using schedule from schedule_config.json: {schedule}")
    except (FileNotFoundError, ValueError) as e:
        logging.warning(f"Failed to load schedule configuration: {str(e)}. Skipping execution.")
        return

    # Check if the current time matches the schedule
    current_time = datetime.utcnow()
    if not matches_schedule(schedule, current_time):
        logging.info("Current time does not match the schedule. Skipping execution.")
        return

    # Call the start-migration endpoint
    try:
        backend_url = os.getenv('BACKEND_URL', 'http://127.0.0.1:5000')  # Backend URL from environment variables
        start_migration_url = f"{backend_url}/start-migration"

        logging.info(f"Triggering the start-migration endpoint at {start_migration_url}...")
        response = requests.get(start_migration_url, stream=True)  # Use stream=True for SSE

        if response.status_code == 200:
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    logging.info(f"Migration update: {line}")
        else:
            logging.error(f"Failed to trigger start-migration. Status code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        logging.error(f"An error occurred while triggering the start-migration endpoint: {str(e)}")


def matches_schedule(schedule: str, current_time: datetime) -> bool:
    """
    Check if the current time matches the given CRON schedule.
    """
    try:
        cron_parts = schedule.split()
        if len(cron_parts) != 6:
            raise ValueError("Invalid CRON expression. Expected 6 fields.")

        # Extract minute and hour fields
        cron_minute = cron_parts[1]
        cron_hour = cron_parts[2]

        # Match minute
        if cron_minute != "*":
            if "/" in cron_minute:  # Handle step values like */2
                step = int(cron_minute.split("/")[1])
                if current_time.minute % step != 0:
                    return False
            else:
                if int(cron_minute) != current_time.minute:
                    return False

        # Match hour
        if cron_hour != "*":
            if "/" in cron_hour:  # Handle step values like */2
                step = int(cron_hour.split("/")[1])
                if current_time.hour % step != 0:
                    return False
            else:
                if int(cron_hour) != current_time.hour:
                    return False

        # If both minute and hour match, return True
        return True
    except Exception as e:
        logging.error(f"Failed to parse CRON expression: {str(e)}")
        return False