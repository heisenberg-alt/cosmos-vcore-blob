import logging
import os
import json
import requests
from datetime import datetime
import azure.functions as func
from croniter import croniter  # Install this library for robust CRON parsing



def main(myTimer: func.TimerRequest) -> None:
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
    if not should_execute_now(schedule, current_time):
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


def should_execute_now(schedule: str, current_time: datetime) -> bool:
    """
    Check if the current time matches the given CRON schedule using croniter.
    """
    try:
        # Use croniter to parse the CRON expression
        cron = croniter(schedule, current_time)
        next_execution = cron.get_next(datetime)
        previous_execution = cron.get_prev(datetime)

        # Check if the current time is within the execution window
        if previous_execution <= current_time < next_execution:
            return True
        return False
    except Exception as e:
        logging.error(f"Failed to parse CRON expression: {str(e)}")
        return False