from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from database.mongodb import db
from utils.excel_loader import load_fantasy_sheet
from models.fantasy_sheet import FantasySheet
from typing import List
import logging
import sys
import os
from pathlib import Path
import json

# Add the project root directory to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from utils.har_processor import (
    process_har_file,
    get_player_cards_data,
    get_marketplace_data
)
import tempfile
import os

# Set up logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fantasy Sports API",
    description="API for managing fantasy sports player data",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await db.connect()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.disconnect()

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head>
            <title>Fantasy Sports API</title>
        </head>
        <body>
            <h1>Fantasy Sports API</h1>
            <p>Available endpoints:</p>
            <ul>
                <li><a href="/docs">/docs</a> - Interactive API documentation</li>
                <li><a href="/all_cards">/all_cards</a> - Get all cards</li>
                <li>POST /import-sheet - Import Excel sheet data</li>
            </ul>
        </body>
    </html>
    """

@app.post("/import-sheet")
async def import_sheet():
    try:
        logger.info("Starting to load Excel file...")
        records = load_fantasy_sheet("raw_data/FantasySheets.xlsx")
        logger.info(f"Loaded {len(records)} records from Excel")
        
        if not records:
            raise HTTPException(status_code=400, detail="No records found in Excel file")
        logger.info(f"Records: {records}")
        
        # Drop the collection to avoid duplicates
        await db.client['fantasy_db']['fantasy_sheets'].drop()
        
        inserted_ids = await db.insert_many(records)
        logger.info(f"Successfully inserted {len(inserted_ids)} records into MongoDB")
        return {
            "message": f"Successfully imported {len(inserted_ids)} records",
            "record_count": len(inserted_ids)
        }
    except FileNotFoundError:
        logger.error("Excel file not found")
        raise HTTPException(status_code=404, detail="Excel file not found")
    except Exception as e:
        logger.error(f"Error during import: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def get_status():
    return {"status": "ok"}

@app.get("/all_cards", response_model=List[FantasySheet])
async def get_all_cards(skip: int = 0, limit: int = 1000):
    try:
        logger.info(f"Fetching cards with skip={skip}, limit={limit}")
        players = await db.get_all(skip=skip, limit=limit)
        logger.info(f"Found {len(players)} cards")
        return players
    except Exception as e:
        logger.error(f"Error fetching cards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/all_cards/{hero_id}", response_model=FantasySheet)
async def get_card_by_hero_id(hero_id: str):
    try:
        logger.info(f"Fetching card with hero_id: {hero_id}")
        collection = db.client['fantasy_db']['fantasy_sheets']
        
        # Query the card by hero_id
        card = await collection.find_one({"hero_id": hero_id})
        
        if not card:
            logger.error(f"Card with hero_id {hero_id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"Card with hero_id {hero_id} not found"
            )
            
        logger.info(f"Found card: {card}")
        return card
        
    except Exception as e:
        logger.error(f"Error fetching card by hero_id: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-har")
async def process_har_upload(file: UploadFile = File(...)):
    try:
        # Create a temporary file to store the uploaded HAR
        with tempfile.NamedTemporaryFile(delete=False, suffix='.har') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            # Process the HAR file
            har_data = process_har_file(temp_file.name)
            
            # Get player cards data
            player_cards = get_player_cards_data(har_data)
            
            # Clean up the temporary file
            os.unlink(temp_file.name)
            
            if player_cards:
                # Format cards with required fields
                formatted_cards = []
                for card in player_cards:
                    formatted_card = {
                        **card,
                        'stars': card.get('stars', 1),  # Default to 1 star if not present
                        'medianLast4': card.get('medianLast4', 0)  # Default to 0 if not present
                    }
                    formatted_cards.append(formatted_card)
                
                # Save to MongoDB
                collection = db.client['fantasy_db']['player_cards']
                # Clear existing cards
                await collection.delete_many({})
                # Insert new cards
                insert_result = await collection.insert_many(formatted_cards)
                
                # Get the inserted documents with their IDs
                inserted_docs = await collection.find(
                    {'_id': {'$in': insert_result.inserted_ids}}
                ).to_list(None)
                
                # Convert ObjectIds to strings in the response
                formatted_docs = [{
                    **doc,
                    '_id': str(doc['_id'])
                } for doc in inserted_docs]
                
                return {
                    "success": True,
                    "message": f"Successfully uploaded {len(formatted_docs)} cards",
                    "data": {
                        "player_cards": formatted_docs
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "No player cards found in HAR file"
                }
                
    except Exception as e:
        logger.error(f"Error processing HAR file: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/player_cards")
async def get_player_cards():
    try:
        logger.info("Fetching player cards from MongoDB")
        collection = db.client['fantasy_db']['player_cards']
        
        # Query all player cards
        cursor = collection.find({})
        cards = await cursor.to_list(length=None)
        
        if not cards:
            logger.info("No player cards found in database, returning default cards")
            # Return default cards if none exist in database
            default_cards = [
                {
                    "_id": "1",
                    "name": "Default Hero 1",
                    "stars": 2,
                    "medianLast4": 10,
                    "hero_rarity_index": 4,  # Common
                    "picture": "https://placehold.co/200x200?text=Hero+1"
                },
                {
                    "_id": "2",
                    "name": "Default Hero 2",
                    "stars": 3,
                    "medianLast4": 15,
                    "hero_rarity_index": 3,  # Rare
                    "picture": "https://placehold.co/200x200?text=Hero+2"
                },
                {
                    "_id": "3",
                    "name": "Default Hero 3",
                    "stars": 4,
                    "medianLast4": 20,
                    "hero_rarity_index": 2,  # Epic
                    "picture": "https://placehold.co/200x200?text=Hero+3"
                }
            ]
            # Insert default cards into database
            await collection.insert_many(default_cards)
            return default_cards
        
        # Convert ObjectIds to strings in the response
        formatted_cards = [{
            **card,
            '_id': str(card['_id'])
        } for card in cards]
        
        logger.info(f"Found {len(formatted_cards)} player cards")
        return formatted_cards
        
    except Exception as e:
        logger.error(f"Error fetching player cards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))