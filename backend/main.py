from bson import ObjectId
import urllib.parse
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import numpy as np
from PIL import Image
import io
import tensorflow as tf
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

app = FastAPI()

# --- MONGODB ATLAS CONNECTION ---
# 1. Your raw password
raw_password = "arogya@123" 
# 2. Encoding the '@' so MongoDB doesn't crash
encoded_password = urllib.parse.quote_plus(raw_password)

# 3. Your exact connection string from the screenshot
MONGO_URL = f"mongodb+srv://arogya_db_user:{encoded_password}@cluster0.9vfgmxa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = AsyncIOMotorClient(MONGO_URL)
# In your APP-specific backend:
db = client.arogya_app  # This name will automatically appear in Atlas after your first scan
scan_collection = db.get_collection("mobile_scans")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load AI Model (arogya_anemia_model.keras)
print("Loading Arogya-Sync AI Model...")
try:
    model = tf.keras.models.load_model("arogya_anemia_model.keras", compile=False)
    print("✅ AI Brain Online and Ready!")
except Exception as e:
    print(f"❌ ERROR LOADING MODEL: {e}")
    model = None

def prepare_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    # Using MobileNetV2 preprocessing as per project requirements
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    return img_array

# --- ENDPOINT 1: AI ANALYSIS + CLOUD SAVE ---
@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="AI model not loaded.")
    try:
        contents = await file.read()
        processed_image = prepare_image(contents)

        # Run the AI Prediction
        prediction = model.predict(processed_image)[0][0]

        # Diagnosis Logic
        if prediction < 0.5:
            res, risk = "Anemia Detected", "High Risk"
            conf = float(round(float((1 - prediction) * 100), 1))
            rec = "Prescribe Iron Folic Acid (IFA) tablets and recommend an iron-rich diet."
        else:
            res, risk = "No Anemia Detected", "Low Risk (Normal)"
            conf = float(round(float(prediction * 100), 1))
            rec = "Patient is cleared. Maintain standard diet and regular checkups."

        # SAVE TO CLOUD (MongoDB Atlas)
        scan_record = {
            "timestamp": datetime.now(),
            "diagnosis": res,
            "risk_level": risk,
            "confidence_score": conf,
            "recommendation": rec
        }
        
        # Insert into MongoDB
        result = await scan_collection.insert_one(scan_record)
        
        # --- THE FIX ---
        # We must convert the MongoDB '_id' and 'timestamp' to strings 
        # so FastAPI can send them to React without crashing.
        scan_record["_id"] = str(result.inserted_id)
        scan_record["timestamp"] = scan_record["timestamp"].strftime("%d %b %Y, %H:%M")
        
        return {"status": "success", **scan_record}

    except Exception as e:
        print(f"Analysis error: {e}")
        return {"status": "error", "message": str(e)}

# --- ENDPOINT 2: REAL-TIME HISTORY FOR DASHBOARD ---
@app.get("/api/history")
async def get_history():
    history_list = []
    # Fetching real data for the Dashboard
    async for entry in scan_collection.find().sort("timestamp", -1).limit(50):
        # Convert ObjectId to string
        entry["_id"] = str(entry["_id"])
        # Ensure timestamp is a formatted string
        if isinstance(entry["timestamp"], datetime):
            entry["timestamp"] = entry["timestamp"].strftime("%d %b %Y, %H:%M")
        history_list.append(entry)
    return history_list

# --- ENDPOINT 3: PDF REPORT ---
@app.post("/api/report")
async def generate_report(data: dict):
    try:
        # Create unique filename
        filename = f"Arogya_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(os.getcwd(), filename)
        
        c = canvas.Canvas(filepath, pagesize=letter)
        
        # --- PDF HEADER ---
        c.setFont("Helvetica-Bold", 22)
        c.setFillColorRGB(0.1, 0.3, 0.6)
        c.drawString(100, 750, "Arogya-Sync: AI Diagnostic Report")
        c.line(100, 740, 512, 740)
        
        # --- PATIENT DATA ---
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 12)
        c.drawString(100, 700, f"Date: {datetime.now().strftime('%d %B %Y')}")
        
        # FIX: Check for both 'diagnosis' (from MongoDB) and 'disease_detected' (from AI)
        diagnosis_text = data.get('disease_detected') or data.get('diagnosis') or "Data Missing"
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(100, 660, f"Result: {diagnosis_text}")
        
        c.setFont("Helvetica", 12)
        c.drawString(100, 640, f"Risk Category: {data.get('risk_level', 'N/A')}")
        c.drawString(100, 620, f"AI Confidence Score: {data.get('confidence_score', '0')}%")
        
        # --- RECOMMENDATION ---
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 580, "Health Recommendation:")
        
        c.setFont("Helvetica-Oblique", 11)
        text_object = c.beginText(100, 560)
        text_object.setFont("Helvetica-Oblique", 11)
        text_object.setLeading(14)
        text_object.textLines(data.get('recommendation', 'Please consult a doctor for further advice.'))
        c.drawText(text_object)
        
        c.save()
        return FileResponse(path=filepath, filename=filename, media_type='application/pdf')
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return {"status": "error", "message": str(e)}
    
    # --- ENDPOINT 4: DELETE A SPECIFIC RECORD ---
@app.delete("/api/history/{record_id}")
async def delete_record(record_id: str):
    try:
        # Check if the ID is a valid 24-character hex string
        if not ObjectId.is_valid(record_id):
            raise HTTPException(status_code=400, detail="Invalid ID format")

        # Attempt to delete the specific document
        result = await scan_collection.delete_one({"_id": ObjectId(record_id)})
        
        if result.deleted_count == 1:
            print(f"🗑️ Record {record_id} deleted successfully")
            return {"status": "success"}
        else:
            # This triggers the 404 you saw if the record doesn't exist in MongoDB
            print(f"⚠️ Record {record_id} not found in database")
            raise HTTPException(status_code=404, detail="Record not found")
            
    except Exception as e:
        print(f"❌ Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)