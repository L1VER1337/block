from fastapi import FastAPI, HTTPException, APIRouter, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import os
import logging
import uuid
from pathlib import Path
import hmac
import hashlib
from urllib.parse import unquote
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
if not TELEGRAM_BOT_TOKEN:
    logging.error("TELEGRAM_BOT_TOKEN not found in environment variables. WebApp validation will fail.")

# Create the main app
app = FastAPI(title="Block Blast Game API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_id: Optional[int] = None
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    best_score: int = 0
    total_score: int = 0
    games_played: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    telegram_id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None

class GameScore(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    score: int
    game_duration: Optional[int] = None  # in seconds
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameScoreCreate(BaseModel):
    user_id: str
    score: int
    game_duration: Optional[int] = None

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    photo_url: Optional[str] = None
    best_score: int
    rank: int

# Helper functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Parse datetime strings back from MongoDB and handle ObjectId"""
    if isinstance(item, dict):
        # Remove MongoDB ObjectId field
        if '_id' in item:
            del item['_id']
            
        for key, value in item.items():
            if key in ['created_at', 'updated_at'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    pass
    return item

async def validate_telegram_init_data(init_data: str = Header(..., alias="X-Telegram-Init-Data")):
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Server configuration error: Telegram Bot Token not set.")

    try:
        # Split init_data into key-value pairs
        pairs = sorted([s.split('=') for s in init_data.split('&') if s.split('=')[0] != 'hash'])
        data_check_string = '\n'.join([f'{k}={v}' for k, v in pairs])

        secret_key = hmac.new(key=b"WebAppData", msg=TELEGRAM_BOT_TOKEN.encode(), digestmod=hashlib.sha256).digest()
        calculated_hash = hmac.new(key=secret_key, msg=data_check_string.encode(), digestmod=hashlib.sha256).hexdigest()

        # Extract hash from init_data
        received_hash = dict(s.split('=') for s in init_data.split('&')).get('hash')

        if calculated_hash != received_hash:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid initData hash.")
        
        # Parse user data from init_data
        user_data_str = dict(s.split('=') for s in init_data.split('&')).get('user')
        if not user_data_str:
            raise HTTPException(status_code=400, detail="Bad Request: User data not found in initData.")
        
        user_data = json.loads(unquote(user_data_str))
        return user_data
    except Exception as e:
        logging.error(f"initData validation error: {e}")
        raise HTTPException(status_code=401, detail=f"Unauthorized: initData validation failed: {e}")

# API Routes

@api_router.get("/")
async def root():
    return {"message": "Block Blast Game API is running!"}

# User Management
@api_router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    telegram_user_data: dict = Depends(validate_telegram_init_data)
):
    """Create a new user"""
    logging.info(f"Received user_data: {user_data.dict()}")
    logging.info(f"Validated Telegram user data: {telegram_user_data}")
    
    # Check if user with telegram_id already exists
    existing_user = await db.users.find_one({"telegram_id": user_data.telegram_id})
    if existing_user:
        logging.info(f"User with telegram_id {user_data.telegram_id} already exists.")
        existing_user = parse_from_mongo(existing_user)
        return User(**existing_user)
    
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    user_dict = prepare_for_mongo(user_obj.dict())
    
    await db.users.insert_one(user_dict)
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = parse_from_mongo(user)
    return User(**user)

@api_router.get("/users/telegram/{telegram_id}", response_model=User)
async def get_user_by_telegram_id(telegram_id: int):
    """Get user by Telegram ID"""
    user = await db.users.find_one({"telegram_id": telegram_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = parse_from_mongo(user)
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    """Update user information"""
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id})
    updated_user = parse_from_mongo(updated_user)
    return User(**updated_user)

# Game Scores
@api_router.post("/scores", response_model=GameScore)
async def submit_score(score_data: GameScoreCreate):
    """Submit a new game score"""
    # Verify user exists
    user = await db.users.find_one({"id": score_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create score record
    score_dict = score_data.dict()
    score_obj = GameScore(**score_dict)
    score_dict = prepare_for_mongo(score_obj.dict())
    
    await db.scores.insert_one(score_dict)
    
    # Update user stats
    update_data = {
        "games_played": user["games_played"] + 1,
        "total_score": user["total_score"] + score_data.score,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update best score if this is a new record
    if score_data.score > user["best_score"]:
        update_data["best_score"] = score_data.score
    
    await db.users.update_one(
        {"id": score_data.user_id},
        {"$set": update_data}
    )
    
    return score_obj

@api_router.get("/scores/user/{user_id}")
async def get_user_scores(user_id: str, limit: int = 10):
    """Get user's recent scores"""
    scores = await db.scores.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    scores = [parse_from_mongo(score) for score in scores]
    return [GameScore(**score) for score in scores]

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 50):
    """Get game leaderboard"""
    pipeline = [
        {"$match": {"best_score": {"$gt": 0}}},
        {"$sort": {"best_score": -1}},
        {"$limit": limit}
    ]
    
    users = await db.users.aggregate(pipeline).to_list(limit)
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        entry = LeaderboardEntry(
            user_id=user["id"],
            username=user["username"],
            photo_url=user.get("photo_url"),
            best_score=user["best_score"],
            rank=rank
        )
        leaderboard.append(entry)
    
    return leaderboard

@api_router.get("/stats/user/{user_id}")
async def get_user_stats(user_id: str):
    """Get detailed user statistics"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's rank
    users_above = await db.users.count_documents(
        {"best_score": {"$gt": user["best_score"]}}
    )
    rank = users_above + 1
    
    # Get recent scores
    recent_scores = await db.scores.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "user": parse_from_mongo(user),
        "rank": rank,
        "recent_scores": [parse_from_mongo(score) for score in recent_scores]
    }

# System endpoints
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        await db.users.find_one()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("Block Blast Game API starting up...")
    # Create indexes for better performance
    await db.users.create_index("telegram_id")
    await db.users.create_index("username")
    await db.scores.create_index([("user_id", 1), ("created_at", -1)])
    await db.users.create_index([("best_score", -1)])
    logger.info("Database indexes created successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Shutting down database connection...")
    client.close()