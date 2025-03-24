from motor.motor_asyncio import AsyncIOMotorClient
from models.fantasy_sheet import FantasySheet
import logging
from typing import List, Dict, Tuple
from datetime import datetime

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
            
            # Convert MongoDB documents to FantasySheet models
            fantasy_sheets = []
            for result in results:
                # Remove MongoDB's _id field as it's not in our model
                if '_id' in result:
                    del result['_id']
                
                # Convert hero_id to string if it exists
                if 'hero_id' in result and result['hero_id'] is not None:
                    result['hero_id'] = str(result['hero_id'])
                
                # Ensure historical_scores values are floats
                if 'historical_scores' in result:
                    result['historical_scores'] = {
                        k: float(v) for k, v in result['historical_scores'].items()
                    }
                
                fantasy_sheet = FantasySheet(**result)
                fantasy_sheets.append(fantasy_sheet)
            
            logger.info(f"Converted {len(fantasy_sheets)} records to FantasySheet models")
            return fantasy_sheets
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

    async def get_investment_suggestions(self, 
        max_price: float = None, 
        min_historical_games: int = 3,
        rarity: str = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Analyze cards and suggest the best ones to purchase based on:
        - Historical score consistency and trend
        - Recent performance
        - Price efficiency (score per ETH)
        - Risk assessment
        
        Parameters:
        - max_price: Maximum floor price to consider
        - min_historical_games: Minimum number of historical games required
        - rarity: Filter by rarity (Legendary, Epic, Rare, Common)
        - limit: Number of suggestions to return
        """
        try:
            collection = await self.get_collection()
            
            # Log initial count
            total_docs = await collection.count_documents({})
            logger.info(f"Total documents in collection: {total_docs}")
            
            # Base pipeline for aggregation
            pipeline = []
            
            # Match stage for initial filtering
            match_conditions = {}
            
            # Price filter
            if max_price:
                if rarity == "Legendary":
                    match_conditions["floorLegendary"] = {"$lte": max_price}
                elif rarity == "Epic":
                    match_conditions["floorEpic"] = {"$lte": max_price}
                elif rarity == "Rare":
                    match_conditions["floorRare"] = {"$lte": max_price}
                elif rarity == "Common":
                    match_conditions["floorCommon"] = {"$lte": max_price}
                else:
                    match_conditions["$or"] = [
                        {"floorLegendary": {"$lte": max_price}},
                        {"floorEpic": {"$lte": max_price}},
                        {"floorRare": {"$lte": max_price}},
                        {"floorCommon": {"$lte": max_price}}
                    ]
            
            # Ensure we have historical data
            match_conditions["historical_scores"] = {"$exists": True, "$ne": {}}
            
            # Log match conditions
            logger.info(f"Match conditions: {match_conditions}")
            
            if match_conditions:
                pipeline.append({"$match": match_conditions})
                # Log count after initial match
                matched_docs = await collection.count_documents(match_conditions)
                logger.info(f"Documents after initial match: {matched_docs}")
            
            # Convert historical_scores object to array for aggregation
            pipeline.append({
                "$addFields": {
                    "historical_scores_array": {"$objectToArray": "$historical_scores"},
                    "floor_price": {
                        "$switch": {
                            "branches": [
                                {"case": {"$eq": ["$rarity", "Legendary"]}, "then": "$floorLegendary"},
                                {"case": {"$eq": ["$rarity", "Epic"]}, "then": "$floorEpic"},
                                {"case": {"$eq": ["$rarity", "Rare"]}, "then": "$floorRare"}
                            ],
                            "default": "$floorCommon"
                        }
                    }
                }
            })
            
            # Add computed fields
            pipeline.append({
                "$addFields": {
                    "historical_games_count": {"$size": "$historical_scores_array"},
                    "historical_values": {
                        "$map": {
                            "input": "$historical_scores_array",
                            "as": "score",
                            "in": {"$toDouble": "$$score.v"}
                        }
                    }
                }
            })

            # Add score efficiency calculation
            pipeline.append({
                "$addFields": {
                    "score_efficiency": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$gt": ["$averageLast2", 0]},
                                    {"$gt": ["$floor_price", 0]}
                                ]
                            },
                            "then": {"$divide": ["$averageLast2", "$floor_price"]},
                            "else": 0
                        }
                    }
                }
            })
            
            # Filter by minimum historical games
            pipeline.append({
                "$match": {
                    "historical_games_count": {"$gte": min_historical_games}
                }
            })
            
            # Calculate historical stats and trends
            pipeline.append({
                "$addFields": {
                    "historical_average": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$historical_values"}, 0]},
                            "then": {"$avg": "$historical_values"},
                            "else": 0
                        }
                    },
                    "score_consistency": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$historical_values"}, 0]},
                            "then": {"$stdDevPop": "$historical_values"},
                            "else": 0
                        }
                    }
                }
            })

            # Calculate investment score
            pipeline.append({
                "$addFields": {
                    "investment_score": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$gt": ["$score_efficiency", 0]},
                                    {"$gt": ["$historical_average", 0]}
                                ]
                            },
                            "then": {
                                "$multiply": [
                                    "$score_efficiency",
                                    {
                                        "$divide": [
                                            "$historical_average",
                                            {"$add": [1, "$score_consistency"]}
                                        ]
                                    }
                                ]
                            },
                            "else": 0
                        }
                    }
                }
            })
            
            # Sort by investment score
            pipeline.append({
                "$sort": {"investment_score": -1}
            })
            
            # Limit results
            pipeline.append({"$limit": limit})
            
            # Log the full pipeline for debugging
            logger.info(f"Full aggregation pipeline: {pipeline}")
            
            # Execute pipeline
            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            # Log intermediate results
            logger.info(f"Number of results after aggregation: {len(results)}")
            if len(results) > 0:
                logger.info(f"Sample result: {results[0]}")
            else:
                logger.info("No results found after aggregation")
            
            # Process and format results
            suggestions = []
            for card in results:
                suggestion = {
                    "name": card["name"],
                    "hero_id": str(card["hero_id"]) if "hero_id" in card else "",
                    "rarity": rarity or "Common",
                    "floor_price": float(card.get("floor_price", 0)),
                    "average_last_2": float(card.get("averageLast2", 0)),
                    "historical_average": float(card.get("historical_average", 0)),
                    "score_consistency": float(card.get("score_consistency", 0)),
                    "score_efficiency": float(card.get("score_efficiency", 0)),
                    "investment_score": float(card.get("investment_score", 0)),
                    "historical_games": int(card.get("historical_games_count", 0)),
                    "stars": int(card.get("stars", 0)),
                    "historical_scores": {str(k): float(v) for k, v in card.get("historical_scores", {}).items()}
                }
                suggestions.append(suggestion)
            
            logger.info(f"Final number of suggestions: {len(suggestions)}")
            return suggestions
            
        except Exception as e:
            logger.error(f"Error generating investment suggestions: {str(e)}")
            raise

db = MongoDB() 