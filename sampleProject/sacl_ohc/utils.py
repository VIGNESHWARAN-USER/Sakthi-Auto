from datetime import date
from dateutil.parser import parse, ParserError
from dateutil.relativedelta import relativedelta

def parse_date_internal(date_str: str):
    """
    Parses a date string (e.g., "YYYY-MM-DD") and returns a date object.
    Returns None if the format is invalid.
    """
    if not date_str:
        return None
    try:
        # The parse function from dateutil is robust and can handle various formats.
        return parse(date_str).date()
    except (ParserError, TypeError):
        return None

def get_next_due_date(calibration_date_str: str, freq: str):
    """
    Calculates the next due date based on a start date and a frequency string.
    """
    start_date = parse_date_internal(calibration_date_str)
    if not start_date or not freq:
        return None

    normalized_freq = freq.strip().lower()

    delta = None
    if normalized_freq == "monthly":
        delta = relativedelta(months=+1)
    elif normalized_freq == "once in 2 months":
        delta = relativedelta(months=+2)
    elif normalized_freq == "quarterly":
        delta = relativedelta(months=+3)
    elif normalized_freq == "half-yearly":
        delta = relativedelta(months=+6)
    elif normalized_freq == "yearly":
        delta = relativedelta(years=+1)
    elif normalized_freq == "once in 2 years":
        delta = relativedelta(years=+2)
    
    if delta:
        return start_date + delta
    else:
        # Return None if the frequency string is not supported
        return None