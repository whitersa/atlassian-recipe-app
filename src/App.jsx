import { useState, useEffect } from 'react';
import {
  loadAllData,
  saveTheme,
  saveWorkplaceMode,
  saveHomeIngredients,
  saveRecipes,
  saveIngredientLibrary,

} from './storage';
import { 
  ChefHat, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Search, 
  Clock, 
  Flame, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  ClipboardList,
  Inbox,
  ArrowLeft,
  Carrot,
  Sparkles,
  CookingPot,
  ChevronRight,
  Plus,
  Check,
  BookOpen,
  Leaf,
  Download,
  Upload
} from 'lucide-react';
import { useRef } from 'react';

// Data schema version for import/export migration
const DATA_VERSION = 1;

// Migration functions: each migrates from version N to N+1
// Add new entries here when the data structure changes
const DATA_MIGRATIONS = {
  // Example for future: 1 -> 2
  // 1: (data) => {
  //   // transform data from v1 to v2 format
  //   return { ...data, newField: 'default' };
  // },
};

const migrateData = (exportedData) => {
  let { version = 1, data } = exportedData;
  
  // Apply migrations sequentially
  while (version < DATA_VERSION) {
    const migrateFn = DATA_MIGRATIONS[version];
    if (migrateFn) {
      data = migrateFn(data);
    }
    version++;
  }
  
  return data;
};

// Safely parse imported data with fallbacks for missing/extra fields
const safeRestoreData = (importedData) => {
  return {
    theme: typeof importedData.theme === 'string' ? importedData.theme : 'light',
    workplaceMode: typeof importedData.workplaceMode === 'boolean' ? importedData.workplaceMode : true,
    homeIngredients: Array.isArray(importedData.homeIngredients) ? importedData.homeIngredients : [],
    recipes: Array.isArray(importedData.recipes) ? importedData.recipes : [],
    ingredientLibrary: Array.isArray(importedData.ingredientLibrary) ? importedData.ingredientLibrary : [],
  };
};

// Mock Database of Recipes (Chinese Cuisine Focus)
const recipes = [
  {
    id: '1',
    title: '川味经典麻婆豆腐',
    englishTitle: 'Classic Sichuan Mapo Tofu',
    chef: 'Chef 李明 (四川酒家)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
    image: 'assets/tofu.png',
    difficulty: 'medium',
    difficultyLabel: '中等难度',
    prepTime: 10,
    cookTime: 12,
    calories: 350,
    tags: ['麻辣', '经典川菜', '超下饭'],
    tagClasses: ['lozenge-red', 'lozenge-blue', 'lozenge-default'],
    category: 'lunch',
    description: '川菜的代表作之一，讲究“麻、辣、烫、香、酥、嫩、鲜、活”。用红油豆瓣酱与大红袍花椒粉，搭配滑嫩的豆腐与焦香的牛肉末，是米饭的完美伴侣。',
    ingredients: [
      { name: '嫩豆腐 (石膏/南豆腐)', amount: '400 克' },
      { name: '牛肉末 (或猪肉末)', amount: '80 克' },
      { name: '郫县豆瓣酱', amount: '1.5 汤匙' },
      { name: '四川大红袍花椒粉', amount: '1 茶匙' },
      { name: '青蒜苗', amount: '2 根' },
      { name: '豆豉', amount: '1 茶匙' },
      { name: '姜末、蒜末', amount: '各 1 茶匙' },
      { name: '高汤或清水', amount: '150 毫升' },
      { name: '水淀粉 (勾芡用)', amount: '适量' }
    ],
    steps: [
      {
        title: '豆腐焯水与准备',
        desc: '将豆腐切成 2 厘米见方的小块。锅中烧开水，加入少许盐，下入豆腐块轻轻焯水 1 分钟，捞出沥干（这样可去除豆腥味，且豆腐不易碎）。蒜苗斜切成段。',
        duration: 180
      },
      {
        title: '炒制肉末与红油',
        desc: '热锅凉油，下牛肉末煸炒至水分收干、呈金黄酥香状态后盛出。锅内留底油，小火下郫县豆瓣酱、剁碎的豆豉以及姜蒜末，慢炒出红油与香气。',
        duration: 240
      },
      {
        title: '烧制与三次勾芡',
        desc: '倒入高汤，加入豆腐和炒好的肉末，大火烧开转小火慢烧 5 分钟入味。分三次倒入水淀粉勾芡（每次间隔半分钟），使酱汁完美包裹豆腐。出锅盛盘，撒上大量花椒粉和青蒜苗。',
        duration: 300
      }
    ],
    nutrition: {
      calories: '350 kcal',
      protein: '18g',
      fat: '26g',
      carbs: '12g'
    }
  },
  {
    id: '2',
    title: '经典宫保鸡丁',
    englishTitle: 'Classic Kung Pao Chicken',
    chef: 'Chef 张国华 (特级厨师)',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&fit=crop&q=80',
    image: 'assets/chicken.png',
    difficulty: 'medium',
    difficultyLabel: '中等难度',
    prepTime: 15,
    cookTime: 8,
    calories: 450,
    tags: ['酸甜微辣', '国宴经典', '鸡肉'],
    tagClasses: ['lozenge-orange', 'lozenge-blue', 'lozenge-default'],
    category: 'dinner',
    description: '驰名中外的中餐名菜，红亮油润。鸡丁鲜嫩，花生米酥脆，味道酸甜中带着微辣与淡淡的花椒麻香。',
    ingredients: [
      { name: '鸡胸肉 (或鸡腿肉)', amount: '250 克' },
      { name: '熟花生米 (去皮)', amount: '50 克' },
      { name: '干辣椒段', amount: '10 克' },
      { name: '花椒粒', amount: '1 茶匙' },
      { name: '大葱 (切小段)', amount: '1 根' },
      { name: '姜片、蒜片', amount: '各 5 克' },
      { name: '宫保调味汁 (糖、醋、生抽、淀粉、水)', amount: '1 小碗' }
    ],
    steps: [
      {
        title: '鸡丁切配与腌制',
        desc: '鸡肉切成 1.5 厘米的丁，加入少许盐、料酒、生抽、水淀粉和一茶匙食用油抓匀，腌制 10-15 分钟锁住水分。调制宫保汁：碗中加入白糖、香醋（糖醋比例约1:1）、生抽、盐、淀粉和少许水搅拌均匀。',
        duration: 300
      },
      {
        title: '滑炒鸡丁',
        desc: '锅中倒入稍多的油，烧至五成热时下入腌好的鸡丁，快速滑炒至鸡丁变白八成熟，立即捞出控油待用。',
        duration: 120
      },
      {
        title: '爆香干椒与大火合炒',
        desc: '锅留底油，下花椒粒、干辣椒段用小火煸炒至辣椒微变褐色。下入姜蒜片、葱段爆香，随后倒入鸡丁。倒入调好的宫保汁，大火快速翻炒至酱汁粘稠包裹鸡肉，最后倒入花生米翻匀即可关火出锅。',
        duration: 180
      }
    ],
    nutrition: {
      calories: '450 kcal',
      protein: '28g',
      fat: '22g',
      carbs: '18g'
    }
  },
  {
    id: '3',
    title: '家常番茄炒蛋',
    englishTitle: 'Scrambled Eggs with Tomatoes',
    chef: 'Chef 妈妈的味道',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop&q=80',
    image: 'assets/eggs.png',
    difficulty: 'easy',
    difficultyLabel: '极易上手',
    prepTime: 5,
    cookTime: 6,
    calories: 220,
    tags: ['酸甜可口', '新手必备', '快手菜'],
    tagClasses: ['lozenge-green', 'lozenge-blue', 'lozenge-default'],
    category: 'breakfast',
    description: '每个中国家庭餐桌上最经典、最温馨的快手菜。金黄软嫩的鸡蛋吸饱了番茄的酸甜汤汁，超级下饭。',
    ingredients: [
      { name: '新鲜鸡蛋', amount: '3 个' },
      { name: '熟透多汁番茄', amount: '2 个' },
      { name: '小葱 (切段)', amount: '2 根' },
      { name: '白糖', amount: '1 茶匙' },
      { name: '盐', amount: '1/2 茶匙' },
      { name: '食用油', amount: '适量' }
    ],
    steps: [
      {
        title: '食材准备与打散蛋液',
        desc: '鸡蛋打入碗中，加 1/4 茶匙盐，用筷子快速顺时针打散至有丰富泡沫。番茄顶端划十字开水烫皮去皮，切成滚刀块。小葱葱白切末，葱绿切段。',
        duration: 120
      },
      {
        title: '大火炒制滑蛋',
        desc: '锅中倒入足量食用油烧至八成热（微微冒烟）。倒入蛋液，蛋液迅速膨胀时用筷子快速划散，待蛋液刚刚凝固还有些湿润时立即盛出，切勿炒老。',
        duration: 90
      },
      {
        title: '炒制番茄与合炒',
        desc: '锅内留少许底油，下葱白炒香，倒入番茄块中火煸炒，用锅铲轻轻压番茄，炒出丰富的红沙汁。加入糖调味，随后倒入鸡蛋和葱绿段，快速翻匀让鸡蛋吸收番茄汁，最后加剩余的盐调味即可盛盘。',
        duration: 180
      }
    ],
    nutrition: {
      calories: '220 kcal',
      protein: '12g',
      fat: '14g',
      carbs: '10g'
    }
  }
];

