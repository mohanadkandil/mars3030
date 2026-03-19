
import requests
import datetime
import time
import csv
import os

def get_locations_from_file(file_path):
    """
    Parses the locations dictionary from a Python file.
    """
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        content = f.read()
    
    local_scope = {}
    try:
        exec(content, {}, local_scope)
        locations_dict = local_scope.get('locations', {})
        formatted_locations = []
        for name, coords in locations_dict.items():
            formatted_locations.append({
                'name': name,
                'lat': coords.get('latitude', 0.0),
                'lon': coords.get('longitude', 0.0)
            })
        return formatted_locations
    except Exception as e:
        print(f"Error parsing locations from {file_path}: {e}")
        return []

def get_mars_details(lat, lon, date_str):
    url = "https://psg.gsfc.nasa.gov/api.php"
    payload = {
        'type': 'cfg',
        'wephm': 'y',
        'watm': 'y',
        'file': (
            f"<OBJECT-NAME>Mars\n"
            f"<OBJECT-DATE>{date_str}\n"
            f"<GEOMETRY-OBS-LAT>{lat}\n"
            f"<GEOMETRY-OBS-LON>{lon}\n"
            f"<GEOMETRY>Nadir\n"
            f"<ATMOSPHERE-STRUCTURE>MCD\n"
            f"<ATMOSPHERE-GASSES>CO2,H2O"
        )
    }
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = requests.post(url, data=payload, timeout=45)
            text = response.text
            
            if "Your other API call is still running" in text:
                print(f"API Rate limited. Waiting 60 seconds (Attempt {attempt+1}/{max_retries})...")
                time.sleep(60)
                continue
                
            if response.status_code == 200 and "<OBJECT-NAME>Mars" in text:
                return text
            else:
                print(f"Unexpected response or status {response.status_code} at {date_str}")
                time.sleep(5)
        except Exception as e:
            print(f"Request exception: {e}")
            time.sleep(10)
            
    return None

def parse_psg_response(response_text):
    if not response_text:
        return None
    
    data = {}
    lines = response_text.split('\n')
    
    # Initialize with None to identify missing fields
    data['temperature_k'] = None
    data['pressure_mbar'] = None
    data['co2_mixing_ratio'] = None
    data['h2o_mixing_ratio'] = None

    for line in lines:
        line = line.strip()
        if line.startswith('<SURFACE-TEMPERATURE>'):
            data['temperature_k'] = line.replace('<SURFACE-TEMPERATURE>', '').strip()
        elif line.startswith('<ATMOSPHERE-PRESSURE>'):
            data['pressure_mbar'] = line.replace('<ATMOSPHERE-PRESSURE>', '').strip()
        elif line.startswith('<ATMOSPHERE-LAYER-1>'):
            # Structure: Alt, Temp, Pres, ... (based on ATMOSPHERE-LAYERS-MOLECULES)
            # Actually, the columns depend on the gases requested.
            # Let's try to parse the column headers if possible, or use a heuristic.
            parts = line.replace('<ATMOSPHERE-LAYER-1>', '').strip().split(',')
            # From previous debug: CO2 index 3, H2O index 7 (if Alt, Wu, Wv are first)
            # Let's look for ATMOSPHERE-LAYERS-MOLECULES line
            pass

    # Secondary check for temperature in layer 1 if SURFACE-TEMPERATURE is missing
    for line in lines:
        if line.startswith('<ATMOSPHERE-LAYER-1>'):
            parts = line.replace('<ATMOSPHERE-LAYER-1>', '').strip().split(',')
            if len(parts) >= 2 and data['temperature_k'] is None:
                data['temperature_k'] = parts[1] # Usually Temp is index 1
            if len(parts) >= 8:
                # Based on: Altitude,Windu,Windv,CO2,N2,O2,CO,H2O,O3...
                # Index 3: CO2, Index 7: H2O
                data['co2_mixing_ratio'] = parts[3]
                data['h2o_mixing_ratio'] = parts[7]

    return data

def main():
    locations_file = 'backend/previous_data/grab_locations.py'
    locations = get_locations_from_file(locations_file)
    if not locations:
        print("No locations found.")
        return

    # Start from 2 years ago
    start_date = datetime.datetime.now() - datetime.timedelta(days=730)
    end_date = datetime.datetime.now()
    
    # Sequential processing to avoid API blocks
    output_file = 'mars_weather_data.csv'
    
    # Check if file exists to append or write header
    file_exists = os.path.isfile(output_file)
    
    with open(output_file, 'a', newline='') as csvfile:
        fieldnames = ['timestamp', 'location_name', 'latitude', 'longitude', 'temperature_k', 'pressure_mbar', 'co2_mixing_ratio', 'h2o_mixing_ratio']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        
        # To avoid being blocked, we'll process day by day, few locations at a time
        # Given 100 req/day limit, we can't do hourly for all locations.
        # Let's do Daily for all locations instead.
        
        current_time = start_date
        while current_time <= end_date:
            timestamp_str = current_time.strftime("%Y/%m/%d %H:%M")
            print(f"--- Processing Day: {timestamp_str} ---")
            
            for loc in locations:
                print(f"Fetching {loc['name']}...")
                resp = get_mars_details(loc['lat'], loc['lon'], timestamp_str)
                weather_data = parse_psg_response(resp)
                
                if weather_data:
                    weather_data['timestamp'] = timestamp_str
                    weather_data['location_name'] = loc['name']
                    weather_data['latitude'] = loc['lat']
                    weather_data['longitude'] = loc['lon']
                    writer.writerow(weather_data)
                    csvfile.flush()
                
                # Minimum 10 seconds between requests to be safe
                time.sleep(15)
            
            # Move to next day
            current_time += datetime.timedelta(days=1)

    print(f"Finished! Data saved to {output_file}")

if __name__ == "__main__":
    main()
