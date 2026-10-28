import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  serial,
  uuid,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ============ USERS ============
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    usernameLower: text("username_lower").notNull(),
    passwordHash: text("password_hash").notNull(),
    email: text("email"),
    emailLower: text("email_lower"),
    dob: date("dob").notNull(),
    coins: integer("coins").notNull().default(500),
    role: text("role").notNull().default("user"),
    isBanned: boolean("is_banned").notNull().default(false),
    banReason: text("ban_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_username_lower_idx").on(t.usernameLower),
    uniqueIndex("users_email_lower_idx").on(t.emailLower),
    index("users_coins_idx").on(t.coins),
  ]
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  avatarItemId: text("avatar_item_id"),
  showEmail: boolean("show_email").notNull().default(false),
  showDob: boolean("show_dob").notNull().default(false),
  showAge: boolean("show_age").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [uniqueIndex("sessions_token_hash_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    ip: text("ip").notNull().default(""),
    attempts: integer("attempts").notNull().default(1),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  },
  (t) => [index("login_attempts_ident_idx").on(t.identifier), index("login_attempts_ip_idx").on(t.ip)]
);

// ============ MATCHES / ROOMS ============
export const gameRooms = pgTable(
  "game_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    hostId: uuid("host_id").references(() => users.id, { onDelete: "set null" }),
    guestId: uuid("guest_id").references(() => users.id, { onDelete: "set null" }),
    hostSymbol: text("host_symbol").notNull().default("X"),
    status: text("status").notNull().default("waiting"),
    matchId: uuid("match_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("game_rooms_code_idx").on(t.code), index("game_rooms_status_idx").on(t.status)]
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mode: text("mode").notNull().default("bot"),
    status: text("status").notNull().default("active"),
    board: jsonb("board").notNull().$type<string[]>(),
    currentTurn: text("current_turn").notNull().default("X"),
    winner: text("winner"),
    winLine: jsonb("win_line").$type<number[] | null>(),
    playerXId: uuid("player_x_id").references(() => users.id, { onDelete: "set null" }),
    playerOId: uuid("player_o_id").references(() => users.id, { onDelete: "set null" }),
    playerXName: text("player_x_name"),
    playerOName: text("player_o_name"),
    botDifficulty: text("bot_difficulty"),
    roomId: uuid("room_id"),
    isRanked: boolean("is_ranked").notNull().default(false),
    seasonYear: integer("season_year").notNull(),
    moveCount: integer("move_count").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    scored: boolean("scored").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastMoveAt: timestamp("last_move_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("matches_idempotency_idx").on(t.idempotencyKey),
    index("matches_playerx_idx").on(t.playerXId),
    index("matches_playero_idx").on(t.playerOId),
    index("matches_status_idx").on(t.status),
    index("matches_year_idx").on(t.seasonYear),
  ]
);

export const matchPlayers = pgTable(
  "match_players",
  {
    id: serial("id").primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    symbol: text("symbol").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    connected: boolean("connected").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("match_players_match_idx").on(t.matchId)]
);

export const matchMoves = pgTable(
  "match_moves",
  {
    id: serial("id").primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    symbol: text("symbol").notNull(),
    position: integer("position").notNull(),
    moveNumber: integer("move_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("match_moves_match_idx").on(t.matchId)]
);

export const matchmakingQueue = pgTable(
  "matchmaking_queue",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("waiting"),
    matchId: uuid("match_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("mmq_user_idx").on(t.userId), index("mmq_status_idx").on(t.status)]
);

// ============ ECONOMY ============
export const coinTransactions = pgTable(
  "coin_transactions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coin_tx_idem_idx").on(t.idempotencyKey),
    index("coin_tx_user_idx").on(t.userId),
    index("coin_tx_created_idx").on(t.createdAt),
  ]
);

export const dailyRewards = pgTable(
  "daily_rewards",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    streakDay: integer("streak_day").notNull().default(1),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (t) => [
    uniqueIndex("daily_idem_idx").on(t.idempotencyKey),
    index("daily_user_idx").on(t.userId),
  ]
);

export const abilityActivations = pgTable(
  "ability_activations",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    abilityType: text("ability_type").notNull(),
    cost: integer("cost").notNull(),
    durationTurns: integer("duration_turns").notNull().default(0),
    turnsLeft: integer("turns_left").notNull().default(0),
    isBlocked: boolean("is_blocked").notNull().default(false),
    blockedBy: uuid("blocked_by"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("ability_idem_idx").on(t.idempotencyKey),
    index("ability_user_idx").on(t.userId),
    index("ability_match_idx").on(t.matchId),
  ]
);

// ============ SHOP / COSMETICS ============
export const cosmeticItems = pgTable(
  "cosmetic_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    rarity: text("rarity").notNull().default("common"),
    price: integer("price").notNull().default(100),
    preview: jsonb("preview").notNull().$type<Record<string, string>>(),
    isActive: boolean("is_active").notNull().default(true),
    isLimited: boolean("is_limited").notNull().default(false),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableTo: timestamp("available_to", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cosmetic_cat_idx").on(t.category), index("cosmetic_rarity_idx").on(t.rarity)]
);

export const userInventory = pgTable(
  "user_inventory",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: "cascade" }),
    acquiredVia: text("acquired_via").notNull().default("purchase"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("inventory_user_item_idx").on(t.userId, t.itemId),
    index("inventory_user_idx").on(t.userId),
  ]
);

export const equippedCosmetics = pgTable(
  "equipped_cosmetics",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    itemId: text("item_id")
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: "cascade" }),
    equippedAt: timestamp("equipped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })]
);

