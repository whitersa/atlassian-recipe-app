/**
 * Schema definition & sequential data migration pipeline.
 *
 * Current Schema: DATA_VERSION = 2
 *
 * Saved Ingredient Slot Structure (v2):
 * {
 *   name: string,            // 主材料名称，如 "牛肉末"
 *   amount: string,          // 用量，如 "80 克"（默认 "适量"）
 *   type: 'basic' | 'seasoning' | 'spice',
 *   optional: boolean,       // true 表示可选材料（不放也不阻塞必选齐套）
 *   alternatives: Array<{    // 同槽位并列备选替换项（勾选任意一项即视为该组已备齐）
 *     name: string,          // 备选材料名称，如 "猪肉末"
 *     amount: string,        // 备选材料用量，如 "80 克"（默认继承主材料用量）
 *     type: 'basic' | 'seasoning' | 'spice'
 *   }>
 * }
 */

export const DATA_VERSION = 2;

const VALID_INGREDIENT_TYPES = new Set(['basic', 'seasoning', 'spice']);

const OPTIONAL_SUFFIX_RE = /\s*[(（]\s*(?:可选|选放|选填|可不放|非必选|optional)\s*[)）]\s*$/i;
const PAREN_ALT_RE = /^(.+?)\s*[(（]\s*(?:或|或者|可换|可用|替代[:：]?|备选[:：]?)\s*([^)）]+?)\s*[)）]\s*$/;
const INLINE_OR_RE = /^([^()（）/、，,\s]{1,14})\s*或(?:者)?\s*([^()（）/、，,\s]{1,14})$/;

/**
 * Curated v2 ingredient definitions for unmodified legacy v1 built-in recipes ('1', '2', '3').
 */
const BUILT_IN_V2_INGREDIENTS = {
  '1': [
    {
      name: '南豆腐 (石膏豆腐)',
      amount: '400 克',
      type: 'basic',
      optional: false,
      alternatives: [{ name: '内酯嫩豆腐', amount: '400 克', type: 'basic' }],
    },
    {
      name: '牛肉末',
      amount: '80 克',
      type: 'basic',
      optional: false,
      alternatives: [{ name: '猪肉末', amount: '80 克', type: 'basic' }],
    },
    { name: '郫县豆瓣酱', amount: '1.5 汤匙', type: 'seasoning', optional: false, alternatives: [] },
    { name: '四川大红袍花椒粉', amount: '1 茶匙', type: 'spice', optional: false, alternatives: [] },
    {
      name: '青蒜苗',
      amount: '2 根',
      type: 'spice',
      optional: false,
      alternatives: [{ name: '小葱葱花', amount: '2 根', type: 'spice' }],
    },
    { name: '豆豉', amount: '1 茶匙', type: 'seasoning', optional: true, alternatives: [] },
    { name: '姜末、蒜末', amount: '各 1 茶匙', type: 'spice', optional: false, alternatives: [] },
    {
      name: '高汤',
      amount: '150 毫升',
      type: 'seasoning',
      optional: false,
      alternatives: [{ name: '温清水', amount: '150 毫升', type: 'seasoning' }],
    },
    { name: '水淀粉 (勾芡用)', amount: '适量', type: 'seasoning', optional: false, alternatives: [] },
  ],
  '2': [
    {
      name: '鸡腿肉 (去骨)',
      amount: '250 克',
      type: 'basic',
      optional: false,
      alternatives: [{ name: '鸡胸肉', amount: '250 克', type: 'basic' }],
    },
    {
      name: '熟花生米 (去皮)',
      amount: '50 克',
      type: 'basic',
      optional: false,
      alternatives: [{ name: '熟腰果', amount: '50 克', type: 'basic' }],
    },
    { name: '干辣椒段', amount: '10 克', type: 'spice', optional: false, alternatives: [] },
    { name: '花椒粒', amount: '1 茶匙', type: 'spice', optional: true, alternatives: [] },
    { name: '大葱 (切小段)', amount: '1 根', type: 'spice', optional: false, alternatives: [] },
    { name: '姜片、蒜片', amount: '各 5 克', type: 'spice', optional: false, alternatives: [] },
    {
      name: '宫保调味汁 (糖、醋、生抽、淀粉、水)',
      amount: '1 小碗',
      type: 'seasoning',
      optional: false,
      alternatives: [],
    },
  ],
  '3': [
    { name: '新鲜鸡蛋', amount: '3 个', type: 'basic', optional: false, alternatives: [] },
    { name: '熟透多汁番茄', amount: '2 个', type: 'basic', optional: false, alternatives: [] },
    { name: '小葱 (切段)', amount: '2 根', type: 'spice', optional: true, alternatives: [] },
    {
      name: '白糖',
      amount: '1 茶匙',
      type: 'seasoning',
      optional: true,
      alternatives: [{ name: '番茄酱 (增味提色)', amount: '1 汤匙', type: 'seasoning' }],
    },
    { name: '盐', amount: '1/2 茶匙', type: 'seasoning', optional: false, alternatives: [] },
    { name: '食用油', amount: '适量', type: 'seasoning', optional: false, alternatives: [] },
  ],
};

