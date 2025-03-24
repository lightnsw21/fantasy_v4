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
        # Calculate average of last 2 tournaments
        df['lastTournament1'] = df[last_tournament1_col]
        df['lastTournament2'] = df[last_tournament2_col]
        df['averageLast2'] = df[['lastTournament1', 'lastTournament2']].mean(axis=1)

        # Map Excel columns to our model fields
        column_mapping = {
            'fantasy_top_hero_page': 'fantasy_top_hero_page',
            'unnamed:_2': 'unnamed_2',
            'hero_id': 'hero_id',
            'name': 'name',
            'handle': 'handle',
            'new_hero_yn': 'new_hero_yn',
            'median_(last_4)': 'medianLast4',
            'floor': 'floorLegendary',
            'floor_1': 'floorEpic',
            'floor_2': 'floorRare',
            'floor_3': 'floorCommon',
            '⭐stars': 'stars'
        }
        df.rename(columns=column_mapping, inplace=True)
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
        
        # Process date columns
        date_columns = {}
        current_date = datetime.now()
        current_year = current_date.year
        
        # Get all columns after "Median last 4"
        score_columns = df.columns[median_col_index + 1:]
        
        for col in score_columns:
            if col in column_mapping:
                continue
            try:
                # Convert column name to string first
                col_str = str(col)
                # Try parsing various date formats
                for date_format in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%m-%d']:
                    try:
                        if date_format == '%m-%d':
                            # For month-day format, parse it and add appropriate year
                            parsed_date = datetime.strptime(col_str, date_format)
                            # First try current year
                            date = parsed_date.replace(year=current_year)
                            # If the resulting date would be in the future, use last year
                            if date > current_date:
                                date = parsed_date.replace(year=current_year - 1)
                        else:
                            date = pd.to_datetime(col_str, format=date_format)
                        
                        date_str = date.strftime('%Y-%m-%d')
                        date_columns[col] = date_str
                        logger.info(f"Date column found: {col} -> {date_str}")
                        break
                    except ValueError:
                        continue
            except:
                continue

        logger.info(f"Found date columns: {date_columns}")
        logger.info(f"Relevant columns: {relevant_columns}")
        # Convert to list of dictionaries
        records = []
        for _, row in df.iterrows():
            record = {}
            # Add regular fields
            for col in relevant_columns:
                if col in df.columns and pd.notna(row[col]):
                    record[col] = row[col]
            
            # Add historical scores
            historical_scores = {}
            for orig_col, date_str in date_columns.items():
                if orig_col in df.columns and pd.notna(row[orig_col]):
                    historical_scores[date_str] = float(row[orig_col])
            
            if historical_scores:
                record['historical_scores'] = historical_scores
            
            if 'name' in record:  # Only add records with a name
                records.append(record)
        
        logger.info(f"Final records count: {len(records)}")
        logger.info(f"Sample record historical_scores: {records[0].get('historical_scores') if records else None}")
        
        return records
        
    except Exception as e:
        logger.error(f"Error loading Excel file: {str(e)}")
        raise 