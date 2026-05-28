# backend/app/services/__init__.py
from .alert_service import queue_alerts_for_notice
from .embedding_service import update_missing_embeddings