const LEGACY_V1_BUILTIN_SIGNATURES = {
  '1': '嫩豆腐 (石膏/南豆腐)|牛肉末 (或猪肉末)|郫县豆瓣酱',
  '2': '鸡胸肉 (或鸡腿肉)|熟花生米 (去皮)|干辣椒段',
  '3': '新鲜鸡蛋|熟透多汁番茄|小葱 (切段)',
};

const LEGACY_BUILTIN_STEP_DURATION_SIGNATURES = {
  '1': '180|240|300',
  '2': '300|120|180',
  '3': '120|90|180',
};

const BUILT_IN_V2_STEP_TIMERS = {
  '1': [
    [{ label: '豆腐焯水', duration: 60 }],
    [],
    [{ label: '小火慢烧入味', duration: 300 }],
  ],
  '2': [
    [{ label: '鸡丁腌制锁水', duration: 600 }],
    [],
    [],
  ],
  '3': [[], [], []],
};

function sanitizeType(rawType, fallback = 'basic') {
  return VALID_INGREDIENT_TYPES.has(rawType) ? rawType : fallback;
}

/**
 * Parses legacy v1 plain-text ingredient names into structured v2 `{ name, optional, alternatives }`:
 * - "香菜 (可选)" -> { name: "香菜", optional: true, alternatives: [] }
 * - "牛肉末 (或猪肉末)" -> { name: "牛肉末", optional: false, alternatives: [{ name: "猪肉末", ... }] }
 * - "高汤或清水" -> { name: "高汤", optional: false, alternatives: [{ name: "清水", ... }] }
 * Leaves descriptive parentheses like "水淀粉 (勾芡用)" or "嫩豆腐 (石膏/南豆腐)" intact.
 */
export function parseV1IngredientText(rawName, primaryAmount = '适量', primaryType = 'basic') {
  let working = typeof rawName === 'string' ? rawName.trim() : '';
  let optional = false;

  if (OPTIONAL_SUFFIX_RE.test(working)) {
    optional = true;
    working = working.replace(OPTIONAL_SUFFIX_RE, '').trim();
  }

  const parenMatch = working.match(PAREN_ALT_RE);
  if (parenMatch) {
    const mainName = parenMatch[1].trim();
    const altNames = parenMatch[2]
      .split(/\s*(?:\/|、|或(?:者)?)\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      name: mainName,
      optional,
      alternatives: altNames.map((altName) => ({
        name: altName,
        amount: primaryAmount,
        type: primaryType,
      })),
    };
  }

  const inlineOrMatch = working.match(INLINE_OR_RE);
  if (inlineOrMatch) {
    return {
      name: inlineOrMatch[1].trim(),
      optional,
      alternatives: [
        {
          name: inlineOrMatch[2].trim(),
          amount: primaryAmount,
          type: primaryType,
        },
      ],
    };
  }

  return {
    name: working,
    optional,
    alternatives: [],
  };
}

/**
 * Normalizes an ingredient object into canonical v2 persistence shape.
 */
