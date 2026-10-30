/**
 * Storage layer using IndexedDB (via idb-keyval) for persistent, large-capacity storage.
 * Includes:
 * 1. Automatic one-time migration from legacy localStorage to IndexedDB.
 * 2. Automatic versioned schema migration (e.g. v1 -> v2 ingredient `optional` & `alternatives`)
 *    tracked via `STORAGE_KEYS.SCHEMA_VERSION`.
 */
import { get, set } from 'idb-keyval';
import { DATA_VERSION, migrateData, normalizeRecipesList } from './migrations';

// Storage keys
export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schema_version',
  THEME: 'theme',
  WORKPLACE_MODE: 'workplaceMode',
  HOME_INGREDIENTS: 'home_ingredients_v2',
  RECIPES: 'custom_recipes',
  INGREDIENT_LIBRARY: 'custom_ingredient_library',
  MIGRATED_FLAG: '_migrated_from_localStorage',
};

/**
 * Migrate data from localStorage to IndexedDB (one-time operation).
 * Preserves existing user data when upgrading from localStorage to IndexedDB.
 */
const migrateFromLocalStorage = async () => {
  const alreadyMigrated = await get(STORAGE_KEYS.MIGRATED_FLAG);
  if (alreadyMigrated) return;

  const lsKeys = [
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.WORKPLACE_MODE,
    STORAGE_KEYS.HOME_INGREDIENTS,
    STORAGE_KEYS.RECIPES,
    STORAGE_KEYS.INGREDIENT_LIBRARY,
  ];

  for (const key of lsKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      // For JSON-stringified values, parse first so IndexedDB stores native objects
      try {
        const parsed = JSON.parse(value);
        await set(key, parsed);
      } catch {
        // Plain string value (e.g. theme = 'light')
        await set(key, value);
      }
    }
  }

  await set(STORAGE_KEYS.MIGRATED_FLAG, true);

  // Clean up localStorage after successful migration
  lsKeys.forEach((key) => localStorage.removeItem(key));
};

/**
 * Load all app data from IndexedDB in a single batch and run sequential schema migrations
 * whenever stored `SCHEMA_VERSION` is older than `DATA_VERSION`.
 */
export const loadAllData = async (defaults) => {
  // Run localStorage -> IndexedDB migration first (no-op if already done)
  await migrateFromLocalStorage();

  const [storedVersion, theme, workplaceMode, homeIngredients, recipes, ingredientLibrary] =
    await Promise.all([
      get(STORAGE_KEYS.SCHEMA_VERSION),
      get(STORAGE_KEYS.THEME),
      get(STORAGE_KEYS.WORKPLACE_MODE),
      get(STORAGE_KEYS.HOME_INGREDIENTS),
      get(STORAGE_KEYS.RECIPES),
      get(STORAGE_KEYS.INGREDIENT_LIBRARY),
    ]);

  const hasExistingData =
    recipes !== undefined ||
    ingredientLibrary !== undefined ||
    homeIngredients !== undefined ||
    theme !== undefined ||
    workplaceMode !== undefined;

  const snapshot = {
    theme: theme ?? defaults.theme,
    workplaceMode: workplaceMode ?? defaults.workplaceMode,
    homeIngredients: homeIngredients ?? defaults.homeIngredients ?? [],
    recipes: recipes ?? defaults.recipes ?? [],
    ingredientLibrary: ingredientLibrary ?? defaults.ingredientLibrary ?? [],
  };

  if (!hasExistingData) {
    const normalizedRecipes = normalizeRecipesList(snapshot.recipes);
    await set(STORAGE_KEYS.SCHEMA_VERSION, DATA_VERSION);
    return {
      ...snapshot,
      recipes: normalizedRecipes,
    };
  }

  const effectiveVersion =
    typeof storedVersion === 'number' && storedVersion >= 1 ? Math.floor(storedVersion) : 1;

  if (effectiveVersion < DATA_VERSION) {
    const migrated = migrateData({
      version: effectiveVersion,
      data: snapshot,
    });
    await Promise.all([
      set(STORAGE_KEYS.RECIPES, migrated.recipes),
      set(STORAGE_KEYS.SCHEMA_VERSION, DATA_VERSION),
    ]);
    return migrated;
  }

  return {
    ...snapshot,
    recipes: normalizeRecipesList(snapshot.recipes),
  };
};

/**
 * Save individual values to IndexedDB.
 * Each function is a fire-and-forget write.
 */
export const saveSchemaVersion = (version = DATA_VERSION) =>
  set(STORAGE_KEYS.SCHEMA_VERSION, version);
export const saveTheme = (value) => set(STORAGE_KEYS.THEME, value);
export const saveWorkplaceMode = (value) => set(STORAGE_KEYS.WORKPLACE_MODE, value);
export const saveHomeIngredients = (value) => set(STORAGE_KEYS.HOME_INGREDIENTS, value);
export const saveRecipes = (value) =>
  Promise.all([
    set(STORAGE_KEYS.RECIPES, normalizeRecipesList(value)),
    set(STORAGE_KEYS.SCHEMA_VERSION, DATA_VERSION),
  ]);
export const saveIngredientLibrary = (value) => set(STORAGE_KEYS.INGREDIENT_LIBRARY, value);

/**
 * Save all data at once (used during data import).
 */
export const saveAllData = async (data) => {
  await Promise.all([
    saveSchemaVersion(DATA_VERSION),
    saveTheme(data.theme),
    saveWorkplaceMode(data.workplaceMode),
    saveHomeIngredients(data.homeIngredients ?? []),
    set(STORAGE_KEYS.RECIPES, normalizeRecipesList(data.recipes ?? [])),
    saveIngredientLibrary(data.ingredientLibrary ?? []),
  ]);
};
