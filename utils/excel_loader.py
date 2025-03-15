import pandas as pd
from models.fantasy_sheet import FantasySheet
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def load_fantasy_sheet(file_path: str) -> list[dict]:
    """
    Load and process the fantasy spreadsheet
    """
    try:
        logger.info(f"Reading Excel file from: {file_path}")
        df = pd.read_excel(file_path, skiprows=2)
        logger.info(f"Excel file loaded and first row skipped. Shape: {df.shape}")
        logger.info(f"Columns found: {df.columns.tolist()}")
        
        # Clean column names - remove spaces and special characters
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace('.', '_')
        logger.info(f"Cleaned columns: {df.columns.tolist()}")
        
        # Find the index of median_(last_4) column
        median_col_index = df.columns.get_loc('median_(last_4)')
        # Get the names of the next two columns
        last_tournament1_col = df.columns[median_col_index + 1]
        last_tournament2_col = df.columns[median_col_index + 2]
        
        # Map Excel columns to our model fields
        column_mapping = {
            'fantasy_top_hero_page': 'fantasy_top_hero_page',
            'unnamed:_2': 'unnamed_2',
            'hero_id': 'hero_id',
            'name': 'name',
            'handle': 'handle',
            'new_hero_yn': 'new_hero_yn',
            'median_(last_4)': 'medianLast4',
            last_tournament1_col: 'lastTournament1',  # Dynamically mapped column
            last_tournament2_col: 'lastTournament2',  # Dynamically mapped column
            'floor': 'floorLegendary',
            'floor_1': 'floorEpic',
            'floor_2': 'floorRare',
            'floor_3': 'floorCommon',
            '⭐stars': 'stars'
        }
        
        # Rename columns based on mapping
        df = df.rename(columns=column_mapping)
        logger.info(f"Columns after mapping: {df.columns.tolist()}")
        
        # Calculate average of last 2 tournaments
        df['averageLast2'] = df[['lastTournament1', 'lastTournament2']].mean(axis=1)
        
        # Select only the columns we want to use
        relevant_columns = [
            "fantasy_top_hero_page",
            "hero_id",
            "name",
            "handle",
            "new_hero_yn",
            "medianLast4",
            "lastTournament1",
            "lastTournament2",
            "averageLast2",
            "floorCommon",
            "floorRare",
            "floorEpic",
            "floorLegendary",
            "stars"
        ]
        
        # Filter only existing columns
        existing_columns = [col for col in relevant_columns if col in df.columns]
        logger.info(f"Found relevant columns: {existing_columns}")
        
        if not existing_columns:
            logger.error("No relevant columns found in Excel file")
            logger.error(f"Available columns: {df.columns.tolist()}")
            return []
            
        if 'name' not in existing_columns:
            logger.error("Required column 'name' not found in Excel file")
            return []
            
        df = df[existing_columns]
        
        # Convert numeric columns to strings
        string_columns = ['hero_id', 'new_hero_yn']
        for col in string_columns:
            if col in df.columns:
                df[col] = df[col].astype(str)
        
        # Reset index after dropping the first row
        df = df.reset_index(drop=True)
        
        # Convert to list of dictionaries
        records = df.to_dict('records')
        logger.info(f"Converted {len(records)} records to dictionaries")
        
        # Clean and validate data
        cleaned_records = []
        for record in records:
            # Remove any NaN values
            cleaned_record = {k: v for k, v in record.items() if pd.notna(v)}
            if 'name' in cleaned_record:
                cleaned_records.append(cleaned_record)
        
        logger.info(f"Final cleaned records count: {len(cleaned_records)}")
        
        return cleaned_records
        
    except Exception as e:
        logger.error(f"Error loading Excel file: {str(e)}")
        raise 