export function normalizeIngredientItem(ing) {
  const primaryType = sanitizeType(ing?.type, 'basic');
  const primaryAmount =
    typeof ing?.amount === 'string' && ing.amount.trim() ? ing.amount.trim() : '适量';
  const alternatives = Array.isArray(ing?.alternatives)
    ? ing.alternatives
        .filter((alt) => alt && typeof alt.name === 'string' && alt.name.trim() !== '')
        .map((alt) => ({
          name: alt.name.trim(),
          amount:
            typeof alt.amount === 'string' && alt.amount.trim() ? alt.amount.trim() : primaryAmount,
          type: sanitizeType(alt.type, primaryType),
        }))
    : [];

  return {
    name: typeof ing?.name === 'string' ? ing.name.trim() : '',
    amount: primaryAmount,
    type: primaryType,
    optional: Boolean(ing?.optional),
    alternatives,
  };
}

/**
 * Migrates a single v1 ingredient item to v2.
 */
export function migrateV1IngredientToV2(ing) {
  if (!ing || typeof ing !== 'object') {
    return normalizeIngredientItem({});
  }
  const hasExplicitV2 =
    typeof ing.optional === 'boolean' || Array.isArray(ing.alternatives);
  if (hasExplicitV2) {
    return normalizeIngredientItem(ing);
  }

  const primaryType = sanitizeType(ing.type, 'basic');
  const primaryAmount =
    typeof ing.amount === 'string' && ing.amount.trim() ? ing.amount.trim() : '适量';
  const parsed = parseV1IngredientText(ing.name, primaryAmount, primaryType);

  return normalizeIngredientItem({
    name: parsed.name,
    amount: primaryAmount,
    type: primaryType,
    optional: parsed.optional,
    alternatives: parsed.alternatives,
  });
}

function sanitizeLegacyTags(recipe) {
  if (recipe.id === '1' && Array.isArray(recipe.tags) && recipe.tags.includes('经典川菜')) {
    return { ...recipe, tags: ['麻辣', '豆腐'], tagClasses: ['lozenge-red', 'lozenge-default'] };
  }
  if (recipe.id === '2' && Array.isArray(recipe.tags) && recipe.tags.includes('国宴经典')) {
    return { ...recipe, tags: ['酸甜微辣', '鸡肉'], tagClasses: ['lozenge-orange', 'lozenge-default'] };
  }
  if (recipe.id === '3' && Array.isArray(recipe.tags) && recipe.tags.includes('新手必备')) {
    return { ...recipe, tags: ['酸甜', '鸡蛋'], tagClasses: ['lozenge-green', 'lozenge-default'] };
  }
  return recipe;
}

function isUnmodifiedV1BuiltIn(recipe) {
  const expectedPrefix = LEGACY_V1_BUILTIN_SIGNATURES[recipe?.id];
  if (!expectedPrefix || !Array.isArray(recipe?.ingredients)) return false;
  const hasV2Fields = recipe.ingredients.some(
    (ing) => ing && (typeof ing.optional === 'boolean' || Array.isArray(ing.alternatives))
  );
  if (hasV2Fields) return false;
  const firstThree = recipe.ingredients
    .slice(0, 3)
    .map((ing) => (typeof ing?.name === 'string' ? ing.name.trim() : ''))
    .join('|');
  return firstThree === expectedPrefix;
}

export function normalizeStepItem(step, idx = 0) {
  if (!step || typeof step !== 'object') {
    return { title: `步骤 ${idx + 1}`, desc: '', timers: [] };
  }
  const title =
    typeof step.title === 'string' && step.title.trim() ? step.title.trim() : `步骤 ${idx + 1}`;
  const desc = typeof step.desc === 'string' ? step.desc.trim() : '';

  let timers = [];
  if (Array.isArray(step.timers)) {
    timers = step.timers
      .filter((t) => t && Number(t.duration) > 0)
      .map((t) => ({
        label: typeof t.label === 'string' && t.label.trim() ? t.label.trim() : title,
        duration: Math.max(1, Math.round(Number(t.duration))),
      }));
  } else if (Number(step.duration) > 0) {
    timers = [
      {
        label:
          typeof step.timerLabel === 'string' && step.timerLabel.trim()
            ? step.timerLabel.trim()
            : title,
        duration: Math.max(1, Math.round(Number(step.duration))),
      },
    ];
  }

  return {
    title,
    desc,
    timers,
  };
}

