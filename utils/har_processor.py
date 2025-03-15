import base64
from binascii import Error
import json

def decode_response(base64_text):
    # Add padding to the base64 string if necessary
    try:
        decoded_text = base64.b64decode(base64_text).decode('utf-8')
    except Error:
        decoded_text = base64_text
    except (UnicodeDecodeError, TypeError, ValueError):
        decoded_text = base64_text
    return decoded_text

def process_har_file(file_path: str) -> list:
    result = list()
    with open(file_path) as f:
        data = json.load(f)
    for entry in data.get('log').get('entries'):
        request = entry.get('request').get('url')
        response = entry.get('response')
        base64_text = response.get('content').get('text')
        result.append((request, decode_response(base64_text)))
    return result

def get_har_request(har_file_data: list, request_str: str) -> list:
    return [entry[1] for entry in har_file_data if request_str in entry[0]]

def get_player_cards_data(har_file_data: list) -> list:
    seen_ids = set()
    player_cards_data = []
    for har_entry in get_har_request(har_file_data, "card/player"):
        for json_data in json.loads(har_entry)["data"]:
            min_id = json_data.get('min_id')
            if min_id not in seen_ids:
                seen_ids.add(min_id)
                print(f"Processing card: hero_id={json_data.get('hero_id')}, rarity={json_data.get('hero_rarity_index')}")
                player_cards_data.append({
                    'hero_rarity_index': json_data.get('hero_rarity_index'),
                    'hero_id': json_data.get('hero_id'),
                    'count': json_data.get('card_number'),
                    'picture': json_data.get('picture'),
                    'handle': json_data.get('heroes').get('handle'),
                    'name': json_data.get('heroes').get('name')
                })
    return player_cards_data

def get_player_portfolio_value(har_file_data: list) -> list:
    player_cards_value = [
        card_data['heroes']['highest_bid']*card_data['card_number'] if card_data['heroes']['highest_bid'] else 0
        for card_data in get_player_cards_data(har_file_data)
    ]
    print([
        (card_data['heroes']['highest_bid'],card_data['heroes'])
        for card_data in get_player_cards_data(har_file_data)
    ])
    print(player_cards_value)
    return sum(player_cards_value)/10**18

def get_marketplace_data(har_file_data: list) -> list:
    marketplace_data = [
        har_entry
        for har_data in get_har_request(har_file_data, "sell")
        for har_entry in json.loads(har_data)["data"]
    ]
    return marketplace_data 