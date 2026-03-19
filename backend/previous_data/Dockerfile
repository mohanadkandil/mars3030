
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir requests

# Copy only the necessary files
# Assumes build context is the project root
COPY backend/previous_data/grab_mars_data.py /app/
COPY backend/previous_data/grab_locations.py /app/backend/previous_data/

# Run the script
# The output CSV will be inside the container. 
# To get it out, use: docker run -v $(pwd):/app mars-data-grabber
CMD ["python", "grab_mars_data.py"]
