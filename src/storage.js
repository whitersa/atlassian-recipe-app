/**
 * Storage layer using IndexedDB (via idb-keyval) for persistent, large-capacity storage.
 * Includes automatic one-time migration from localStorage for existing users.
 */
import { get, set } from 'idb-keyval';

// Storage keys
export const STORAGE_KEYS = {
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
  lsKeys.forEach(key => localStorage.removeItem(key));
};

/**
 * Load all app data from IndexedDB in a single batch.
 * Returns an object with all stored values (or null if not found).
 */
export const loadAllData = async (defaults) => {
  // Run migration first (no-op if already done)
  await migrateFromLocalStorage();

  const [theme, workplaceMode, homeIngredients, recipes, ingredientLibrary] = await Promise.all([
    get(STORAGE_KEYS.THEME),
    get(STORAGE_KEYS.WORKPLACE_MODE),
    get(STORAGE_KEYS.HOME_INGREDIENTS),
    get(STORAGE_KEYS.RECIPES),
    get(STORAGE_KEYS.INGREDIENT_LIBRARY),
  ]);

  return {
    theme: theme ?? defaults.theme,
    workplaceMode: workplaceMode ?? defaults.workplaceMode,
    homeIngredients: homeIngredients ?? defaults.homeIngredients,
    recipes: recipes ?? defaults.recipes,
    ingredientLibrary: ingredientLibrary ?? defaults.ingredientLibrary,
  };
};

/**
 * Save individual values to IndexedDB.
 * Each function is a fire-and-forget write.
 */
export const saveTheme = (value) => set(STORAGE_KEYS.THEME, value);
export const saveWorkplaceMode = (value) => set(STORAGE_KEYS.WORKPLACE_MODE, value);
export const saveHomeIngredients = (value) => set(STORAGE_KEYS.HOME_INGREDIENTS, value);
export const saveRecipes = (value) => set(STORAGE_KEYS.RECIPES, value);
export const saveIngredientLibrary = (value) => set(STORAGE_KEYS.INGREDIENT_LIBRARY, value);

/**
 * Save all data at once (used during data import).
 */
export const saveAllData = async (data) => {
  await Promise.all([
    saveTheme(data.theme),
    saveWorkplaceMode(data.workplaceMode),
    saveHomeIngredients(data.homeIngredients),
    saveRecipes(data.recipes),
    saveIngredientLibrary(data.ingredientLibrary),
  ]);
};