const INGREDIENT_LIBRARY = [
  // 常见食材
  { name: '豆腐', category: 'basic' },
  { name: '牛肉', category: 'basic' },
  { name: '鸡肉', category: 'basic' },
  { name: '鸡蛋', category: 'basic' },
  { name: '西红柿', category: 'basic' },
  { name: '大葱', category: 'basic' },
  { name: '小葱', category: 'basic' },
  { name: '青蒜苗', category: 'basic' },
  { name: '花生米', category: 'basic' },
  
  // 常见调料
  { name: '豆瓣酱', category: 'seasoning' },
  { name: '豆豉', category: 'seasoning' },
  { name: '高汤', category: 'seasoning' },
  { name: '淀粉', category: 'seasoning' },
  { name: '白糖', category: 'seasoning' },
  { name: '盐', category: 'seasoning' },
  { name: '食用油', category: 'seasoning' },

  // 香料
  { name: '生姜', category: 'spice' },
  { name: '大蒜', category: 'spice' },
  { name: '辣椒', category: 'spice' },
  { name: '花椒', category: 'spice' },
  { name: '八角', category: 'spice' },
  { name: '桂皮', category: 'spice' },
  { name: '香叶', category: 'spice' },
  { name: '草果', category: 'spice' },
  { name: '小茴香', category: 'spice' },
  { name: '丁香', category: 'spice' }
];

const hasIngredientAtHome = (recipeIngName, homeIngredients) => {
  const normRecipe = recipeIngName.toLowerCase();
  
  // Custom mapping for complex recipe terms
  let mappedRecipe = normRecipe;
  if (normRecipe.includes('番茄')) {
    mappedRecipe += ' 西红柿';
  }
  if (normRecipe.includes('姜') || normRecipe.includes('姜末') || normRecipe.includes('姜片')) {
    mappedRecipe += ' 生姜';
  }
  if (normRecipe.includes('蒜') || normRecipe.includes('蒜末') || normRecipe.includes('蒜片')) {
    mappedRecipe += ' 大蒜';
  }
  if (normRecipe.includes('水淀粉') || normRecipe.includes('淀粉')) {
    mappedRecipe += ' 淀粉';
  }
  
  return homeIngredients.some(homeIng => {
    const normHome = homeIng.name.toLowerCase();
    return mappedRecipe.includes(normHome) || normHome.includes(mappedRecipe);
  });
};

const initialIngredients = [
  // 基础食材 (basic)
  { id: '1', name: '嫩豆腐 (石膏/南豆腐)', category: 'vegetable', type: 'basic', unit: '400 克', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '2', name: '牛肉末 (新鲜)', category: 'meat', type: 'basic', unit: '80 克', status: 'need', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '3', name: '鸡肉块 (去骨)', category: 'meat', type: 'basic', unit: '250 克', status: 'stock', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '4', name: '熟花生米 (去皮)', category: 'condiment', type: 'basic', unit: '50 克', status: 'stock', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '5', name: '熟透番茄 (多汁)', category: 'vegetable', type: 'basic', unit: '2 个', status: 'need', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '6', name: '新鲜鸡蛋', category: 'meat', type: 'basic', unit: '3 个', status: 'stock', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '11', name: '青蒜苗', category: 'vegetable', type: 'basic', unit: '2 根', status: 'need', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '14', name: '葱段 (大葱)', category: 'vegetable', type: 'basic', unit: '1 根', status: 'stock', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '15', name: '切段小葱', category: 'vegetable', type: 'basic', unit: '2 根', status: 'stock', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },

  // 调味酱料 (seasoning)
  { id: '7', name: '郫县豆瓣酱', category: 'condiment', type: 'seasoning', unit: '1.5 汤匙', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '8', name: '大红袍花椒粉', category: 'condiment', type: 'spice', unit: '1 茶匙', status: 'stock', recipeIds: ['1', '2'], recipeNames: ['川味经典麻婆豆腐', '经典宫保鸡丁'] },
  { id: '9', name: '新鲜姜末蒜末', category: 'condiment', type: 'spice', unit: '各 1 茶匙', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '10', name: '豆豉 (剁碎)', category: 'condiment', type: 'seasoning', unit: '1 茶匙', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '12', name: '干辣椒段', category: 'condiment', type: 'spice', unit: '10 克', status: 'stock', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '13', name: '花椒粒', category: 'condiment', type: 'spice', unit: '1 茶匙', status: 'stock', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '16', name: '白糖', category: 'condiment', type: 'seasoning', unit: '1 茶匙', status: 'stock', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '17', name: '食用油', category: 'condiment', type: 'seasoning', unit: '适量', status: 'stock', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '18', name: '高汤或清水', category: 'condiment', type: 'seasoning', unit: '150 毫升', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '20', name: '宫保调味汁', category: 'condiment', type: 'seasoning', unit: '1 小碗', status: 'need', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '21', name: '水淀粉 (勾芡用)', category: 'condiment', type: 'seasoning', unit: '适量', status: 'stock', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] }
];

// Default data for first-time users
const DEFAULT_HOME_INGREDIENTS = [
  { name: '鸡蛋', category: 'basic' },
  { name: '西红柿', category: 'basic' },
  { name: '小葱', category: 'basic' },
  { name: '食用油', category: 'seasoning' },
  { name: '盐', category: 'seasoning' }
];