function normalizeRecipeSteps(recipe) {
  const rawSteps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  const legacySig = LEGACY_BUILTIN_STEP_DURATION_SIGNATURES[recipe?.id];
  if (legacySig && rawSteps.length === 3) {
    const hasExplicitTimers = rawSteps.some((s) => Array.isArray(s?.timers));
    const currentSig = rawSteps.map((s) => Number(s?.duration) || 0).join('|');
    if (!hasExplicitTimers && currentSig === legacySig) {
      const targetTimers = BUILT_IN_V2_STEP_TIMERS[recipe.id];
      return rawSteps.map((step, idx) =>
        normalizeStepItem(
          {
            title: step?.title,
            desc: step?.desc,
            timers: targetTimers[idx] || [],
          },
          idx
        )
      );
    }
  }
  return rawSteps.map((step, idx) => normalizeStepItem(step, idx));
}

export function migrateV1RecipeToV2(recipe) {
  if (!recipe || typeof recipe !== 'object') return recipe;
  const tagCleaned = sanitizeLegacyTags(recipe);
  const steps = normalizeRecipeSteps(tagCleaned);

  if (isUnmodifiedV1BuiltIn(tagCleaned)) {
    return {
      ...tagCleaned,
      ingredients: BUILT_IN_V2_INGREDIENTS[tagCleaned.id].map(normalizeIngredientItem),
      steps,
    };
  }

  const rawIngs = Array.isArray(tagCleaned.ingredients) ? tagCleaned.ingredients : [];
  return {
    ...tagCleaned,
    ingredients: rawIngs
      .map(migrateV1IngredientToV2)
      .filter((ing) => ing.name !== ''),
    steps,
  };
}

export function normalizeRecipesList(recipes) {
  if (!Array.isArray(recipes)) return [];
  return recipes.map((recipe) => {
    if (!recipe || typeof recipe !== 'object') return recipe;
    const tagCleaned = sanitizeLegacyTags(recipe);
    const steps = normalizeRecipeSteps(tagCleaned);
    if (isUnmodifiedV1BuiltIn(tagCleaned)) {
      return {
        ...tagCleaned,
        ingredients: BUILT_IN_V2_INGREDIENTS[tagCleaned.id].map(normalizeIngredientItem),
        steps,
      };
    }
    const rawIngs = Array.isArray(tagCleaned.ingredients) ? tagCleaned.ingredients : [];
    return {
      ...tagCleaned,
      ingredients: rawIngs.map(normalizeIngredientItem).filter((ing) => ing.name !== ''),
      steps,
    };
  });
}

/**
 * Sequential version-to-version migration table.
 * Each key `N` transforms `data` from schema version `N` to `N + 1`.
 */
export const DATA_MIGRATIONS = {
  1: (v1Data) => {
    const safeData = v1Data && typeof v1Data === 'object' ? v1Data : {};
    const v1Recipes = Array.isArray(safeData.recipes) ? safeData.recipes : [];
    return {
      ...safeData,
      recipes: v1Recipes.map(migrateV1RecipeToV2),
    };
  },
};

/**
 * Safely normalizes restored/migrated data with defaults for missing fields.
 */
export function safeRestoreData(importedData) {
  const src = importedData && typeof importedData === 'object' ? importedData : {};
  return {
    theme: typeof src.theme === 'string' ? src.theme : 'light',
    workplaceMode: typeof src.workplaceMode === 'boolean' ? src.workplaceMode : true,
    homeIngredients: Array.isArray(src.homeIngredients) ? src.homeIngredients : [],
    recipes: normalizeRecipesList(src.recipes),
    ingredientLibrary: Array.isArray(src.ingredientLibrary) ? src.ingredientLibrary : [],
  };
}

/**
 * Runs sequential migrations from `exportedPayload.version` (default 1) up to `DATA_VERSION`.
 * Returns normalized v2 `data`.
 */
export function migrateData(exportedPayload) {
  const isEnvelope =
    exportedPayload &&
    typeof exportedPayload === 'object' &&
    'data' in exportedPayload &&
    exportedPayload.data &&
    typeof exportedPayload.data === 'object';

  let version =
    isEnvelope && typeof exportedPayload.version === 'number' && exportedPayload.version >= 1
      ? Math.floor(exportedPayload.version)
      : 1;
  let currentData = isEnvelope ? exportedPayload.data : exportedPayload;

  while (version < DATA_VERSION) {
    const migrateFn = DATA_MIGRATIONS[version];
    if (migrateFn) {
      currentData = migrateFn(currentData);
    }
    version += 1;
  }

  return safeRestoreData(currentData);
}
