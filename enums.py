from enum import Enum


class CriteriaType(Enum):
    GOBLIN_MERGE = 6
    BARREL_SMASH = 7
    SHAFT_OPEN = 0
    ROCK_OPEN = 1

class RewardType(Enum):
    CURRENCY = 0
    CARDS = 2
    GEMS = 5  # Unsure
    
# and detailed_type
class DetailedType(Enum):
    ELIXIR = 'Soft'
    GOLD = 'Hard'
    COMMON = 'Common'
    UNCOMMON = 'Uncommon'
    RARE = 'Rare'
    EVENT_EPIC = 'EventEpic' # I think these are just Epic cards but not 100% sure. In one mine I checked, they show as purple backs
    ONE = '1'
    FOUR = '4'