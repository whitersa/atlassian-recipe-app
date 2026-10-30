import { useState, useEffect, useRef } from 'react';
import {
  loadAllData,
  saveTheme,
  saveWorkplaceMode,
  saveHomeIngredients,
  saveRecipes,
  saveIngredientLibrary,
} from './storage';
import {
  DATA_VERSION,
  migrateData,
  safeRestoreData,
  normalizeRecipesList,
} from './migrations';
import { 
  ChefHat, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Search, 
  Clock, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  ClipboardList,
  Inbox,
  ArrowLeft,
  Carrot,
  Sparkles,
  ChevronRight,
  Plus,
  BookOpen,
  Leaf,
  Download,
  Upload,
  Layers,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  ComponentInspectorPage,
  MobilePressCard,
  MobileToastRegion,
  MobileSegmented,
  useToastQueue,
} from './components';
import {
  requestTimerNotificationPermission,
  sendSystemTimerNotification,
  scheduleCloudTimerPush,
  cancelCloudTimerPush,
  acquireCookingWakeLock,
  releaseCookingWakeLock,
  forceCheckAndApplyAppUpdate,
} from './notifications';

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
    totalTime: 25,
    calories: 350,
    tags: ['麻辣', '豆腐'],
    tagClasses: ['lozenge-red', 'lozenge-default'],
    category: 'lunch',
    description: '川菜的代表作之一，讲究“麻、辣、烫、香、酥、嫩、鲜、活”。用红油豆瓣酱与大红袍花椒粉，搭配滑嫩的豆腐与焦香 of 牛肉末，是米饭的完美伴侣。',
    ingredients: [
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
      { name: '水淀粉 (勾芡用)', amount: '适量', type: 'seasoning', optional: false, alternatives: [] }
    ],
    steps: [
      {
        title: '豆腐焯水与准备',
        desc: '将[主:豆腐]切成 2 厘米见方的小块。锅中烧开水，加入少许[辅:盐]，下入[主:豆腐]块轻轻焯水 1 分钟，捞出沥干（这样可去除豆腥味，且豆腐不易碎）。[香:青蒜苗]斜切成段。',
        timers: [{ label: '豆腐焯水', duration: 60 }]
      },
      {
        title: '炒制肉末与红油',
        desc: '热锅凉油，下[主:牛肉末]煸炒至水分收干、呈金黄酥香状态后盛出。锅内留底油，小火下[辅:郫县豆瓣酱]、剁碎的[辅:豆豉]以及[香:姜蒜末]，慢炒出红油与香气。',
        timers: []
      },
      {
        title: '烧制与三次勾芡',
        desc: '倒入[辅:高汤]，加入[主:豆腐]和炒好的[主:牛肉末]，大火烧开转小火慢烧 5 分钟入味。分三次倒入[辅:水淀粉]勾芡（每次间隔半分钟），使酱汁完美包裹豆腐。出锅盛盘，撒上大量[香:花椒粉]和[香:青蒜苗]。',
        timers: [{ label: '小火慢烧入味', duration: 300 }]
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
    totalTime: 25,
    calories: 450,
    tags: ['酸甜微辣', '鸡肉'],
    tagClasses: ['lozenge-orange', 'lozenge-default'],
    category: 'dinner',
    description: '驰名中外的中餐名菜，红亮油润。鸡丁鲜嫩，花生米酥脆，味道酸甜中带着微辣与淡淡的花椒麻香。',
    ingredients: [
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
      { name: '宫保调味汁 (糖、醋、生抽、淀粉、水)', amount: '1 小碗', type: 'seasoning', optional: false, alternatives: [] }
    ],
    steps: [
      {
        title: '鸡丁切配与腌制',
        desc: '[主:鸡肉]切成 1.5 厘米的丁，加入少许[辅:盐]、料酒、[辅:生抽]、[辅:水淀粉]和一茶匙[辅:食用油]抓匀，腌制 10-15 分钟锁住水分。调制[辅:宫保调味汁]：碗中加入[辅:白糖]、[辅:香醋]（糖醋比例约1:1）、[辅:生抽]、[辅:盐]、[辅:淀粉]和少许水搅拌均匀。',
        timers: [{ label: '鸡丁腌制锁水', duration: 600 }]
      },
      {
        title: '滑炒鸡丁',
        desc: '锅中倒入稍多的油，烧至五成热时下入腌好的[主:鸡丁]，快速滑炒至鸡丁变白八成熟，立即捞出控油待用。',
        timers: []
      },
      {
        title: '爆香干椒与大火合炒',
        desc: '锅留底油，下[香:花椒粒]、[香:干辣椒段]用小火加热至微变褐色。下入[香:姜蒜片]、[香:大葱]爆香，随后倒入[主:鸡丁]。倒入调好的[辅:宫保调味汁]，大火快速翻炒至酱汁粘稠包裹鸡肉，最后倒入[主:熟花生米]翻匀即可关火出锅。',
        timers: []
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
    totalTime: 12,
    calories: 220,
    tags: ['酸甜', '鸡蛋'],
    tagClasses: ['lozenge-green', 'lozenge-default'],
    category: 'breakfast',
    description: '每个中国家庭餐桌上最经典、最温馨的快手菜。金黄软嫩的鸡蛋吸饱了番茄的酸甜汤汁，超级下饭。',
    ingredients: [
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
      { name: '食用油', amount: '适量', type: 'seasoning', optional: false, alternatives: [] }
    ],
    steps: [
      {
        title: '食材准备与打散蛋液',
        desc: '[主:新鲜鸡蛋]打入碗中，加 1/4 茶匙[辅:盐]，用筷子快速顺时针打散至有丰富泡沫。[主:熟透多汁番茄]顶端划十字开水烫皮去皮，切成滚刀块。[香:小葱]葱白切末，葱绿切段。',
        timers: []
      },
      {
        title: '大火炒制滑蛋',
        desc: '锅中倒入足量[辅:食用油]烧至八成热（微微冒烟）。倒入[主:新鲜鸡蛋]液，蛋液迅速膨胀时用筷子快速划散，待蛋液刚刚凝固还有些湿润时立即盛出，切勿炒老。',
        timers: []
      },
      {
        title: '炒制番茄与合炒',
        desc: '锅内留少许底油，下小葱炒香，倒入[主:熟透多汁番茄]块中火煸炒，用锅铲轻轻压番茄，炒出丰富的红沙汁。加入[辅:白糖]调味，随后倒入[主:新鲜鸡蛋]和[香:小葱]绿段，快速翻匀让鸡蛋吸收番茄汁，最后加剩余的[辅:盐]调味即可盛盘。',
        timers: []
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


const renderStepText = (text) => {
  if (!text) return '';
  const parts = text.split(/\[([^\]]+)\]/);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      let type = 'main'; // default
      let name = part;
      
      if (part.includes(':')) {
        const separator = ':';
        const splitIndex = part.indexOf(separator);
        const prefix = part.substring(0, splitIndex).trim();
        const mainName = part.substring(splitIndex + 1).trim();
        
        if (prefix === '主') {
          type = 'main';
          name = mainName;
        } else if (prefix === '辅') {
          type = 'aux';
          name = mainName;
        } else if (prefix === '香') {
          type = 'spice';
          name = mainName;
        }
      }
      return (
        <span key={index} className={`step-ingredient-highlight type-${type}`}>
          {name}
        </span>
      );
    }
    return part;
  });
};

const initialIngredients = [
  // 基础食材 (basic)
  { id: '1', name: '嫩豆腐 (石膏/南豆腐)', category: 'vegetable', type: 'basic', unit: '400 克', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '2', name: '牛肉末 (新鲜)', category: 'meat', type: 'basic', unit: '80 克', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '3', name: '鸡肉块 (去骨)', category: 'meat', type: 'basic', unit: '250 克', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '4', name: '熟花生米 (去皮)', category: 'condiment', type: 'basic', unit: '50 克', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '5', name: '熟透番茄 (多汁)', category: 'vegetable', type: 'basic', unit: '2 个', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '6', name: '新鲜鸡蛋', category: 'meat', type: 'basic', unit: '3 个', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '11', name: '青蒜苗', category: 'vegetable', type: 'basic', unit: '2 根', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '14', name: '葱段 (大葱)', category: 'vegetable', type: 'basic', unit: '1 根', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '15', name: '切段小葱', category: 'vegetable', type: 'basic', unit: '2 根', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },

  // 调味酱料 (seasoning)
  { id: '7', name: '郫县豆瓣酱', category: 'condiment', type: 'seasoning', unit: '1.5 汤匙', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '8', name: '大红袍花椒粉', category: 'condiment', type: 'spice', unit: '1 茶匙', recipeIds: ['1', '2'], recipeNames: ['川味经典麻婆豆腐', '经典宫保鸡丁'] },
  { id: '9', name: '新鲜姜末蒜末', category: 'condiment', type: 'spice', unit: '各 1 茶匙', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '10', name: '豆豉 (剁碎)', category: 'condiment', type: 'seasoning', unit: '1 茶匙', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '12', name: '干辣椒段', category: 'condiment', type: 'spice', unit: '10 克', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '13', name: '花椒粒', category: 'condiment', type: 'spice', unit: '1 茶匙', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '16', name: '白糖', category: 'condiment', type: 'seasoning', unit: '1 茶匙', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '17', name: '食用油', category: 'condiment', type: 'seasoning', unit: '适量', recipeIds: ['3'], recipeNames: ['家常番茄炒蛋'] },
  { id: '18', name: '高汤或清水', category: 'condiment', type: 'seasoning', unit: '150 毫升', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] },
  { id: '20', name: '宫保调味汁', category: 'condiment', type: 'seasoning', unit: '1 小碗', recipeIds: ['2'], recipeNames: ['经典宫保鸡丁'] },
  { id: '21', name: '水淀粉 (勾芡用)', category: 'condiment', type: 'seasoning', unit: '适量', recipeIds: ['1'], recipeNames: ['川味经典麻婆豆腐'] }
];

const generateRecipeId = () => String(Date.now());

const createEmptyIngredientEntry = () => ({
  name: '',
  amount: '',
  type: 'basic',
  optional: false,
  alternatives: [],
});

const createEmptyStepEntry = () => ({
  title: '',
  desc: '',
  timers: [],
});

const getStepTimers = (step) => {
  if (!step) return [];
  if (Array.isArray(step.timers)) {
    return step.timers.filter((t) => t && Number(t.duration) > 0);
  }
  if (Number(step.duration) > 0) {
    return [
      {
        label: step.timerLabel || step.title || '辅助计时',
        duration: Number(step.duration),
      },
    ];
  }
  return [];
};

const getIngredientGroupOptions = (ing) => [
  { name: ing.name, amount: ing.amount, type: ing.type || 'basic' },
  ...(Array.isArray(ing.alternatives) ? ing.alternatives : []),
];

const isIngredientGroupSatisfied = (ing, groupIdx, checkedMap) =>
  getIngredientGroupOptions(ing).some((_, optIdx) => Boolean(checkedMap[`${groupIdx}-${optIdx}`]));

function App() {
  // Loading state for async IndexedDB initialization
  const [isLoading, setIsLoading] = useState(true);

  // Theme state
  const [theme, setTheme] = useState('light');

  // Workplace mode state (default to true)
  const [workplaceMode, setWorkplaceMode] = useState(true);

  // Tab navigation state ('recipes', 'ingredients', or 'settings')
  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'settings' || params.get('view') === 'components' || window.location.hash === '#settings' || window.location.hash === '#components') {
      return 'settings';
    }
    if (params.get('view') === 'ingredients') {
      return 'ingredients';
    }
    return 'recipes';
  });

  // Settings sub-view state (null for Settings Home, 'inspector' for Component Inspector page)
  const [settingsSubView, setSettingsSubView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'components' || window.location.hash === '#components' ? 'inspector' : null;
  });

  // Entry form modal visibility
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showRecipeFormActive, setShowRecipeFormActive] = useState(false);
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [showIngredientFormActive, setShowIngredientFormActive] = useState(false);

  // Selected material type for sub-views ('basic', 'seasoning', 'semi-finished', or null)
  const [selectedMaterialType, setSelectedMaterialType] = useState(null);

  // Persisted home ingredients state (preserved across export/import)
  const [homeIngredients, setHomeIngredients] = useState([]);

  // Recipes list state (customizable)
  const [recipesList, setRecipesList] = useState(recipes);

  // Ingredient library list state (customizable)
  const [ingredientLibraryList, setIngredientLibraryList] = useState(INGREDIENT_LIBRARY);

  // Async initialization: load all data from IndexedDB (auto-migrates older schema versions)
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadAllData({
          theme: 'light',
          workplaceMode: true,
          homeIngredients: [],
          recipes,
          ingredientLibrary: INGREDIENT_LIBRARY,
        });

        setTheme(data.theme);
        setWorkplaceMode(data.workplaceMode);
        setHomeIngredients(data.homeIngredients || []);
        setRecipesList(normalizeRecipesList(data.recipes));
        setIngredientLibraryList(data.ingredientLibrary);
      } catch (err) {
        console.error('Failed to load data from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

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
  const [newRecipeTotalTime, setNewRecipeTotalTime] = useState('');
  const [newRecipeDifficulty, setNewRecipeDifficulty] = useState('medium');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState(() => [createEmptyIngredientEntry()]);
  const [newRecipeSteps, setNewRecipeSteps] = useState(() => [createEmptyStepEntry()]);
  const [recipeFormMessage, setRecipeFormMessage] = useState('');

  // Data import/export
  const fileInputRef = useRef(null);
  const [dataMessage, setDataMessage] = useState('');
  const [dataMessageType, setDataMessageType] = useState('success'); // 'success' | 'error'
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.2.0';
  const appBuildTime = typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '最新构建';

  const handleUpdateApp = async () => {
    if (isUpdatingApp) return;
    setIsUpdatingApp(true);
    pushAppToast({
      title: '正在检查并拉取最新资源...',
      description: '正在连接服务器更新 Service Worker 并刷新静态缓存。',
      tone: 'brand',
    });

    try {
      await forceCheckAndApplyAppUpdate();
      pushAppToast({
        title: '更新成功，正在应用新版本',
        description: '页面即将自动刷新载入全部新资源。',
        tone: 'success',
      });
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      setIsUpdatingApp(false);
      pushAppToast({
        title: '更新检查失败',
        description: err?.message || '网络连接超时，请稍后重试',
        tone: 'danger',
      });
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      appName: '日常菜谱',
      data: {
        theme,
        workplaceMode,
        homeIngredients,
        recipes: normalizeRecipesList(recipesList),
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

        const incomingVersion =
          typeof raw.version === 'number' && raw.version >= 1 ? Math.floor(raw.version) : 1;

        // Migrate sequentially if version is older than DATA_VERSION, otherwise safe-normalize
        const restored =
          incomingVersion < DATA_VERSION
            ? migrateData({ version: incomingVersion, data: raw.data })
            : safeRestoreData(raw.data);

        // Apply to state (IndexedDB saves are handled by useEffect watchers)
        setTheme(restored.theme);
        document.documentElement.setAttribute('data-theme', restored.theme);
        saveTheme(restored.theme);
        
        setWorkplaceMode(restored.workplaceMode);
        saveWorkplaceMode(restored.workplaceMode);

        setHomeIngredients(restored.homeIngredients);
        saveHomeIngredients(restored.homeIngredients);
        
        if (restored.recipes.length > 0) {
          setRecipesList(restored.recipes);
        }
        
        if (restored.ingredientLibrary.length > 0) {
          setIngredientLibraryList(restored.ingredientLibrary);
        }

        const exportDate = raw.exportedAt ? new Date(raw.exportedAt).toLocaleString('zh-CN') : '未知时间';
        const versionInfo =
          incomingVersion < DATA_VERSION
            ? ` (已从 v${incomingVersion} 迁移至 v${DATA_VERSION})`
            : '';
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
    resetIngredientForm();
    setIngFormMessage(`✓ 食材「${newItem.name}」已保存`);
    setTimeout(() => setIngFormMessage(''), 3000);
  };

  const handleAddCustomRecipe = (e) => {
    e.preventDefault();
    if (!newRecipeTitle.trim()) {
      setRecipeFormMessage('请输入菜谱名称');
      return;
    }

    // Filter out empty ingredients and steps (preserving optional flag & alternatives)
    const validIngredients = newRecipeIngredients
      .map((ing) => {
        const baseType = ing.type || 'basic';
        const baseAmount = ing.amount.trim() || '适量';
        const cleanAlts = (ing.alternatives || [])
          .filter((alt) => alt.name.trim() !== '')
          .map((alt) => ({
            name: alt.name.trim(),
            amount: alt.amount.trim() || baseAmount,
            type: alt.type || baseType,
          }));

        if (ing.name.trim() !== '') {
          return {
            name: ing.name.trim(),
            amount: baseAmount,
            type: baseType,
            optional: Boolean(ing.optional),
            alternatives: cleanAlts,
          };
        }

        if (cleanAlts.length > 0) {
          const [firstAlt, ...restAlts] = cleanAlts;
          return {
            name: firstAlt.name,
            amount: firstAlt.amount,
            type: firstAlt.type || baseType,
            optional: Boolean(ing.optional),
            alternatives: restAlts,
          };
        }

        return null;
      })
      .filter(Boolean);

    const validSteps = newRecipeSteps
      .filter((step) => step.desc.trim() !== '')
      .map((step, idx) => {
        const stepTitle = step.title.trim() || `步骤 ${idx + 1}`;
        const validTimers = (step.timers || [])
          .filter((t) => parseInt(t.duration, 10) > 0)
          .map((t) => ({
            label: t.label.trim() || stepTitle,
            duration: parseInt(t.duration, 10),
          }));
        return {
          title: stepTitle,
          desc: step.desc.trim(),
          timers: validTimers,
        };
      });

    if (validIngredients.length === 0) {
      setRecipeFormMessage('请至少添加一个食材');
      return;
    }

    if (validSteps.length === 0) {
      setRecipeFormMessage('请至少添加一个烹饪步骤');
      return;
    }

    const firstBasicIng = (
      validIngredients.find((i) => i.type === 'basic' && !i.optional) ||
      validIngredients.find((i) => i.type === 'basic')
    )?.name;
    const cleanBasicName = firstBasicIng ? firstBasicIng.replace(/\s*\(.*?\)/g, '').trim() : '';
    const customTags = [newRecipeDifficulty === 'easy' ? '快手' : '家常'];
    if (cleanBasicName) customTags.push(cleanBasicName);

    const newRecipe = {
      id: generateRecipeId(),
      title: newRecipeTitle.trim(),
      englishTitle: '',
      chef: '自定义录入',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&fit=crop&q=80',
      image: 'assets/eggs.png', // Fallback cover image
      difficulty: newRecipeDifficulty,
      difficultyLabel: newRecipeDifficulty === 'easy' ? '极易上手' : newRecipeDifficulty === 'medium' ? '中等难度' : '困难挑战',
      totalTime: parseInt(newRecipeTotalTime) || 15,
      calories: 300,
      tags: customTags,
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
    
    // Clear form and close modal
    resetRecipeForm();
    setRecipeFormMessage(`✓ 菜谱「${newRecipe.title}」已保存`);
    setTimeout(() => setRecipeFormMessage(''), 3000);
  };

  const resetRecipeForm = () => {
    setNewRecipeTitle('');
    setNewRecipeDesc('');
    setNewRecipeTotalTime('');
    setNewRecipeDifficulty('medium');
    setNewRecipeIngredients([createEmptyIngredientEntry()]);
    setNewRecipeSteps([createEmptyStepEntry()]);
    setRecipeFormMessage('');
    setShowRecipeFormActive(false);
    setTimeout(() => setShowRecipeForm(false), 300);
  };

  const addRecipeStepTimer = (stepIdx) => {
    setNewRecipeSteps((prev) =>
      prev.map((step, i) =>
        i === stepIdx
          ? {
              ...step,
              timers: [...(step.timers || []), { label: '', duration: '' }],
            }
          : step
      )
    );
  };

  const updateRecipeStepTimer = (stepIdx, timerIdx, field, value) => {
    setNewRecipeSteps((prev) =>
      prev.map((step, i) =>
        i === stepIdx
          ? {
              ...step,
              timers: (step.timers || []).map((t, j) =>
                j === timerIdx ? { ...t, [field]: value } : t
              ),
            }
          : step
      )
    );
  };

  const removeRecipeStepTimer = (stepIdx, timerIdx) => {
    setNewRecipeSteps((prev) =>
      prev.map((step, i) =>
        i === stepIdx
          ? {
              ...step,
              timers: (step.timers || []).filter((_, j) => j !== timerIdx),
            }
          : step
      )
    );
  };

  const updateRecipeIngredientField = (idx, field, value) => {
    setNewRecipeIngredients((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addRecipeIngredientAlternative = (idx) => {
    setNewRecipeIngredients((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              alternatives: [...(item.alternatives || []), { name: '', amount: '' }],
            }
          : item
      )
    );
  };

  const updateRecipeIngredientAlternative = (idx, altIdx, field, value) => {
    setNewRecipeIngredients((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              alternatives: (item.alternatives || []).map((alt, j) =>
                j === altIdx ? { ...alt, [field]: value } : alt
              ),
            }
          : item
      )
    );
  };

  const removeRecipeIngredientAlternative = (idx, altIdx) => {
    setNewRecipeIngredients((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              alternatives: (item.alternatives || []).filter((_, j) => j !== altIdx),
            }
          : item
      )
    );
  };

  const openRecipeForm = () => {
    setShowRecipeForm(true);
    setTimeout(() => setShowRecipeFormActive(true), 30);
  };

  const resetIngredientForm = () => {
    setNewIngName('');
    setNewIngCategory('basic');
    setIngFormMessage('');
    setShowIngredientFormActive(false);
    setTimeout(() => setShowIngredientForm(false), 300);
  };

  const openIngredientForm = () => {
    setShowIngredientForm(true);
    setTimeout(() => setShowIngredientFormActive(true), 30);
  };

  const insertTagIntoStep = (stepIdx, tagName, tagType) => {
    const textarea = document.getElementById(`step-textarea-${stepIdx}`);
    if (!textarea) return;
    
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const prefix = tagType === 'basic' ? '主' : tagType === 'seasoning' ? '辅' : '香';
    const tagToInsert = `[${prefix}:${tagName}]`;
    
    const newText = text.substring(0, start) + tagToInsert + text.substring(end);
    
    const updated = [...newRecipeSteps];
    updated[stepIdx].desc = newText;
    setNewRecipeSteps(updated);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagToInsert.length, start + tagToInsert.length);
    }, 50);
  };

  // Static ingredient items
  const ingredients = initialIngredients;

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setSearchQuery('');
    setSelectedMaterialType(null); // Reset sub-view state
    if (tab !== 'settings') {
      setSettingsSubView(null);
    }
    const url = new URL(window.location.href);
    if (tab === 'settings') {
      url.searchParams.set('view', 'settings');
      url.hash = '';
    } else if (tab === 'ingredients') {
      url.searchParams.set('view', 'ingredients');
      url.hash = '';
    } else {
      url.searchParams.delete('view');
      url.hash = '';
    }
    window.history.replaceState({}, '', url);
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal active states
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalActive, setModalActive] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Ingredients checkbox states
  const [ingredientChecked, setIngredientChecked] = useState({});

  // Top-anchored in-app toast queue (complements OS-level PWA notifications)
  const { toasts: appToasts, push: pushAppToast, dismiss: dismissAppToast } = useToastQueue();

  // Steps active states
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Assistive timer block states (keyed by `${stepIdx}-${timerIdx}`, wall-clock synchronized)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerRunId, setTimerRunId] = useState(0);
  const [activeTimerKey, setActiveTimerKey] = useState(null);
  const [completedTimerKeys, setCompletedTimerKeys] = useState({});
  const initialRunSecondsRef = useRef(0);
  const activeTimerMetaRef = useRef(null);
  const cloudPushMessageIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const notifHintShownRef = useRef(false);

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep kitchen screen awake while an assistive timer is actively running
  useEffect(() => {
    let cancelled = false;
    if (isTimerRunning) {
      acquireCookingWakeLock().then((sentinel) => {
        if (cancelled) {
          releaseCookingWakeLock(sentinel);
        } else {
          wakeLockRef.current = sentinel;
        }
      });
    } else if (wakeLockRef.current) {
      releaseCookingWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
    }

    return () => {
      cancelled = true;
    };
  }, [isTimerRunning]);

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

  // Wall-clock synchronized assistive timer countdown (immune to mobile background interval drift)
  useEffect(() => {
    if (!isTimerRunning || initialRunSecondsRef.current <= 0) return undefined;

    const endAt = Date.now() + initialRunSecondsRef.current * 1000;
    const currentMeta = activeTimerMetaRef.current;
    let finished = false;

    // Schedule remote Web Push so iOS APNs / FCM wakes the phone up even if screen is locked
    if (currentMeta && initialRunSecondsRef.current > 0) {
      scheduleCloudTimerPush({
        delaySeconds: initialRunSecondsRef.current,
        recipeTitle: currentMeta.recipeTitle,
        timerLabel: currentMeta.timerLabel,
        stepTitle: currentMeta.stepTitle,
        tag: `recipe-timer-${currentMeta.key}`,
      }).then((res) => {
        if (res.ok && res.messageId) {
          cloudPushMessageIdRef.current = res.messageId;
        }
      });
    }

    const syncClock = () => {
      if (finished) return;
      const remainingMs = endAt - Date.now();

      if (remainingMs <= 0) {
        finished = true;
        const finishedMeta = activeTimerMetaRef.current;
        initialRunSecondsRef.current = 0;
        setIsTimerRunning(false);
        setTimerSecondsLeft(0);
        playBeepAlarm();

        if (finishedMeta) {
          setCompletedTimerKeys((prev) => ({ ...prev, [finishedMeta.key]: true }));
          sendSystemTimerNotification({
            recipeTitle: finishedMeta.recipeTitle,
            timerLabel: finishedMeta.timerLabel,
            stepTitle: finishedMeta.stepTitle,
          });
          pushAppToast({
            title: `⏰ ${finishedMeta.timerLabel} 已到时`,
            description: `「${finishedMeta.recipeTitle}」${finishedMeta.stepTitle} 辅助计时已完成`,
            tone: 'brand',
            duration: 7000,
          });
        }
        return;
      }

      const nextSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      setTimerSecondsLeft((prev) => (prev === nextSeconds ? prev : nextSeconds));
    };

    syncClock();
    const interval = window.setInterval(syncClock, 250);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncClock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (cloudPushMessageIdRef.current) {
        cancelCloudTimerPush(cloudPushMessageIdRef.current);
        cloudPushMessageIdRef.current = null;
      }
    };
  }, [isTimerRunning, timerRunId, pushAppToast]);


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
    setIngredientChecked({});
    setActiveStepIndex(0);
    setCompletedTimerKeys({});
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

  // Assistive Timer Block Control actions
  const toggleAssistTimer = (stepIdx, timerIdx, timerObj, stepTitle) => {
    const key = `${stepIdx}-${timerIdx}`;
    const recipeTitle = selectedRecipe?.title || '日常菜谱';
    const timerLabel = timerObj.label || stepTitle || '辅助计时';

    requestTimerNotificationPermission().then((perm) => {
      if (perm === 'ios-needs-install' && !notifHintShownRef.current) {
        notifHintShownRef.current = true;
        pushAppToast({
          title: 'iOS 系统通知提示',
          description: '在 Safari 点击「分享 → 添加到主屏幕」后打开，即可接收系统锁屏通知。',
          tone: 'warning',
        });
      }
    });

    setActiveStepIndex(stepIdx);

    // Switching to a different timer block or restarting a completed timer block
    if (activeTimerKey !== key || timerSecondsLeft <= 0) {
      setCompletedTimerKeys((prev) => {
        if (!prev[key]) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      activeTimerMetaRef.current = { key, recipeTitle, timerLabel, stepTitle };
      initialRunSecondsRef.current = timerObj.duration;
      setActiveTimerKey(key);
      setTimerSecondsLeft(timerObj.duration);
      setTimerRunId((n) => n + 1);
      setIsTimerRunning(true);
      return;
    }

    // Pausing currently running timer block
    if (isTimerRunning) {
      initialRunSecondsRef.current = timerSecondsLeft;
      setIsTimerRunning(false);
      return;
    }

    // Resuming paused timer block
    activeTimerMetaRef.current = { key, recipeTitle, timerLabel, stepTitle };
    initialRunSecondsRef.current = timerSecondsLeft;
    setTimerRunId((n) => n + 1);
    setIsTimerRunning(true);
  };

  const resetAssistTimer = (stepIdx, timerIdx, duration) => {
    const key = `${stepIdx}-${timerIdx}`;
    setCompletedTimerKeys((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    if (activeTimerKey === key) {
      initialRunSecondsRef.current = duration;
      setIsTimerRunning(false);
      setTimerSecondsLeft(duration);
    }
  };

  const resetTimerState = () => {
    if (cloudPushMessageIdRef.current) {
      cancelCloudTimerPush(cloudPushMessageIdRef.current);
      cloudPushMessageIdRef.current = null;
    }
    initialRunSecondsRef.current = 0;
    activeTimerMetaRef.current = null;
    setIsTimerRunning(false);
    setTimerSecondsLeft(0);
    setActiveTimerKey(null);
  };

  // Helper formatting minutes/seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered recipes list (matches title, English title, chef, primary ingredients, and alternatives)
  const filteredRecipes = recipesList.filter((recipe) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchesHeader =
      recipe.title.toLowerCase().includes(q) ||
      (recipe.englishTitle && recipe.englishTitle.toLowerCase().includes(q)) ||
      (recipe.chef && recipe.chef.toLowerCase().includes(q));
    if (matchesHeader) return true;
    return (recipe.ingredients || []).some(
      (ing) =>
        ing.name.toLowerCase().includes(q) ||
        (ing.alternatives || []).some((alt) => alt.name.toLowerCase().includes(q))
    );
  });

  const getIngredientCount = (type) => {
    return ingredients.filter(item => item.type === type).length;
  };

  // Filtered ingredients list for selected sub-view
  const filteredSubIngredients = ingredients.filter(item => {
    if (selectedMaterialType && item.type !== selectedMaterialType) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.recipeNames.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
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
          <h1 className="brand-title">日常菜谱</h1>
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

      {/* Search Area (Only for recipes feed) */}
      {currentTab === 'recipes' && (
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
      )}

      {/* Conditional Feeds */}
      {currentTab === 'recipes' && (
        <>
          {/* Main Feed */}
          <div className="recipe-feed">
            {filteredRecipes.map(recipe => (
              <MobilePressCard
                key={recipe.id}
                className="recipe-card"
                shellClassName="recipe-card-shell"
                onPress={() => handleOpenRecipe(recipe)}
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
                      <span>预计 {recipe.totalTime ?? ((recipe.prepTime || 0) + (recipe.cookTime || 0))} 分钟</span>
                    </div>
                  </div>
                  <div className="card-tags">
                    {recipe.tags.map((tag, idx) => (
                      <span key={idx} className={`lozenge ${recipe.tagClasses[idx] || 'lozenge-default'}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </MobilePressCard>
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
                <div className="portal-card" onClick={() => { setSelectedMaterialType('basic'); setSearchQuery(''); }}>
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
                    <span>已收录: <strong>{getIngredientCount('basic')}</strong> 种常用食材</span>
                  </div>
                </div>

                {/* Card 2: Seasonings */}
                <div className="portal-card" onClick={() => { setSelectedMaterialType('seasoning'); setSearchQuery(''); }}>
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
                    <span>已收录: <strong>{getIngredientCount('seasoning')}</strong> 种调味酱料</span>
                  </div>
                </div>

                {/* Card 3: Spices */}
                <div className="portal-card" onClick={() => { setSelectedMaterialType('spice'); setSearchQuery(''); }}>
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
                    <span>已收录: <strong>{getIngredientCount('spice')}</strong> 种天然香料</span>
                  </div>
                </div>
              </div>

              {/* Group 2: Quick Entry Action */}
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <div className="portal-action-row">
                  <div className="portal-card action-card" onClick={openIngredientForm}>
                    <div className="action-card-content">
                      <div className="portal-card-icon-wrapper entry-ing">
                        <Plus size={20} strokeWidth={2.5} />
                      </div>
                      <span className="action-card-title">快速录入食材</span>
                      <span className="action-card-count">已录入 {Math.max(0, ingredientLibraryList.length - 20)} 种材料</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Sub-views */
            <>
              {/* Materials Detailed Sub-view */}
              {(selectedMaterialType === 'basic' || selectedMaterialType === 'seasoning' || selectedMaterialType === 'spice') && (
                <div className="subview-container">
                  {/* Back Header */}
                  <div className="subview-header">
                    <button className="btn-back" onClick={() => { setSelectedMaterialType(null); setSearchQuery(''); }} title="返回入口">
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

            </>
          )}
        </div>
      )}


      {/* ===== Ingredient Entry Modal ===== */}
      {showIngredientForm && (
        <div
          className={`recipe-modal ${showIngredientFormActive ? 'active' : ''}`}
          onClick={(e) => { if (e.target.classList.contains('recipe-modal')) resetIngredientForm(); }}
        >
          <div className="modal-content-container form-modal-container">
            <div className="modal-header">
              <h2 className="modal-header-title">录入食材</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={resetIngredientForm}
                aria-label="关闭"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>
            <div className="modal-body form-modal-body">
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
                    autoFocus
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

                <button type="submit" className="btn-bulk-action" style={{ marginTop: 'var(--spacing-xs)', width: '100%', height: '44px' }}>
                  保存食材
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Recipe Entry Modal ===== */}
      {showRecipeForm && (
        <div
          className={`recipe-modal ${showRecipeFormActive ? 'active' : ''}`}
          onClick={(e) => { if (e.target.classList.contains('recipe-modal')) resetRecipeForm(); }}
        >
          <div className="modal-content-container form-modal-container">
            <div className="modal-header">
              <h2 className="modal-header-title">录入菜谱</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={resetRecipeForm}
                aria-label="关闭"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>
            <div className="modal-body form-modal-body">
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
                    autoFocus
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

                <div className="entry-form-group">
                  <label className="entry-form-label">预计总时间 (分钟)</label>
                  <input
                    type="number"
                    className="entry-form-input"
                    placeholder="如：25"
                    value={newRecipeTotalTime}
                    onChange={(e) => setNewRecipeTotalTime(e.target.value)}
                  />
                </div>

                <div className="entry-form-group">
                  <label className="entry-form-label">烹饪难度</label>
                  <MobileSegmented
                    value={newRecipeDifficulty}
                    onChange={setNewRecipeDifficulty}
                    items={[
                      { value: 'easy', label: '极易上手' },
                      { value: 'medium', label: '中等难度' },
                      { value: 'hard', label: '困难挑战' },
                    ]}
                  />
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

                {/* Dynamic Ingredients list (supports Optional flag & Parallel Alternatives) */}
                <div className="entry-form-group">
                  <label className="entry-form-label">所需材料清单</label>
                  <div className="entry-form-row-group">
                    {newRecipeIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className={`ing-entry-card ${ing.optional ? 'is-optional' : ''}`}
                      >
                        <div className="dynamic-row">
                          <select
                            className="entry-form-select"
                            style={{ flex: 0.8, minWidth: '58px', height: '34px', padding: '0 4px', fontSize: '12px' }}
                            value={ing.type || 'basic'}
                            onChange={(e) => updateRecipeIngredientField(idx, 'type', e.target.value)}
                          >
                            <option value="basic">主料</option>
                            <option value="seasoning">辅料</option>
                            <option value="spice">香料</option>
                          </select>
                          <input
                            type="text"
                            className="entry-form-input"
                            placeholder="食材名称，如：牛肉末"
                            value={ing.name}
                            onChange={(e) => updateRecipeIngredientField(idx, 'name', e.target.value)}
                            style={{ flex: 2 }}
                          />
                          <input
                            type="text"
                            className="entry-form-input"
                            placeholder="分量，如：80克"
                            value={ing.amount}
                            onChange={(e) => updateRecipeIngredientField(idx, 'amount', e.target.value)}
                            style={{ flex: 1 }}
                          />
                          {newRecipeIngredients.length > 1 && (
                            <button
                              type="button"
                              className="btn-row-action delete"
                              aria-label="删除材料"
                              onClick={() =>
                                setNewRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="ing-entry-toolbar">
                          <button
                            type="button"
                            className={`ing-opt-chip ${ing.optional ? 'active' : ''}`}
                            aria-pressed={Boolean(ing.optional)}
                            onClick={() => updateRecipeIngredientField(idx, 'optional', !ing.optional)}
                          >
                            {ing.optional ? '✓ 可选材料（可不放）' : '设为可选'}
                          </button>
                          <button
                            type="button"
                            className="ing-alt-add-btn"
                            onClick={() => addRecipeIngredientAlternative(idx)}
                          >
                            <Plus size={12} strokeWidth={2.5} /> 添加备选替换
                          </button>
                        </div>

                        {(ing.alternatives || []).length > 0 && (
                          <div className="ing-alt-editor-list">
                            {ing.alternatives.map((alt, altIdx) => (
                              <div key={altIdx} className="dynamic-row ing-alt-editor-row">
                                <span className="ing-alt-badge">备选</span>
                                <input
                                  type="text"
                                  className="entry-form-input"
                                  placeholder="替换材料，如：猪肉末"
                                  value={alt.name}
                                  onChange={(e) =>
                                    updateRecipeIngredientAlternative(idx, altIdx, 'name', e.target.value)
                                  }
                                  style={{ flex: 2 }}
                                />
                                <input
                                  type="text"
                                  className="entry-form-input"
                                  placeholder={
                                    ing.amount.trim() ? `同上 (${ing.amount.trim()})` : '分量，如：80克'
                                  }
                                  value={alt.amount}
                                  onChange={(e) =>
                                    updateRecipeIngredientAlternative(idx, altIdx, 'amount', e.target.value)
                                  }
                                  style={{ flex: 1.15 }}
                                />
                                <button
                                  type="button"
                                  className="btn-row-action delete"
                                  aria-label="删除备选材料"
                                  onClick={() => removeRecipeIngredientAlternative(idx, altIdx)}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="recipe-link-btn"
                      onClick={() =>
                        setNewRecipeIngredients((prev) => [...prev, createEmptyIngredientEntry()])
                      }
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', alignSelf: 'flex-start', marginTop: '4px' }}
                    >
                      <Plus size={12} strokeWidth={3} /> 添加一行材料
                    </button>
                  </div>
                </div>

                {/* Dynamic Steps list (steps default to no timer; optional assistive timer blocks can be added on demand) */}
                <div className="entry-form-group">
                  <label className="entry-form-label">烹饪步骤</label>
                  <div className="entry-form-row-group">
                    {newRecipeSteps.map((step, idx) => (
                      <div key={idx} className="ing-entry-card">
                        <div className="dynamic-row">
                          <input
                            type="text"
                            className="entry-form-input"
                            placeholder={`步骤 ${idx + 1} 标题 (如: 豆腐焯水与准备)`}
                            value={step.title}
                            onChange={(e) => {
                              setNewRecipeSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                              );
                            }}
                            style={{ flex: 1 }}
                          />
                          {newRecipeSteps.length > 1 && (
                            <button
                              type="button"
                              className="btn-row-action delete"
                              aria-label="删除步骤"
                              onClick={() => setNewRecipeSteps(newRecipeSteps.filter((_, i) => i !== idx))}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {/* Quick Insert Pills (includes primary & alternative materials) */}
                        {(() => {
                          const insertTokens = [];
                          newRecipeIngredients.forEach((ing) => {
                            const tagType = ing.type || 'basic';
                            if (ing.name.trim() !== '') {
                              insertTokens.push({ name: ing.name.trim(), type: tagType, isAlt: false });
                            }
                            (ing.alternatives || []).forEach((alt) => {
                              if (alt.name.trim() !== '') {
                                insertTokens.push({
                                  name: alt.name.trim(),
                                  type: alt.type || tagType,
                                  isAlt: true,
                                });
                              }
                            });
                          });
                          if (insertTokens.length === 0) return null;
                          return (
                            <div className="quick-insert-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', margin: '2px 0 4px 0' }}>
                              <span style={{ fontSize: '11px', color: 'var(--ds-text-subtle)', fontWeight: '500' }}>点击快速插入材料标记:</span>
                              {insertTokens.map((tok, i) => {
                                const labelColor = tok.type === 'basic' ? '#d03e2d' : tok.type === 'seasoning' ? '#00875a' : '#6554c0';
                                const bgColor = tok.type === 'basic' ? 'rgba(224, 62, 45, 0.06)' : tok.type === 'seasoning' ? 'rgba(0, 135, 90, 0.06)' : 'rgba(101, 84, 192, 0.06)';
                                const typeLabel = tok.type === 'basic' ? '主' : tok.type === 'seasoning' ? '辅' : '香';
                                return (
                                  <button
                                    key={`${tok.name}-${i}`}
                                    type="button"
                                    onClick={() => insertTagIntoStep(idx, tok.name, tok.type)}
                                    className="category-chip"
                                    style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', backgroundColor: bgColor, color: 'var(--ds-text)' }}
                                  >
                                    <span style={{ fontWeight: '700', color: labelColor }}>
                                      {tok.isAlt ? `${typeLabel}·备` : typeLabel}
                                    </span>
                                    <span>{tok.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <textarea
                          id={`step-textarea-${idx}`}
                          className="entry-form-textarea"
                          placeholder="描述具体步骤，可用[材料名]来标记高亮（例如：放入[豆腐]翻炒）"
                          value={step.desc}
                          onChange={(e) => {
                            setNewRecipeSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, desc: e.target.value } : s))
                            );
                          }}
                          style={{ minHeight: '60px' }}
                        />

                        {/* Optional Assistive Timer Blocks for this step */}
                        {(step.timers || []).length > 0 && (
                          <div className="ing-alt-editor-list">
                            {step.timers.map((tm, tIdx) => (
                              <div key={tIdx} className="dynamic-row ing-alt-editor-row">
                                <span className="ing-alt-badge">计时</span>
                                <input
                                  type="text"
                                  className="entry-form-input"
                                  placeholder="计时项，如：豆腐焯水 / 小火慢炖"
                                  value={tm.label}
                                  onChange={(e) =>
                                    updateRecipeStepTimer(idx, tIdx, 'label', e.target.value)
                                  }
                                  style={{ flex: 2 }}
                                />
                                <input
                                  type="number"
                                  min="1"
                                  className="entry-form-input"
                                  placeholder="秒数，如：60"
                                  value={tm.duration}
                                  onChange={(e) =>
                                    updateRecipeStepTimer(idx, tIdx, 'duration', e.target.value)
                                  }
                                  style={{ flex: 1.05 }}
                                />
                                <button
                                  type="button"
                                  className="btn-row-action delete"
                                  aria-label="删除计时版块"
                                  onClick={() => removeRecipeStepTimer(idx, tIdx)}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="ing-entry-toolbar">
                          <span style={{ fontSize: '11px', color: 'var(--ds-text-subtle)' }}>
                            {(step.timers || []).length > 0
                              ? `已标注 ${step.timers.length} 个辅助计时版块`
                              : '常规步骤无需计时'}
                          </span>
                          <button
                            type="button"
                            className="ing-alt-add-btn"
                            onClick={() => addRecipeStepTimer(idx)}
                          >
                            <Clock size={12} strokeWidth={2.5} /> 添加计时版块
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="recipe-link-btn"
                      onClick={() => setNewRecipeSteps((prev) => [...prev, createEmptyStepEntry()])}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', alignSelf: 'flex-start', marginTop: '4px' }}
                    >
                      <Plus size={12} strokeWidth={3} /> 添加下一个步骤
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-bulk-action" style={{ marginTop: 'var(--spacing-xs)', width: '100%', height: '44px' }}>
                  保存菜谱
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Detail Bottom Sheet Modal ===== */}
      {selectedRecipe && (
        <div className={`recipe-modal ${modalActive ? 'active' : ''}`} onClick={(e) => {
          if (e.target.classList.contains('recipe-modal')) handleCloseRecipe();
        }}>
          <div className="modal-content-container">
            <div className="modal-header">
              <h2 className="modal-header-title">{selectedRecipe.title}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseRecipe}
                aria-label="关闭"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>

            <div className="modal-body">
              {/* Top Cover */}
              <div className="modal-cover">
                <img className="modal-cover-img" src={selectedRecipe.image} alt={selectedRecipe.title} />
                <span className={`difficulty-badge ${selectedRecipe.difficulty}`}>{selectedRecipe.difficultyLabel}</span>
              </div>

              {/* Meta Intro */}
              <div className="modal-intro">
                {selectedRecipe.englishTitle && (
                  <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', marginBottom: '2px' }}>
                    {selectedRecipe.englishTitle}
                  </div>
                )}
                <div className="card-meta">
                  <div className="meta-item">
                    <Clock size={14} strokeWidth={2.5} />
                    <span>预计 {selectedRecipe.totalTime ?? ((selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0))} 分钟</span>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ds-text-subtle)', lineHeight: '1.6', marginTop: 'var(--spacing-xs)' }}>
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

              {/* Tab 1 Panel (Ingredients: Required vs Optional Progress + Parallel Alternative Groups) */}
              <div className={`tab-panel ${activeTab === 0 ? 'active' : ''}`}>
                {(() => {
                  const recipeIngredients = selectedRecipe.ingredients || [];
                  const requiredEntries = recipeIngredients
                    .map((ing, idx) => ({ ing, idx }))
                    .filter(({ ing }) => !ing.optional);
                  const optionalEntries = recipeIngredients
                    .map((ing, idx) => ({ ing, idx }))
                    .filter(({ ing }) => Boolean(ing.optional));

                  const requiredDoneCount = requiredEntries.filter(({ ing, idx }) =>
                    isIngredientGroupSatisfied(ing, idx, ingredientChecked)
                  ).length;
                  const optionalDoneCount = optionalEntries.filter(({ ing, idx }) =>
                    isIngredientGroupSatisfied(ing, idx, ingredientChecked)
                  ).length;
                  const allRequiredDone =
                    requiredEntries.length > 0 && requiredDoneCount === requiredEntries.length;

                  return (
                    <>
                      <div className="ingredients-header">
                        <h4 className="step-title">所需材料清单</h4>
                        <div className="ingredients-count-group">
                          {requiredEntries.length > 0 && (
                            <span
                              className={`ing-progress-pill required ${allRequiredDone ? 'all-done' : ''}`}
                            >
                              {allRequiredDone ? '✓ ' : ''}必选 {requiredDoneCount}/{requiredEntries.length}
                            </span>
                          )}
                          {optionalEntries.length > 0 && (
                            <span
                              className={`ing-progress-pill optional ${optionalDoneCount > 0 ? 'has-checked' : ''}`}
                            >
                              可选 {optionalDoneCount}/{optionalEntries.length}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ingredient-list">
                        {recipeIngredients.map((ing, idx) => {
                          const options = getIngredientGroupOptions(ing);
                          const groupSatisfied = isIngredientGroupSatisfied(
                            ing,
                            idx,
                            ingredientChecked
                          );

                          if (options.length === 1) {
                            const checkKey = `${idx}-0`;
                            const isChecked = Boolean(ingredientChecked[checkKey]);
                            const optType = ing.type || 'basic';
                            const typeLabel =
                              optType === 'basic' ? '主' : optType === 'seasoning' ? '辅' : '香';

                            return (
                              <label
                                key={idx}
                                className={`ingredient-item ${isChecked ? 'completed' : ''} ${ing.optional ? 'is-optional' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  className="ingredient-checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIngredientChecked((prev) => ({
                                      ...prev,
                                      [checkKey]: checked,
                                    }));
                                  }}
                                />
                                <span className="custom-checkmark">
                                  <svg viewBox="0 0 12 12">
                                    <path d="M2 6l3 3 5-6" />
                                  </svg>
                                </span>
                                <span className="ingredient-name">
                                  <span className={`ing-type-badge ${optType}`}>{typeLabel}</span>
                                  <span className="ing-name-text">{ing.name}</span>
                                  {ing.optional && <span className="ing-optional-badge">可选</span>}
                                </span>
                                <span className="ingredient-amount">{ing.amount}</span>
                              </label>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className={`ingredient-group ${groupSatisfied ? 'satisfied' : ''} ${ing.optional ? 'is-optional' : ''}`}
                            >
                              <div className="ingredient-group-header">
                                <div className="ingredient-group-title">
                                  <span className="ing-group-label">备选组 · 任选其一</span>
                                  {ing.optional && <span className="ing-optional-badge">可选</span>}
                                </div>
                                <span
                                  className={`ing-group-status ${groupSatisfied ? 'done' : ''}`}
                                >
                                  {groupSatisfied ? '✓ 已备齐' : `${options.length} 选 1`}
                                </span>
                              </div>

                              <div className="ingredient-group-items">
                                {options.map((opt, optIdx) => {
                                  const checkKey = `${idx}-${optIdx}`;
                                  const isChecked = Boolean(ingredientChecked[checkKey]);
                                  const isSubstituted = groupSatisfied && !isChecked;
                                  const optType = opt.type || ing.type || 'basic';
                                  const typeLabel =
                                    optType === 'basic'
                                      ? '主'
                                      : optType === 'seasoning'
                                        ? '辅'
                                        : '香';

                                  return (
                                    <label
                                      key={checkKey}
                                      className={`ingredient-item in-group ${isChecked ? 'completed' : ''} ${isSubstituted ? 'substituted' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="ingredient-checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setIngredientChecked((prev) => ({
                                            ...prev,
                                            [checkKey]: checked,
                                          }));
                                        }}
                                      />
                                      <span className="custom-checkmark">
                                        <svg viewBox="0 0 12 12">
                                          <path d="M2 6l3 3 5-6" />
                                        </svg>
                                      </span>
                                      <span className="ingredient-name">
                                        <span className={`ing-type-badge ${optType}`}>
                                          {typeLabel}
                                        </span>
                                        {optIdx > 0 && (
                                          <span className="ing-alt-badge">备选</span>
                                        )}
                                        <span className="ing-name-text">{opt.name}</span>
                                      </span>
                                      <span className="ingredient-amount">
                                        {isSubstituted && (
                                          <span className="ing-subbed-note">免备</span>
                                        )}
                                        {opt.amount}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Tab 2 Panel (Steps — only renders assistive timer blocks on annotated timed segments) */}
              <div className={`tab-panel ${activeTab === 1 ? 'active' : ''}`}>
                <div className="steps-container">
                  {selectedRecipe.steps.map((step, idx) => {
                    const isActive = activeStepIndex === idx;
                    const stepTimers = getStepTimers(step);
                    
                    return (
                      <div 
                        key={idx}
                        className={`step-card ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveStepIndex(idx)}
                      >
                        <div className="step-number-bubble">{idx + 1}</div>
                        <div className="step-content">
                          <div className="step-title">{step.title}</div>
                          <div className="step-desc">
                            {renderStepText(step.desc)}
                          </div>
                          {stepTimers.length > 0 && (
                            <div className="step-timer-list" onClick={(e) => e.stopPropagation()}>
                              {stepTimers.map((tm, tIdx) => {
                                const tKey = `${idx}-${tIdx}`;
                                const isThisActive = activeTimerKey === tKey;
                                const isThisRunning = isTimerRunning && isThisActive;
                                const isThisDone = Boolean(completedTimerKeys[tKey]);
                                const secondsDisplay = isThisActive
                                  ? timerSecondsLeft
                                  : isThisDone
                                    ? 0
                                    : tm.duration;
                                const showReset =
                                  isThisDone ||
                                  (isThisActive && timerSecondsLeft !== tm.duration);

                                return (
                                  <div
                                    key={tKey}
                                    className={`step-timer-wrapper ${isThisRunning ? 'is-running' : ''} ${isThisDone ? 'is-done' : ''}`}
                                  >
                                    <div className="step-timer-meta">
                                      <Clock size={14} strokeWidth={2.3} className="step-timer-icon" />
                                      <span className="step-timer-label">
                                        {tm.label || '辅助计时'}
                                      </span>
                                      {isThisRunning && (
                                        <span className="step-timer-badge running">计时中</span>
                                      )}
                                      {isThisDone && !isThisRunning && (
                                        <span className="step-timer-badge done">✓ 已到时</span>
                                      )}
                                    </div>
                                    <div className="step-timer-right">
                                      <span className="timer-digits">{formatTime(secondsDisplay)}</span>
                                      <div className="timer-controls">
                                        <button
                                          type="button"
                                          className="btn-timer btn-play-pause"
                                          title={isThisRunning ? '暂停计时' : '开始辅助计时'}
                                          aria-label={isThisRunning ? '暂停计时' : '开始辅助计时'}
                                          onClick={() =>
                                            toggleAssistTimer(idx, tIdx, tm, step.title)
                                          }
                                        >
                                          {isThisRunning ? <Pause size={13} /> : <Play size={13} />}
                                        </button>
                                        {showReset && (
                                          <button
                                            type="button"
                                            className="btn-timer btn-reset"
                                            title="重置计时"
                                            aria-label="重置计时"
                                            onClick={() =>
                                              resetAssistTimer(idx, tIdx, tm.duration)
                                            }
                                          >
                                            <RotateCcw size={13} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* Tab 3: System Settings & Workbench */}
      {currentTab === 'settings' && (
        <div className="subview-container">
          {settingsSubView === 'inspector' ? (
            <div>
              <div className="subview-header" style={{ paddingInline: 'var(--spacing-md)' }}>
                <button
                  type="button"
                  className="btn-back"
                  onClick={() => setSettingsSubView(null)}
                  title="返回系统设置"
                >
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                <div className="subview-title-group">
                  <h2 className="subview-title">组件规范与实测台</h2>
                  <span className="subview-subtitle">移动端手势按压、时序动画与系统通知</span>
                </div>
              </div>
              <ComponentInspectorPage />
            </div>
          ) : (
            <div className="portal-container" style={{ paddingTop: 'var(--spacing-xs)' }}>
              {/* Group 1: Recipe & Ingredient Entry Workbenches */}
              <h3 className="portal-section-title">录入工作台</h3>
              <div className="portal-action-row">
                <div className="portal-card action-card" onClick={openRecipeForm}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper entry-rec">
                      <ChefHat size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">录入菜谱</span>
                    <span className="action-card-count">
                      已录入 {recipesList.filter((r) => r.chef === '自定义录入').length} 道私房菜
                    </span>
                  </div>
                </div>

                <div className="portal-card action-card" onClick={openIngredientForm}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper entry-ing">
                      <Plus size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">录入食材</span>
                    <span className="action-card-count">
                      已扩展 {Math.max(0, ingredientLibraryList.length - 20)} 种材料
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 2: Data Backup & Migration */}
              <h3 className="portal-section-title" style={{ marginTop: 'var(--spacing-md)' }}>
                数据备份与迁移
              </h3>
              {dataMessage && (
                <div
                  className={`form-message-banner ${dataMessageType === 'error' ? 'error' : ''}`}
                  style={{ marginBottom: 'var(--spacing-sm)' }}
                >
                  {dataMessage}
                </div>
              )}
              <div className="portal-action-row">
                <div className="portal-card action-card" onClick={handleExportData}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper data-export">
                      <Download size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">导出备份</span>
                    <span className="action-card-count">v{DATA_VERSION} · JSON 格式</span>
                  </div>
                </div>

                <div className="portal-card action-card" onClick={() => fileInputRef.current?.click()}>
                  <div className="action-card-content">
                    <div className="portal-card-icon-wrapper data-import">
                      <Upload size={20} strokeWidth={2.5} />
                    </div>
                    <span className="action-card-title">导入恢复</span>
                    <span className="action-card-count">全自动版本迁移</span>
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

              {/* Group 3: App Version & Remote Update */}
              <h3 className="portal-section-title" style={{ marginTop: 'var(--spacing-md)' }}>
                版本与系统更新
              </h3>
              <div
                className="portal-card"
                onClick={handleUpdateApp}
                style={{ cursor: isUpdatingApp ? 'progress' : 'pointer' }}
              >
                <div className="portal-card-main">
                  <div
                    className="portal-card-icon-wrapper"
                    style={{
                      backgroundColor: 'var(--brand-subtle)',
                      color: 'var(--ds-text-brand)',
                    }}
                  >
                    <RefreshCw
                      size={20}
                      strokeWidth={2.5}
                      style={{ animation: isUpdatingApp ? 'm-spin 900ms linear infinite' : 'none' }}
                    />
                  </div>
                  <div className="portal-card-info">
                    <h3 className="portal-card-title">
                      {isUpdatingApp ? '正在检查并更新应用...' : '检查并拉取最新资源'}
                    </h3>
                    <p className="portal-card-desc">
                      刷新 Service Worker 与静态缓存，免退出直接载入最新功能
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-status-filter active"
                    style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0, height: '30px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateApp();
                    }}
                  >
                    {isUpdatingApp ? '更新中' : '立即更新'}
                  </button>
                </div>
                <div className="portal-card-footer">
                  <span>当前版本: <strong>v{appVersion}</strong>（构建于 {appBuildTime}）</span>
                </div>
              </div>

              {/* Group 4: Design Specs & Lab Entry */}
              <h3 className="portal-section-title" style={{ marginTop: 'var(--spacing-md)' }}>
                开发者与规范工具
              </h3>
              <div
                className="portal-card"
                onClick={() => setSettingsSubView('inspector')}
                style={{ cursor: 'pointer' }}
              >
                <div className="portal-card-main">
                  <div className="portal-card-icon-wrapper" style={{ backgroundColor: 'var(--brand-subtle)', color: 'var(--ds-text-brand)' }}>
                    <Layers size={22} strokeWidth={2.5} />
                  </div>
                  <div className="portal-card-info">
                    <h3 className="portal-card-title">组件检查台与 PWA 实测</h3>
                    <p className="portal-card-desc">
                      时序动画、表面分离、三档密度与 iOS 锁屏 Web Push 诊断实测
                    </p>
                  </div>
                  <ChevronRight size={18} className="portal-card-chevron" />
                </div>
                <div className="portal-card-footer">
                  <span>点击进入独立设计检查台</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-Anchored Mobile Notification Region for Assistive Timers */}
      <MobileToastRegion toasts={appToasts} onDismiss={dismissAppToast} placement="top" />

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
          className={`bottom-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          <Settings className="bottom-nav-icon" size={20} strokeWidth={2.5} />
          <span className="bottom-nav-label">系统设置</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