function App() {
  // Loading state for async IndexedDB initialization
  const [isLoading, setIsLoading] = useState(true);

  // Theme state
  const [theme, setTheme] = useState('light');

  // Workplace mode state (default to true)
  const [workplaceMode, setWorkplaceMode] = useState(true);

  // Tab navigation state ('recipes' or 'ingredients')
  const [currentTab, setCurrentTab] = useState('recipes');

  // Selected material type for sub-views ('basic', 'seasoning', 'semi-finished', or null)
  const [selectedMaterialType, setSelectedMaterialType] = useState(null);

  // Home ingredients list state
  const [homeIngredients, setHomeIngredients] = useState(DEFAULT_HOME_INGREDIENTS);

  // Recipes list state (customizable)
  const [recipesList, setRecipesList] = useState(recipes);

  // Ingredient library list state (customizable)
  const [ingredientLibraryList, setIngredientLibraryList] = useState(INGREDIENT_LIBRARY);

  // Async initialization: load all data from IndexedDB
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadAllData({
          theme: 'light',
          workplaceMode: true,
          homeIngredients: DEFAULT_HOME_INGREDIENTS,
          recipes,
          ingredientLibrary: INGREDIENT_LIBRARY,
        });

        setTheme(data.theme);
        setWorkplaceMode(data.workplaceMode);
        setHomeIngredients(data.homeIngredients);
        setRecipesList(data.recipes);
        setIngredientLibraryList(data.ingredientLibrary);
      } catch (err) {
        console.error('Failed to load data from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Persist changes to IndexedDB (skip during initial loading)
  useEffect(() => {
    if (!isLoading) saveHomeIngredients(homeIngredients);
  }, [homeIngredients, isLoading]);

  useEffect(() => {
    if (!isLoading) saveRecipes(recipesList);
  }, [recipesList, isLoading]);

  useEffect(() => {
    if (!isLoading) saveIngredientLibrary(ingredientLibraryList);
  }, [ingredientLibraryList, isLoading]);

  // Ingredient form
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState('basic');
  const [ingFormMessage, setIngFormMessage] = useState('');

  // Recipe form
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState('lunch');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');
  const [newRecipePrepTime, setNewRecipePrepTime] = useState('');
  const [newRecipeCookTime, setNewRecipeCookTime] = useState('');
  const [newRecipeDifficulty, setNewRecipeDifficulty] = useState('medium');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([{ name: '', amount: '' }]);
  const [newRecipeSteps, setNewRecipeSteps] = useState([{ title: '', desc: '', duration: '' }]);
  const [recipeFormMessage, setRecipeFormMessage] = useState('');

  // Data import/export
  const fileInputRef = useRef(null);
  const [dataMessage, setDataMessage] = useState('');
  const [dataMessageType, setDataMessageType] = useState('success'); // 'success' | 'error'

  const handleExportData = () => {
    const exportPayload = {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      appName: '个人菜谱库',
      data: {
        theme,
        workplaceMode,
        homeIngredients,
        recipes: recipesList,
        ingredientLibrary: ingredientLibraryList,
      }
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `菜谱库备份_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDataMessage(`数据已导出 (${recipesList.length} 道菜谱, ${ingredientLibraryList.length} 种食材)`);
    setDataMessageType('success');
    setTimeout(() => setDataMessage(''), 4000);
  };

  const handleImportData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset file input so same file can be re-imported
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        
        // Validate basic structure
        if (!raw.data || typeof raw.data !== 'object') {
          throw new Error('文件格式不正确：缺少 data 字段');
        }

        // Migrate if version differs
        const migrated = raw.version !== DATA_VERSION ? migrateData(raw) : raw.data;
        
        // Safe restore with fallbacks
        const restored = safeRestoreData(migrated);

        // Apply to state (IndexedDB saves are handled by useEffect watchers)
        setTheme(restored.theme);
        document.documentElement.setAttribute('data-theme', restored.theme);
        saveTheme(restored.theme);
        
        setWorkplaceMode(restored.workplaceMode);
        saveWorkplaceMode(restored.workplaceMode);
        
        setHomeIngredients(restored.homeIngredients);
        
        // Merge: keep built-in recipes, add imported ones
        if (restored.recipes.length > 0) {
          setRecipesList(restored.recipes);
        }
        
        if (restored.ingredientLibrary.length > 0) {
          setIngredientLibraryList(restored.ingredientLibrary);
        }

        const exportDate = raw.exportedAt ? new Date(raw.exportedAt).toLocaleString('zh-CN') : '未知时间';
        const versionInfo = raw.version !== DATA_VERSION ? ` (已从 v${raw.version} 迁移至 v${DATA_VERSION})` : '';
        setDataMessage(`导入成功！备份来自 ${exportDate}${versionInfo}，共 ${restored.recipes.length} 道菜谱`);
        setDataMessageType('success');
        setTimeout(() => setDataMessage(''), 5000);
      } catch (err) {
        console.error('Import error:', err);
        setDataMessage(`导入失败：${err.message}`);
        setDataMessageType('error');
        setTimeout(() => setDataMessage(''), 5000);
      }
    };

    reader.onerror = () => {
      setDataMessage('文件读取失败，请重试');
      setDataMessageType('error');
      setTimeout(() => setDataMessage(''), 5000);
    };

    reader.readAsText(file);
  };

  const handleAddCustomIngredient = (e) => {
    e.preventDefault();
    if (!newIngName.trim()) {
      setIngFormMessage('请输入食材名称');
      return;
    }
    
    const exists = ingredientLibraryList.some(
      item => item.name.toLowerCase() === newIngName.trim().toLowerCase()
    );
    if (exists) {
      setIngFormMessage('食材库中已存在该食材');
      return;
    }

    const newItem = {
      name: newIngName.trim(),
      category: newIngCategory
    };

    setIngredientLibraryList(prev => [...prev, newItem]);
    setNewIngName('');
    setIngFormMessage(`成功录入食材 “${newItem.name}”`);
    setTimeout(() => setIngFormMessage(''), 3000);
  };

  const handleAddCustomRecipe = (e) => {
    e.preventDefault();
    if (!newRecipeTitle.trim()) {
      setRecipeFormMessage('请输入菜谱名称');
      return;
    }

    // Filter out empty ingredients and steps
    const validIngredients = newRecipeIngredients
      .filter(ing => ing.name.trim() !== '')
      .map(ing => ({ name: ing.name.trim(), amount: ing.amount.trim() || '适量' }));

    const validSteps = newRecipeSteps
      .filter(step => step.desc.trim() !== '')
      .map((step, idx) => ({
        title: step.title.trim() || `步骤 ${idx + 1}`,
        desc: step.desc.trim(),
        duration: parseInt(step.duration) || 0
      }));

    if (validIngredients.length === 0) {
      setRecipeFormMessage('请至少添加一个食材');
      return;
    }

    if (validSteps.length === 0) {
      setRecipeFormMessage('请至少添加一个烹饪步骤');
      return;
    }

    const newRecipe = {
      id: String(Date.now()),
      title: newRecipeTitle.trim(),
      englishTitle: '',
      chef: '自定义录入',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&fit=crop&q=80',
      image: 'assets/eggs.png', // Fallback cover image
      difficulty: newRecipeDifficulty,
      difficultyLabel: newRecipeDifficulty === 'easy' ? '极易上手' : newRecipeDifficulty === 'medium' ? '中等难度' : '困难挑战',
      prepTime: parseInt(newRecipePrepTime) || 5,
      cookTime: parseInt(newRecipeCookTime) || 5,
      calories: 300,
      tags: [newRecipeDifficulty === 'easy' ? '简易' : '需要技巧', '自录入'],
      tagClasses: ['lozenge-blue', 'lozenge-default'],
      category: newRecipeCategory,
      description: newRecipeDesc.trim() || '自录入的美味食谱。',
      ingredients: validIngredients,
      steps: validSteps,
      nutrition: {
        calories: '300 kcal',
        protein: '12g',
        fat: '10g',
        carbs: '20g'
      }
    };

    setRecipesList(prev => [newRecipe, ...prev]);
    
    // Clear form
    setNewRecipeTitle('');
    setNewRecipeDesc('');
    setNewRecipePrepTime('');
    setNewRecipeCookTime('');
    setNewRecipeDifficulty('medium');
    setNewRecipeIngredients([{ name: '', amount: '' }]);
    setNewRecipeSteps([{ title: '', desc: '', duration: '' }]);
    
    setRecipeFormMessage(`成功录入菜谱 “${newRecipe.title}”`);
    setTimeout(() => setRecipeFormMessage(''), 3000);
  };

  // Library modal open state
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  // Selected category in ingredient library modal ('basic' or 'seasoning')
  const [libraryActiveCategory, setLibraryActiveCategory] = useState('basic');

  // Library search state
  const [libSearchQuery, setLibSearchQuery] = useState('');

  const closeLibraryModal = () => {
    setIsLibraryModalOpen(false);
    setLibSearchQuery('');
  };

  const handleRemoveHomeIngredient = (name) => {
    setHomeIngredients(prev => prev.filter(n => n.name !== name));
  };

  // Derived ingredients list from static initialIngredients and dynamic homeIngredients
  const ingredients = initialIngredients.map(item => ({
    ...item,
    status: hasIngredientAtHome(item.name, homeIngredients) ? 'stock' : 'need'
  }));

  const toggleIngredientStatus = (id) => {
    const item = initialIngredients.find(ing => ing.id === id);
    if (!item) return;
    
    // Find matching library item
    const matchedLib = ingredientLibraryList.find(libItem => 
      item.name.toLowerCase().includes(libItem.name.toLowerCase()) || 
      libItem.name.toLowerCase().includes(item.name.toLowerCase())
    );
    const nameToToggle = matchedLib ? matchedLib.name : item.name.replace(/\(.*?\)/g, '').trim();
    const categoryToToggle = matchedLib ? matchedLib.category : item.type;

    setHomeIngredients(prev => {
      const exists = prev.some(n => n.name === nameToToggle);
      if (exists) {
        return prev.filter(n => n.name !== nameToToggle);
      } else {
        return [...prev, { name: nameToToggle, category: categoryToToggle }];
      }
    });
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedMaterialType(null); // Reset sub-view state
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Modal active states
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalActive, setModalActive] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Ingredients checkbox states
  const [ingredientChecked, setIngredientChecked] = useState({});

  // Steps active states
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Timer states
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerStepIndex, setActiveTimerStepIndex] = useState(null);

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Audio Synthesizer Beep Alarm
  const playBeepAlarm = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Play 3 quick distinct high beeps
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + i * 0.4);

        gain.gain.setValueAtTime(0, now + i * 0.4);
        gain.gain.linearRampToValueAtTime(0.4, now + i * 0.4 + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.4 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.4);
        osc.stop(now + i * 0.4 + 0.35);
      }
    } catch (err) {
      console.error('Audio synthesizer error:', err);
    }
  };

  // Browser Notification for timer completion
  const sendTimerNotification = (recipeTitle, stepTitle) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(`⏰ ${stepTitle} 已完成`, {
        body: `「${recipeTitle}」的该步骤计时已结束，请及时操作！`,
        icon: 'assets/tofu.png',
        tag: 'recipe-timer',
        requireInteraction: true
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playBeepAlarm();

            // Send browser notification
            if (selectedRecipe && activeTimerStepIndex !== null) {
              const stepTitle = selectedRecipe.steps[activeTimerStepIndex]?.title || '当前步骤';
              sendTimerNotification(selectedRecipe.title, stepTitle);
            }
            
            // Mark step as completed
            if (activeTimerStepIndex !== null) {
              setCompletedSteps(old => {
                if (!old.includes(activeTimerStepIndex)) {
                  return [...old, activeTimerStepIndex];
                }
                return old;
              });
              
              // Auto focus next step if exists
              if (selectedRecipe && activeTimerStepIndex + 1 < selectedRecipe.steps.length) {
                const nextStep = activeTimerStepIndex + 1;
                setTimeout(() => {
                  setActiveStepIndex(nextStep);
                }, 1000);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft, activeTimerStepIndex, selectedRecipe]);


  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const toggleWorkplaceMode = () => {
    const nextMode = !workplaceMode;
    setWorkplaceMode(nextMode);
    saveWorkplaceMode(nextMode);
  };

  const handleOpenRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setActiveTab(0);
    
    // Auto-check ingredients that are already at home
    const initialChecked = {};
    recipe.ingredients.forEach((ing, idx) => {
      if (hasIngredientAtHome(ing.name, homeIngredients)) {
        initialChecked[idx] = true;
      }
    });
    setIngredientChecked(initialChecked);
    
    setActiveStepIndex(0);
    setCompletedSteps([]);
    resetTimerState();
    
    // Smooth transition
    setTimeout(() => {
      setModalActive(true);
    }, 30);
  };

  const handleCloseRecipe = () => {
    setModalActive(false);
    resetTimerState();
    setTimeout(() => {
      setSelectedRecipe(null);
    }, 300);
  };

  // Timer Control actions
  const startTimer = (stepIdx, duration) => {
    // Request notification permission on first timer use
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (activeTimerStepIndex !== stepIdx) {
      // Switched steps, reset timer first
      setIsTimerRunning(false);
      setTimerSecondsLeft(duration);
    }
    
    setActiveTimerStepIndex(stepIdx);
    setActiveStepIndex(stepIdx);
    
    setIsTimerRunning(prev => !prev);
  };


  const resetTimer = (stepIdx, duration) => {
    if (activeTimerStepIndex === stepIdx) {
      setIsTimerRunning(false);
      setTimerSecondsLeft(duration);
    }
    setCompletedSteps(old => old.filter(s => s !== stepIdx));
  };

  const resetTimerState = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(0);
    setActiveTimerStepIndex(null);
  };

  // Helper formatting minutes/seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered recipes list
  const filteredRecipes = recipesList.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          recipe.englishTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          recipe.chef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || recipe.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getStats = (type) => {
    const items = ingredients.filter(item => item.type === type);
    const inStock = items.filter(item => item.status === 'stock').length;
    const total = items.length;
    return { inStock, total, need: total - inStock };
  };

  // Filtered ingredients list for selected sub-view
  const filteredSubIngredients = ingredients.filter(item => {
    if (selectedMaterialType && item.type !== selectedMaterialType) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.recipeNames.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (activeCategory !== 'all' && item.status !== activeCategory) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="mobile-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--ds-text-subtle)' }}>
          <ChefHat size={36} strokeWidth={2} style={{ marginBottom: '12px', opacity: 0.6 }} />
          <p style={{ fontSize: '14px', margin: 0 }}>正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mobile-wrapper ${workplaceMode ? 'workplace-mode' : ''}`}>
      {/* Header */}
      <header>
        <div className="brand-section">
          <ChefHat className="logo-icon" size={24} strokeWidth={2.5} />
          <h1 className="brand-title">个人菜谱库</h1>
        </div>
        <div className="header-actions">
          <button onClick={toggleWorkplaceMode} className="theme-switch" aria-label="切换媒体预览" title={workplaceMode ? "显示媒体预览" : "隐藏媒体预览"}>
            {workplaceMode ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
          </button>
          <button onClick={toggleTheme} className="theme-switch" aria-label="切换主题">
            {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </header>

      {/* Search & Categories (Only for recipes feed) */}
      {currentTab === 'recipes' && (
        <>
          {/* Search Area */}
          <div className="search-container">
            <div className="search-wrapper">
              <Search className="search-icon" size={16} strokeWidth={2.5} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="搜索菜谱、食材或厨师..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Chips Slider */}
          <div className="categories-container">
            <div className="categories-inner">
              <button 
                className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`} 
                onClick={() => setActiveCategory('all')}
              >全部</button>
              <button 
                className={`category-chip ${activeCategory === 'breakfast' ? 'active' : ''}`} 
                onClick={() => setActiveCategory('breakfast')}
              >元气早餐</button>
              <button 
                className={`category-chip ${activeCategory === 'lunch' ? 'active' : ''}`} 
                onClick={() => setActiveCategory('lunch')}
              >高能午餐</button>
              <button 
                className={`category-chip ${activeCategory === 'dinner' ? 'active' : ''}`} 
                onClick={() => setActiveCategory('dinner')}
              >精致晚餐</button>
            </div>
          </div>
        </>
      )}

      {/* Conditional Feeds */}
      {currentTab === 'recipes' && (
        <>
          {/* Main Feed */}
          <div className="recipe-feed">
            {filteredRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="recipe-card" 
                onClick={() => handleOpenRecipe(recipe)}
              >
                <div className="card-image-wrapper">
                  <img className="recipe-image" src={recipe.image} alt={recipe.title} loading="lazy" />
                  <span className={`difficulty-badge ${recipe.difficulty}`}>{recipe.difficultyLabel}</span>
                </div>
                <div className="card-info">
                  <div className="card-title-row">
                    <h3 className="recipe-title">{recipe.title}</h3>
                  </div>
                  <div className="card-meta">
                    <div className="meta-item">
                      <Clock size={14} strokeWidth={2.5} />
                      <span>准备 {recipe.prepTime} 分钟</span>
                    </div>
                    <div className="meta-item">
                      <Flame size={14} strokeWidth={2.5} />
                      <span>烹饪 {recipe.cookTime} 分钟</span>
                    </div>
                  </div>
                  <div className="card-tags">
                    {recipe.tags.map((tag, idx) => (
                      <span key={idx} className={`lozenge ${recipe.tagClasses[idx] || 'lozenge-default'}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredRecipes.length === 0 && (
            <div className="empty-state">
              <Inbox size={48} strokeWidth={1.5} />
              <h3>没有找到符合条件的菜品</h3>
              <p>试试搜索其他关键词，或者清除分类筛选条件。</p>
            </div>
          )}
        </>
      )}

      {currentTab === 'ingredients' && (
        <div className="subview-container">
          {selectedMaterialType === null ? (
            /* Materials Portal / Entrance View */
            <div className="portal-container" style={{ paddingTop: 'var(--spacing-xs)' }}>
              {/* Group 1: Assets Overview */}
              <h3 className="portal-section-title">食材仓库资产</h3>
              <div className="portal-grid">
                {/* Card 1: Basic Ingredients */}
                <div className="portal-card" onClick={() => { setSelectedMaterialType('basic'); setActiveCategory('all'); setSearchQuery(''); }}>
                  <div className="portal-card-main">
                    <div className="portal-card-icon-wrapper basic">
                      <Carrot size={22} strokeWidth={2.5} />
                    </div>
                    <div className="portal-card-info">
                      <h3 className="portal-card-title">基础食材</h3>
                      <p className="portal-card-desc">蔬菜、鲜肉、蛋类、豆腐等厨房基础原料</p>
                    </div>
                    <ChevronRight size={18} className="portal-card-chevron" />
                  </div>
                  <div className="portal-card-footer">
                    <span>有库存: <strong>{getStats('basic').inStock}</strong></span>
                    <span className="divider">|</span>
                    <span>需采购: <strong className={getStats('basic').need > 0 ? 'text-alert' : ''}>{getStats('basic').need}</strong></span>
                  </div>
                </div>

                {/* Card 2: Seasonings */}
                <div className="portal-card" onClick={() => { setSelectedMaterialType('seasoning'); setActiveCategory('all'); setSearchQuery(''); }}>
                  <div className="portal-card-main">
                    <div className="portal-card-icon-wrapper seasoning">
                      <Sparkles size={22} strokeWidth={2.5} />
                    </div>
                    <div className="portal-card-info">
                      <h3 className="portal-card-title">调味酱料</h3>
                      <p className="portal-card-desc">豆瓣酱、花椒粉、油盐酱醋等风味调味品</p>
                    </div>
                    <ChevronRight size={18} className="portal-card-chevron" />
                  </div>
                  <div className="portal-card-footer">
                    <span>有库存: <strong>{getStats('seasoning').inStock}</strong></span>
                    <span className="divider">|</span>
                    <span>需采购: <strong className={getStats('seasoning').need > 0 ? 'text-alert' : ''}>{getStats('seasoning').need}</strong></span>
                  </div>
                </div>

                {/* Card 3: Spices */}
                <div className="portal-card" onClick={() => { setSelectedMaterialType('spice'); setActiveCategory('all'); setSearchQuery(''); }}>
                  <div className="portal-card-main">
                    <div className="portal-card-icon-wrapper spice">
                      <Leaf size={22} strokeWidth={2.5} />
                    </div>
                    <div className="portal-card-info">
                      <h3 className="portal-card-title">香料</h3>
                      <p className="portal-card-desc">姜蒜、花椒、辣椒、八角等天然香辛料</p>
                    </div>
                    <ChevronRight size={18} className="portal-card-chevron" />
                  </div>
                  <div className="portal-card-footer">
                    <span>有库存: <strong>{getStats('spice').inStock}</strong></span>
                    <span className="divider">|</span>
                    <span>需采购: <strong className={getStats('spice').need > 0 ? 'text-alert' : ''}>{getStats('spice').need}</strong></span>
                  </div>
                </div>
              </div>

              {/* Group 2: Workbenches / Entry Tools */}
              <h3 className="portal-section-title" style={{ marginTop: 'var(--spacing-md)' }}>录入与管理工具</h3>
              <div className="portal-action-row">
                {/* Card 3: Enter Ingredient */}
                <div className="portal-card action-card" onClick={() => { setSelectedMaterialType('entry-ingredient'); }}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper entry-ing">
                      <Plus size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">录入食材</span>
                    <span className="action-card-count">已录入 {Math.max(0, ingredientLibraryList.length - 20)} 种</span>
                  </div>
                </div>

                {/* Card 4: Enter Recipe */}
                <div className="portal-card action-card" onClick={() => { setSelectedMaterialType('entry-recipe'); }}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper entry-rec">
                      <ChefHat size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">录入菜谱</span>
                    <span className="action-card-count">私房菜谱 {recipesList.filter(r => r.chef === '自定义录入').length} 道</span>
                  </div>
                </div>
              </div>

              {/* Group 3: Data Management */}
              <h3 className="portal-section-title" style={{ marginTop: 'var(--spacing-md)' }}>数据管理</h3>
              {dataMessage && (
                <div className={`form-message-banner ${dataMessageType === 'error' ? 'error' : ''}`} style={{ marginBottom: 'var(--spacing-sm)' }}>
                  {dataMessage}
                </div>
              )}
              <div className="portal-action-row">
                {/* Export */}
                <div className="portal-card action-card" onClick={handleExportData}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper data-export">
                      <Download size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">导出备份</span>
                    <span className="action-card-count">v{DATA_VERSION} · JSON 格式</span>
                  </div>
                </div>

                {/* Import */}
                <div className="portal-card action-card" onClick={() => fileInputRef.current?.click()}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper data-import">
                      <Upload size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">导入恢复</span>
                    <span className="action-card-count">支持版本迁移</span>
                  </div>
                </div>
              </div>

              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportData}
              />
            </div>
          ) : (
            /* Sub-views */
            <>
              {/* Materials Detailed Sub-view */}
              {(selectedMaterialType === 'basic' || selectedMaterialType === 'seasoning' || selectedMaterialType === 'spice') && (
                <div className="subview-container">
                  {/* Back Header */}
                  <div className="subview-header">
                    <button className="btn-back" onClick={() => { setSelectedMaterialType(null); setSearchQuery(''); setActiveCategory('all'); }} title="返回入口">
                      <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div className="subview-title-group">
                      <h2 className="subview-title">
                        {selectedMaterialType === 'basic' ? '基础食材' : selectedMaterialType === 'seasoning' ? '调味酱料' : '香料'}
                      </h2>
                      <span className="subview-subtitle">
                        共 {ingredients.filter(item => item.type === selectedMaterialType).length} 种{selectedMaterialType === 'basic' ? '基础食材' : selectedMaterialType === 'seasoning' ? '调味酱料' : '香料'}
                      </span>
                    </div>
                  </div>

                  {/* Local Search inside Sub-view */}
                  <div className="subview-search-wrapper">
                    <div className="search-wrapper">
                      <Search className="search-icon" size={16} strokeWidth={2.5} />
                      <input 
                        type="text" 
                        className="search-input" 
                        placeholder={`搜索当前分类下的${selectedMaterialType === 'basic' ? '食材' : selectedMaterialType === 'seasoning' ? '调料' : '香料'}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Local Filter Chips in Sub-view */}
                  <div className="subview-filters-container">
                    <div className="categories-inner">
                      <button 
                        className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`} 
                        onClick={() => setActiveCategory('all')}
                      >全部 ({ingredients.filter(item => item.type === selectedMaterialType).length})</button>
                      <button 
                        className={`category-chip ${activeCategory === 'stock' ? 'active' : ''}`} 
                        onClick={() => setActiveCategory('stock')}
                      >有库存 ({ingredients.filter(item => item.type === selectedMaterialType && item.status === 'stock').length})</button>
                      <button 
                        className={`category-chip ${activeCategory === 'need' ? 'active' : ''}`} 
                        onClick={() => setActiveCategory('need')}
                      >需采购 ({ingredients.filter(item => item.type === selectedMaterialType && item.status === 'need').length})</button>
                    </div>
                  </div>

                  {/* Bulk Action Buttons */}
                  {filteredSubIngredients.length > 0 && (
                    <div className="subview-actions-bar">
                      <button 
                        className="btn-bulk-action"
                        onClick={() => {
                          const libItems = ingredientLibraryList.filter(lib => lib.category === selectedMaterialType);
                          setHomeIngredients(prev => {
                            const next = [...prev];
                            libItems.forEach(libItem => {
                              if (!next.some(item => item.name === libItem.name)) {
                                next.push({ name: libItem.name, category: libItem.category });
                              }
                            });
                            return next;
                          });
                        }}
                      >
                        <Check size={13} strokeWidth={2.5} /> 一键设为有库存
                      </button>
                      <button 
                        className="btn-bulk-action secondary"
                        onClick={() => {
                          const libNames = ingredientLibraryList
                            .filter(lib => lib.category === selectedMaterialType)
                            .map(lib => lib.name);
                          setHomeIngredients(prev => prev.filter(item => !libNames.includes(item.name)));
                        }}
                      >
                        <Plus size={13} strokeWidth={2.5} /> 一键设为需采购
                      </button>
                    </div>
                  )}

                  {/* Detailed Item List */}
                  <div className="ingredients-feed">
                    {filteredSubIngredients.map(item => (
                      <div className="ingredient-page-card" key={item.id}>
                        <div className="ingredient-page-card-body">
                          <div className="ingredient-page-card-info">
                            <h3 className="ingredient-page-name">{item.name}</h3>
                            <span className="ingredient-page-unit">配量参考: {item.unit}</span>
                            <div className="ingredient-page-recipes">
                              <span className="recipe-link-label">对应菜谱:</span>
                              {item.recipeIds.map((rId, index) => {
                                const target = recipesList.find(r => r.id === rId);
                                return (
                                  <button
                                    key={rId}
                                    className="recipe-link-btn"
                                    onClick={() => target && handleOpenRecipe(target)}
                                  >
                                    {item.recipeNames[index]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="ingredient-page-card-action">
                            <button
                              onClick={() => toggleIngredientStatus(item.id)}
                              className={`lozenge ${item.status === 'stock' ? 'lozenge-green' : 'lozenge-orange'}`}
                              title="点击切换有库存/需采购状态"
                            >
                              {item.status === 'stock' ? '有库存' : '需采购'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredSubIngredients.length === 0 && (
                    <div className="empty-state">
                      <Inbox size={48} strokeWidth={1.5} />
                      <h3>当前分类下没有匹配的{selectedMaterialType === 'basic' ? '食材' : selectedMaterialType === 'seasoning' ? '调料' : '香料'}</h3>
                      <p>请尝试其他搜索词或清除筛选状态。</p>
                    </div>
                  )}
                </div>
              )}

              {/* Form 1: Enter Ingredient */}
              {selectedMaterialType === 'entry-ingredient' && (
                <div className="subview-container" style={{ paddingBottom: 'calc(var(--spacing-xl) + 60px)' }}>
                  {/* Back Header */}
                  <div className="subview-header">
                    <button className="btn-back" onClick={() => setSelectedMaterialType(null)} title="返回入口">
                      <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div className="subview-title-group">
                      <h2 className="subview-title">录入食材</h2>
                      <span className="subview-subtitle">添加自定义材料至食材库</span>
                    </div>
                  </div>
                  <div className="entry-container" style={{ flexGrow: 1 }}>
                    <form onSubmit={handleAddCustomIngredient} className="entry-form-container">
                      {ingFormMessage && <div className="form-message-banner">{ingFormMessage}</div>}
                      
                      <div className="entry-form-group">
                        <label className="entry-form-label">食材名称</label>
                        <input 
                          type="text" 
                          className="entry-form-input"
                          placeholder="例如：西红柿、五花肉、生抽、大蒜"
                          value={newIngName}
                          onChange={(e) => setNewIngName(e.target.value)}
                        />
                      </div>

                      <div className="entry-form-group">
                        <label className="entry-form-label">食材品类</label>
                        <select 
                          className="entry-form-select"
                          value={newIngCategory}
                          onChange={(e) => setNewIngCategory(e.target.value)}
                        >
                          <option value="basic">基础食材 (蔬菜、鲜肉、蛋类等)</option>
                          <option value="seasoning">调味酱料 (盐、糖、生抽、豆瓣酱等)</option>
                          <option value="spice">香料 (姜、蒜、花椒、八角等)</option>
                        </select>
                      </div>

                      <button type="submit" className="btn-bulk-action" style={{ marginTop: 'var(--spacing-xs)', width: '100%', height: '40px' }}>
                        保存食材
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Form 2: Enter Recipe */}
              {selectedMaterialType === 'entry-recipe' && (
                <div className="subview-container" style={{ paddingBottom: 'calc(var(--spacing-xl) + 60px)' }}>
                  {/* Back Header */}
                  <div className="subview-header">
                    <button className="btn-back" onClick={() => setSelectedMaterialType(null)} title="返回入口">
                      <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div className="subview-title-group">
                      <h2 className="subview-title">录入菜谱</h2>
                      <span className="subview-subtitle">录入您的专属美味私房菜谱</span>
                    </div>
                  </div>
                  <div className="entry-container" style={{ flexGrow: 1 }}>
                    <form onSubmit={handleAddCustomRecipe} className="entry-form-container">
                      {recipeFormMessage && <div className="form-message-banner">{recipeFormMessage}</div>}

                      <div className="entry-form-group">
                        <label className="entry-form-label">菜谱名称</label>
                        <input 
                          type="text" 
                          className="entry-form-input"
                          placeholder="例如：经典红烧肉"
                          value={newRecipeTitle}
                          onChange={(e) => setNewRecipeTitle(e.target.value)}
                        />
                      </div>

                      <div className="entry-form-group">
                        <label className="entry-form-label">菜谱类别</label>
                        <select 
                          className="entry-form-select"
                          value={newRecipeCategory}
                          onChange={(e) => setNewRecipeCategory(e.target.value)}
                        >
                          <option value="breakfast">元气早餐</option>
                          <option value="lunch">高能午餐</option>
                          <option value="dinner">精致晚餐</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <div className="entry-form-group" style={{ flex: 1 }}>
                          <label className="entry-form-label">准备时间 (分钟)</label>
                          <input 
                            type="number" 
                            className="entry-form-input"
                            placeholder="如：15"
                            value={newRecipePrepTime}
                            onChange={(e) => setNewRecipePrepTime(e.target.value)}
                          />
                        </div>
                        <div className="entry-form-group" style={{ flex: 1 }}>
                          <label className="entry-form-label">烹饪时间 (分钟)</label>
                          <input 
                            type="number" 
                            className="entry-form-input"
                            placeholder="如：20"
                            value={newRecipeCookTime}
                            onChange={(e) => setNewRecipeCookTime(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="entry-form-group">
                        <label className="entry-form-label">烹饪难度</label>
                        <select 
                          className="entry-form-select"
                          value={newRecipeDifficulty}
                          onChange={(e) => setNewRecipeDifficulty(e.target.value)}
                        >
                          <option value="easy">极易上手</option>
                          <option value="medium">中等难度</option>
                          <option value="hard">困难挑战</option>
                        </select>
                      </div>

                      <div className="entry-form-group">
                        <label className="entry-form-label">菜式描述</label>
                        <textarea 
                          className="entry-form-textarea"
                          placeholder="简单介绍一下这道菜的特色和风味..."
                          value={newRecipeDesc}
                          onChange={(e) => setNewRecipeDesc(e.target.value)}
                        />
                      </div>

                      {/* Dynamic Ingredients list */}
                      <div className="entry-form-group">
                        <label className="entry-form-label">所需材料清单</label>
                        <div className="entry-form-row-group">
                          {newRecipeIngredients.map((ing, idx) => (
                            <div key={idx} className="dynamic-row">
                              <input 
                                type="text" 
                                className="entry-form-input"
                                placeholder="食材名称，如：猪肉"
                                value={ing.name}
                                onChange={(e) => {
                                  const updated = [...newRecipeIngredients];
                                  updated[idx].name = e.target.value;
                                  setNewRecipeIngredients(updated);
                                }}
                                style={{ flex: 2 }}
                              />
                              <input 
                                type="text" 
                                className="entry-form-input"
                                placeholder="分量，如：300克"
                                value={ing.amount}
                                onChange={(e) => {
                                  const updated = [...newRecipeIngredients];
                                  updated[idx].amount = e.target.value;
                                  setNewRecipeIngredients(updated);
                                }}
                                style={{ flex: 1 }}
                              />
                              {newRecipeIngredients.length > 1 && (
                                <button 
                                  type="button" 
                                  className="btn-row-action delete"
                                  onClick={() => {
                                    setNewRecipeIngredients(newRecipeIngredients.filter((_, i) => i !== idx));
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button 
                            type="button" 
                            className="recipe-link-btn" 
                            onClick={() => setNewRecipeIngredients([...newRecipeIngredients, { name: '', amount: '' }])}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', alignSelf: 'flex-start', marginTop: '4px' }}
                          >
                            <Plus size={12} strokeWidth={3} /> 添加一行材料
                          </button>
                        </div>
                      </div>

                  {/* Dynamic Steps list */}
                  <div className="entry-form-group">
                    <label className="entry-form-label">烹饪步骤</label>
                    <div className="entry-form-row-group">
                      {newRecipeSteps.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: idx < newRecipeSteps.length - 1 ? '1px solid var(--ds-border)' : 'none', paddingBottom: idx < newRecipeSteps.length - 1 ? 'var(--spacing-xs)' : '0' }}>
                          <div className="dynamic-row">
                            <input 
                              type="text" 
                              className="entry-form-input"
                              placeholder={`步骤 ${idx + 1} 标题 (如: 食材准备)`}
                              value={step.title}
                              onChange={(e) => {
                                const updated = [...newRecipeSteps];
                                updated[idx].title = e.target.value;
                                setNewRecipeSteps(updated);
                              }}
                              style={{ flex: 2 }}
                            />
                            <input 
                              type="number" 
                              className="entry-form-input"
                              placeholder="定时秒数 (可选)"
                              value={step.duration}
                              onChange={(e) => {
                                const updated = [...newRecipeSteps];
                                updated[idx].duration = e.target.value;
                                setNewRecipeSteps(updated);
                              }}
                              style={{ flex: 1 }}
                            />
                            {newRecipeSteps.length > 1 && (
                              <button 
                                type="button" 
                                className="btn-row-action delete"
                                onClick={() => {
                                  setNewRecipeSteps(newRecipeSteps.filter((_, i) => i !== idx));
                                }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <textarea 
                            className="entry-form-textarea"
                            placeholder="描述具体的烹饪操作步骤..."
                            value={step.desc}
                            onChange={(e) => {
                              const updated = [...newRecipeSteps];
                              updated[idx].desc = e.target.value;
                              setNewRecipeSteps(updated);
                            }}
                            style={{ minHeight: '60px' }}
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="recipe-link-btn" 
                        onClick={() => setNewRecipeSteps([...newRecipeSteps, { title: '', desc: '', duration: '' }])}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', alignSelf: 'flex-start', marginTop: '4px' }}
                      >
                        <Plus size={12} strokeWidth={3} /> 添加下一个步骤
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn-bulk-action" style={{ marginTop: 'var(--spacing-xs)', width: '100%', height: '40px' }}>
                    保存菜谱
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )}

      {currentTab === 'prep' && (
        /* 现有食材 list view */
        <div className="subview-container" style={{ paddingBottom: 'calc(var(--spacing-xl) + 60px)' }}>
          {/* Header */}
          <div className="subview-header" style={{ paddingLeft: 'var(--spacing-md)' }}>
            <div className="subview-title-group">
              <h2 className="subview-title">现有食材</h2>
              <span className="subview-subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>
                分别管理厨房中现存的基础食材和调料囤货。
              </span>
            </div>
          </div>

          <div style={{ padding: '0 var(--spacing-md)', overflowY: 'auto', flexGrow: 1 }}>
            {/* Basic Ingredients Section */}
            <div>
              <div className="feed-header" style={{ margin: 'var(--spacing-md) 0 var(--spacing-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>基础食材</span>
                <button 
                  className="recipe-link-btn"
                  onClick={() => {
                    setLibraryActiveCategory('basic');
                    setIsLibraryModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                >
                  <Plus size={12} strokeWidth={3} /> 添加食材
                </button>
              </div>
              {homeIngredients.filter(item => item.category === 'basic').length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', padding: '12px 8px', background: 'var(--ds-background-neutral-subtle)', borderRadius: '6px', textAlign: 'center', border: '1px dashed var(--ds-border)' }}>
                  暂未添加现有食材，点击右侧“添加食材”从库中选择
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                  {homeIngredients
                    .filter(item => item.category === 'basic')
                    .map(item => (
                      <div 
                        key={item.name}
                        className="home-tag"
                      >
                        <span>{item.name}</span>
                        <button
                          onClick={() => handleRemoveHomeIngredient(item.name)}
                          className="remove-btn"
                          title="移除此项"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Seasonings Section */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <div className="feed-header" style={{ margin: 'var(--spacing-md) 0 var(--spacing-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>调味酱料</span>
                <button 
                  className="recipe-link-btn"
                  onClick={() => {
                    setLibraryActiveCategory('seasoning');
                    setIsLibraryModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                >
                  <Plus size={12} strokeWidth={3} /> 添加调料
                </button>
              </div>
              {homeIngredients.filter(item => item.category === 'seasoning').length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', padding: '12px 8px', background: 'var(--ds-background-neutral-subtle)', borderRadius: '6px', textAlign: 'center', border: '1px dashed var(--ds-border)' }}>
                  暂未添加现有调料，点击右侧“添加调料”从库中选择
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                  {homeIngredients
                    .filter(item => item.category === 'seasoning')
                    .map(item => (
                      <div 
                        key={item.name}
                        className="home-tag"
                      >
                        <span>{item.name}</span>
                        <button
                          onClick={() => handleRemoveHomeIngredient(item.name)}
                          className="remove-btn"
                          title="移除此项"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Bottom Sheet Modal */}
      {selectedRecipe && (
        <div className={`recipe-modal ${modalActive ? 'active' : ''}`} onClick={(e) => {
          if (e.target.classList.contains('recipe-modal')) handleCloseRecipe();
        }}>
          <div className="modal-content-container">
            <div className="modal-handle-bar"></div>
            <button className="modal-close-btn" onClick={handleCloseRecipe} aria-label="关闭">
              <X size={16} strokeWidth={2.5} />
            </button>

            <div className="modal-body">
              {/* Top Cover */}
              <div className="modal-cover">
                <img className="modal-cover-img" src={selectedRecipe.image} alt={selectedRecipe.title} />
                <span className={`difficulty-badge ${selectedRecipe.difficulty}`}>{selectedRecipe.difficultyLabel}</span>
              </div>

              {/* Meta Intro */}
              <div className="modal-intro">
                <h2 className="modal-title">{selectedRecipe.title}</h2>
                <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', marginTop: '-4px' }}>{selectedRecipe.englishTitle}</div>
                <div className="chef-row">
                  <img className="chef-avatar" src={selectedRecipe.avatar} alt="Chef" />
                  <span className="chef-name">{selectedRecipe.chef}</span>
                </div>
                <div className="card-meta" style={{ marginTop: 'var(--spacing-xs)' }}>
                  <div className="meta-item">
                    <Clock size={14} strokeWidth={2.5} />
                    <span>准备 {selectedRecipe.prepTime} 分钟</span>
                  </div>
                  <div className="meta-item">
                    <Flame size={14} strokeWidth={2.5} />
                    <span>烹饪 {selectedRecipe.cookTime} 分钟</span>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', lineHeight: '1.6', marginTop: 'var(--spacing-sm)' }}>
                  {selectedRecipe.description}
                </p>
              </div>

              {/* Sticky Tabs Header */}
              <div className="tabs-container">
                <button 
                  className={`tab-btn ${activeTab === 0 ? 'active' : ''}`}
                  onClick={() => setActiveTab(0)}
                >食材清单</button>
                <button 
                  className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
                  onClick={() => setActiveTab(1)}
                >烹饪步骤</button>
                <div className="tab-indicator" style={{ transform: `translateX(${activeTab * 100}%)` }}></div>
              </div>

              {/* Tab 1 Panel (Ingredients) */}
              <div className={`tab-panel ${activeTab === 0 ? 'active' : ''}`}>
                <div className="ingredients-header">
                  <h4 className="step-title">所需材料清单</h4>
                  <span className="ingredients-count">
                    已核对 {Object.values(ingredientChecked).filter(Boolean).length} / {selectedRecipe.ingredients.length}
                  </span>
                </div>
                <div className="ingredient-list">
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <label 
                      key={idx} 
                      className={`ingredient-item ${ingredientChecked[idx] ? 'completed' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        className="ingredient-checkbox"
                        checked={!!ingredientChecked[idx]}
                        onChange={(e) => {
                          setIngredientChecked(prev => ({
                            ...prev,
                            [idx]: e.target.checked
                          }));
                        }}
                      />
                      <span className="custom-checkmark">
                        <svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" /></svg>
                      </span>
                      <span className="ingredient-name">{ing.name}</span>
                      <span className="ingredient-amount">{ing.amount}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tab 2 Panel (Steps) */}
              <div className={`tab-panel ${activeTab === 1 ? 'active' : ''}`}>
                <div className="steps-container">
                  {selectedRecipe.steps.map((step, idx) => {
                    const isActive = activeStepIndex === idx;
                    const isCompleted = completedSteps.includes(idx);
                    const hasTimer = step.duration > 0;
                    const isCurrentStepTimerRunning = isTimerRunning && activeTimerStepIndex === idx;
                    const secondsDisplay = activeTimerStepIndex === idx ? timerSecondsLeft : step.duration;
                    
                    return (
                      <div 
                        key={idx}
                        className={`step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        onClick={() => setActiveStepIndex(idx)}
                      >
                        <div className="step-number-bubble">{idx + 1}</div>
                        <div className="step-content">
                          <div className="step-title">{step.title}</div>
                          <div className="step-desc">{step.desc}</div>
                          {hasTimer && (
                            <div className="step-timer-wrapper" onClick={(e) => e.stopPropagation()}>
                              <span className="timer-digits">{formatTime(secondsDisplay)}</span>
                              <div className="timer-controls">
                                <button 
                                  className="btn-timer btn-play-pause" 
                                  title="开始/暂停"
                                  onClick={() => startTimer(idx, step.duration)}
                                >
                                  {isCurrentStepTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button 
                                  className="btn-timer btn-reset" 
                                  title="重置"
                                  onClick={() => resetTimer(idx, step.duration)}
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Nutrition Info Footer */}
                  <div className="nutrition-card">
                    <div className="nutrition-title">每份营养素估算</div>
                    <div className="nutrition-grid">
                      <div className="nutrition-item">
                        <div className="nutrition-val">{selectedRecipe.nutrition.calories}</div>
                        <div className="nutrition-label">热量</div>
                      </div>
                      <div className="nutrition-item">
                        <div className="nutrition-val">{selectedRecipe.nutrition.protein}</div>
                        <div className="nutrition-label">蛋白质</div>
                      </div>
                      <div className="nutrition-item">
                        <div className="nutrition-val">{selectedRecipe.nutrition.fat}</div>
                        <div className="nutrition-label">脂肪</div>
                      </div>
                      <div className="nutrition-item">
                        <div className="nutrition-val">{selectedRecipe.nutrition.carbs}</div>
                        <div className="nutrition-label">碳水</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button 
          className={`bottom-nav-item ${currentTab === 'recipes' ? 'active' : ''}`}
          onClick={() => handleTabChange('recipes')}
        >
          <BookOpen className="bottom-nav-icon" size={20} strokeWidth={2.5} />
          <span className="bottom-nav-label">菜谱清单</span>
        </button>
        <button 
          className={`bottom-nav-item ${currentTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => handleTabChange('ingredients')}
        >
          <ClipboardList className="bottom-nav-icon" size={20} strokeWidth={2.5} />
          <span className="bottom-nav-label">常用食材</span>
        </button>
        <button 
          className={`bottom-nav-item ${currentTab === 'prep' ? 'active' : ''}`}
          onClick={() => handleTabChange('prep')}
        >
          <CookingPot className="bottom-nav-icon" size={20} strokeWidth={2.5} />
          <span className="bottom-nav-label">现有食材</span>
        </button>
      </nav>

      {/* Library Add Modal */}
      {isLibraryModalOpen && (
        <div className="recipe-modal active" onClick={closeLibraryModal}>
          <div className="modal-content-container" onClick={(e) => e.stopPropagation()} style={{ height: '75vh' }}>
            <div className="modal-handle-bar"></div>
            <button className="modal-close-btn" onClick={closeLibraryModal} aria-label="关闭">
              <X size={16} strokeWidth={2.5} />
            </button>
            
            <div className="modal-body" style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <h3 className="subview-title" style={{ marginBottom: 'var(--spacing-xs)' }}>
                {libraryActiveCategory === 'basic' ? '从食材库中添加基础食材' : '从食材库中添加调味酱料'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--ds-text-subtle)', marginBottom: 'var(--spacing-md)' }}>
                {libraryActiveCategory === 'basic' ? '搜索或选择您现有的食材：' : '搜索或选择您现有的调味酱料：'}
              </p>

              {/* Local Search inside Library Modal */}
              <div className="subview-search-wrapper" style={{ padding: '0 0 var(--spacing-sm) 0' }}>
                <div className="search-wrapper">
                  <Search className="search-icon" size={16} strokeWidth={2.5} />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder={libraryActiveCategory === 'basic' ? '输入基础食材名称进行过滤或添加...' : '输入调味酱料名称进行过滤或添加...'}
                    value={libSearchQuery}
                    onChange={(e) => setLibSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Custom Add Option */}
              {libSearchQuery.trim() && !ingredientLibraryList.some(item => item.name === libSearchQuery.trim() && item.category === libraryActiveCategory) && !homeIngredients.some(item => item.name === libSearchQuery.trim()) && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <button
                    onClick={() => {
                      const newIng = libSearchQuery.trim();
                      setHomeIngredients(prev => [...prev, { name: newIng, category: libraryActiveCategory }]);
                      setLibSearchQuery('');
                    }}
                    className="btn-bulk-action"
                    style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '4px', width: '100%' }}
                  >
                    <Plus size={14} strokeWidth={2.5} /> 直接添加自定义{libraryActiveCategory === 'basic' ? '食材' : '调料'} “{libSearchQuery.trim()}”
                  </button>
                </div>
              )}

              {/* Scrollable list container */}
              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
                {ingredientLibraryList.filter(item => item.category === libraryActiveCategory && item.name.toLowerCase().includes(libSearchQuery.toLowerCase())).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                    {ingredientLibraryList
                      .filter(item => item.category === libraryActiveCategory && item.name.toLowerCase().includes(libSearchQuery.toLowerCase()))
                      .map(item => {
                        const isAdded = homeIngredients.some(h => h.name === item.name);
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              setHomeIngredients(prev => 
                                isAdded ? prev.filter(n => n.name !== item.name) : [...prev, { name: item.name, category: libraryActiveCategory }]
                              );
                            }}
                            className={`category-chip ${isAdded ? 'active' : ''}`}
                            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isAdded && <Check size={12} strokeWidth={3} />}
                            {item.name}
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* If nothing matches pre-existing list and query is not empty */}
                {libSearchQuery.trim() && ingredientLibraryList.filter(item => item.category === libraryActiveCategory && item.name.toLowerCase().includes(libSearchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--ds-text-subtle)', padding: 'var(--spacing-md) 0', fontSize: '13px' }}>
                    没有在预设库中找到匹配项，直接点击上方按钮添加为自定义项。
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-bulk-action" 
                onClick={closeLibraryModal}
                style={{ flex: 'none', width: '120px' }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
