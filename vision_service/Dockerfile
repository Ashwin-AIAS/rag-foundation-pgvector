FROM python:3.11-slim

# Install system dependencies required by OpenCV and EasyOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 300 --retries 5 -r requirements.txt

COPY app/ ./app/

# Pre-download YOLO26n weights at build time so runtime is instant
# This bakes the model into the image layer (cached by Docker)
RUN python -c "from ultralytics import YOLO; YOLO('yolo26n.pt')" || \
    echo "YOLO26n pre-download attempted (may fail without network — will retry at runtime)"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
