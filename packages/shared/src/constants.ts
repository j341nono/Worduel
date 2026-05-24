// Centralized rule constants. Server and client both import these so behavior stays in sync.

export const MATCH_DURATION_SEC = 60;

// Token economy.
// Tokens accrue at 5, 15, 25, 35, 45 seconds — 5 total per match.
export const TOKEN_INTERVAL_SEC = 10;
export const TOKEN_INITIAL_OFFSET_SEC = 5;
export const MAX_LIFETIME_TOKENS = 5;
export const MAX_STORED_TOKENS = 2;

// UI: number of puzzle slots shown to the receiver. Matches MAX_LIFETIME_TOKENS so an
// opponent can never fill more than this many.
export const MAX_PUZZLE_SLOTS = MAX_LIFETIME_TOKENS;

// Speed-bonus window for the solver. Beyond this, no speed bonus.
export const PUZZLE_TIME_LIMIT_SEC = 15;

// Guess bonuses only apply to the first three guesses on a given puzzle. Subsequent
// guesses are still allowed but earn no extra bonus. The constant is also used by the
// offline CPU simulator as an upper bound for its own attempts.
export const MAX_GUESSES_PER_PUZZLE = 3;

export const WORD_LENGTH = 3;
export const CANDIDATE_COUNT = 3;
export const ROOM_CODE_LENGTH = 6;