// ============ LEADERBOARD ============
export const leaderboardStats = pgTable("leaderboard_stats", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalGames: integer("total_games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  winStreakCurrent: integer("win_streak_current").notNull().default(0),
  winStreakBest: integer("win_streak_best").notNull().default(0),
  score: integer("score").notNull().default(0),
  rankedGames: integer("ranked_games").notNull().default(0),
  rankedWins: integer("ranked_wins").notNull().default(0),
  botGames: integer("bot_games").notNull().default(0),
  botWins: integer("bot_wins").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const yearlyStats = pgTable(
  "yearly_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    games: integer("games").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    score: integer("score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.year] }), index("yearly_year_score_idx").on(t.year, t.score)]
);

export const monthlyStats = pgTable(
  "monthly_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    games: integer("games").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    score: integer("score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.year, t.month] })]
);

// ============ REDEEM ============
export const redeemCodes = pgTable(
  "redeem_codes",
  {
    id: serial("id").primaryKey(),
    codeLower: text("code_lower").notNull(),
    codeDisplay: text("code_display").notNull(),
    rewardCoins: integer("reward_coins"),
    rewardItemId: text("reward_item_id"),
    maxUsesTotal: integer("max_uses_total"),
    maxUsesPerUser: integer("max_uses_per_user").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isAdminOnly: boolean("is_admin_only").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [uniqueIndex("redeem_code_lower_idx").on(t.codeLower)]
);

export const redeemRedemptions = pgTable(
  "redeem_redemptions",
  {
    id: serial("id").primaryKey(),
    codeId: integer("code_id")
      .notNull()
      .references(() => redeemCodes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewardCoins: integer("reward_coins").notNull().default(0),
    rewardItemId: text("reward_item_id"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (t) => [
    uniqueIndex("redemption_idem_idx").on(t.idempotencyKey),
    uniqueIndex("redemption_code_user_idx").on(t.codeId, t.userId),
    index("redemption_user_idx").on(t.userId),
  ]
);

// ============ CHESTS ============
export const chestTypes = pgTable("chest_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  colorTheme: text("color_theme").notNull().default("#8b5cf6"),
  icon: text("icon").notNull().default("🎁"),
  gradient: text("gradient").notNull().default("from-violet-600 to-fuchsia-600"),
  isActive: boolean("is_active").notNull().default(true),
  activeVersion: integer("active_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const probabilityConfigVersions = pgTable(
  "probability_config_versions",
  {
    id: serial("id").primaryKey(),
    chestId: text("chest_id")
      .notNull()
      .references(() => chestTypes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    totalProbability: numeric("total_probability", { precision: 8, scale: 4 }).notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("probver_chest_ver_idx").on(t.chestId, t.version)]
);

export const chestRewardPools = pgTable(
  "chest_reward_pools",
  {
    id: serial("id").primaryKey(),
    chestId: text("chest_id")
      .notNull()
      .references(() => chestTypes.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: "cascade" }),
    probability: numeric("probability", { precision: 8, scale: 4 }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    uniqueIndex("pool_chest_item_ver_idx").on(t.chestId, t.itemId, t.version),
    index("pool_chest_idx").on(t.chestId),
  ]
);

export const chestOpenings = pgTable(
  "chest_openings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chestId: text("chest_id")
      .notNull()
      .references(() => chestTypes.id),
    rewardItemId: text("reward_item_id")
      .notNull()
      .references(() => cosmeticItems.id),
    rewardRarity: text("reward_rarity").notNull(),
    cost: integer("cost").notNull(),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateCompensation: integer("duplicate_compensation").notNull().default(0),
    probabilityVersion: integer("probability_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opening_idem_idx").on(t.idempotencyKey),
    index("opening_user_idx").on(t.userId),
    index("opening_chest_idx").on(t.chestId),
  ]
);

export const duplicateConversions = pgTable("duplicate_conversions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  openingId: uuid("opening_id")
    .notNull()
    .references(() => chestOpenings.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  compensationCoins: integer("compensation_coins").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ ADMIN ============
export const adminCoinGrants = pgTable(
  "admin_coin_grants",
  {
    id: serial("id").primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    codeId: integer("code_id").references(() => redeemCodes.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("grant_idem_idx").on(t.idempotencyKey)]
);

export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
