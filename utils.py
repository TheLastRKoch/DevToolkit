from datetime import datetime
import traceback


def log(type, message, description):
    date = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S")
    if description is None:
        description = str(traceback.format_exc()).replace("\n", "")
    print(f"{'{'} {date}, {type}, {message}, {description} {'}'}")
