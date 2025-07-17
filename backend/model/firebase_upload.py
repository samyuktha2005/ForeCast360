import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import time

# 🔥 Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate("model/service-account.json")
    firebase_admin.initialize_app(cred)
    print("✅ Firebase connected successfully!")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    exit()

# 🔥 Connect to Firestore
db = firestore.client()
collection_name = "weather_data"
csv_file_path = "model/jena_climate_2009_2016.csv"

# 🔥 Load CSV
try:
    df = pd.read_csv(csv_file_path)
    print(f"✅ CSV file '{csv_file_path}' loaded successfully!")
except FileNotFoundError:
    print(f"❌ CSV file '{csv_file_path}' not found!")
    exit()

# 🔥 Clean Column Names
df.columns = df.columns.str.strip()
if "Date Time" in df.columns:
    df = df.rename(columns={"Date Time": "date_time"})

df = df.dropna()  # Remove NaNs

# 🔥 Resume Upload from row 20002
start_row = 20002
batch_size = 500  # Firestore batch limit
retry_delay = 1  # Initial retry delay

print(f"📤 Resuming data upload from row {start_row}...")

# 🔥 Upload in Batches
for i in range(start_row, len(df), batch_size):
    batch = db.batch()
    end_row = min(i + batch_size, len(df))

    for index in range(i, end_row):
        doc_ref = db.collection(collection_name).document(str(index))
        batch.set(doc_ref, df.iloc[index].to_dict())

    # 🔥 Commit Batch with Retry Logic
    retry_count = 0
    while retry_count < 5:
        try:
            batch.commit()
            print(f"✅ Uploaded rows {i} to {end_row - 1}")
            time.sleep(1)  # Prevent hitting Firestore quota
            break  # Exit retry loop
        except Exception as e:
            print(f"❌ Error uploading rows {i}-{end_row-1}: {e}")
            retry_count += 1
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential Backoff

print("🎉 Data upload complete!")
