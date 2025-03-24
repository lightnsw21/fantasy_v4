from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
import numpy as np

class FantasySheet(BaseModel):
    fantasy_top_hero_page: Optional[str] = None
    hero_id: Optional[str] = Field(default=None)  # Convert numeric to string
    name: str
    handle: Optional[str] = None
    flags: Optional[str] = None
    new_hero_yn: Optional[int] = Field(default=None)
    created_at: datetime = datetime.now()
    medianLast4: Optional[float] = None
    lastTournament1: Optional[float] = None  # First tournament score
    lastTournament2: Optional[float] = None  # Second tournament score
    averageLast2: Optional[float] = None    # Average of last 2 tournaments
    floorCommon: Optional[float] = None
    floorRare: Optional[float] = None
    floorEpic: Optional[float] = None
    floorLegendary: Optional[float] = None
    stars: Optional[float] = None
    historical_scores: Dict[str, float] = Field(default_factory=dict)  # Store additional historical scores by date

    class Config:
        from_attributes = True

    def optimize_deck(self, num_cards, num_epics=0, num_rares=0, num_legendaries=0):
        """
        Optimize deck considering card rarities and their multipliers
        """
        if num_epics + num_rares + num_legendaries > num_cards:
            raise ValueError("Sum of rarity cards cannot exceed total number of cards")

        # Calculate base scores (median of last 4 games)
        base_scores = self.df['last_4_median'].values
        
        # Sort cards by base score
        card_indices = np.argsort(base_scores)[::-1]  # Descending order
        
        # Select the best cards for each rarity
        selected_cards = []
        remaining_cards = set(card_indices)
        
        # Select legendary cards first (2.5x multiplier)
        legendary_indices = self._select_best_cards(remaining_cards, base_scores, num_legendaries)
        selected_cards.extend((idx, base_scores[idx] * 2.5) for idx in legendary_indices)
        remaining_cards -= set(legendary_indices)
        
        # Select epic cards (2x multiplier)
        epic_indices = self._select_best_cards(remaining_cards, base_scores, num_epics)
        selected_cards.extend((idx, base_scores[idx] * 2.0) for idx in epic_indices)
        remaining_cards -= set(epic_indices)
        
        # Select rare cards (1.5x multiplier)
        rare_indices = self._select_best_cards(remaining_cards, base_scores, num_rares)
        selected_cards.extend((idx, base_scores[idx] * 1.5) for idx in rare_indices)
        remaining_cards -= set(rare_indices)
        
        # Fill remaining slots with common cards (1x multiplier)
        num_commons = num_cards - (num_legendaries + num_epics + num_rares)
        common_indices = self._select_best_cards(remaining_cards, base_scores, num_commons)
        selected_cards.extend((idx, base_scores[idx]) for idx in common_indices)
        
        # Sort by adjusted score
        selected_cards.sort(key=lambda x: x[1], reverse=True)
        
        # Create result DataFrame
        result_df = self.df.iloc[[idx for idx, _ in selected_cards]].copy()
        result_df['adjusted_score'] = [score for _, score in selected_cards]
        
        return result_df

    def _select_best_cards(self, available_indices, scores, num_cards):
        """Helper method to select the best cards from available indices"""
        sorted_indices = sorted(available_indices, key=lambda idx: scores[idx], reverse=True)
        return sorted_indices[:num_cards] 