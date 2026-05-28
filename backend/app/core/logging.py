import logging
import sys

def setup_logging():
    """
    Centralized logging configuration for the Azan application.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
        force=True  # Ensure this config overrides any existing basicConfig
    )
    
    # You can add more specific logger configurations here if needed
    # logging.getLogger("azan.db").setLevel(logging.DEBUG)
