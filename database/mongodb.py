from motor.motor_asyncio import AsyncIOMotorClient
from models.fantasy_sheet import FantasySheet
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    database_name: str = "fantasy_db"
    collection_name: str = "fantasy_sheets"

    async def connect(self):
        try:
            logger.info("Connecting to MongoDB...")
            self.client = AsyncIOMotorClient("mongodb://localhost:27017")
            # Verify connection
            await self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
        
    async def disconnect(self):
        try:
            if self.client:
                self.client.close()
                logger.info("Disconnected from MongoDB")
        except Exception as e:
            logger.error(f"Error disconnecting from MongoDB: {str(e)}")

    async def get_collection(self):
        if not self.client:
            raise Exception("MongoDB client not connected")
        return self.client[self.database_name][self.collection_name]

    async def insert_many(self, records: list[dict]):
        if not records:
            raise ValueError("No records provided for insertion")
            
        try:
            collection = await self.get_collection()
            logger.info(f"Attempting to insert {len(records)} records")
            result = await collection.insert_many(records)
            logger.info(f"Successfully inserted {len(result.inserted_ids)} records")
            return result.inserted_ids
        except Exception as e:
            logger.error(f"Error inserting records: {str(e)}")
            raise

    async def get_all(self, skip: int = 0, limit: int = 100):
        try:
            collection = await self.get_collection()
            cursor = collection.find({}).skip(skip).limit(limit)
            results = await cursor.to_list(length=limit)
            logger.info(f"Retrieved {len(results)} records")
            return results
        except Exception as e:
            logger.error(f"Error retrieving records: {str(e)}")
            raise

    async def get_by_name(self, player_name: str):
        try:
            collection = await self.get_collection()
            result = await collection.find_one({"player_name": player_name})
            if result:
                logger.info(f"Found player: {player_name}")
            else:
                logger.info(f"Player not found: {player_name}")
            return result
        except Exception as e:
            logger.error(f"Error retrieving player: {str(e)}")
            raise

db = MongoDB() 