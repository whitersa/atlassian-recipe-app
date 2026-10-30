import { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Plus,
  Check,
  Trash2,
  TriangleAlert,
  Sparkles,
  Clock,
  UtensilsCrossed,
  Layers,
  ArrowUpDown,
  Bell,
  Share2,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  inspectPwaNotificationCapabilities,
  requestTimerNotificationPermission,
  sendSystemTimerNotificationDetailed,
} from '../../notifications';
import { useMotionEnvironment } from '../motion/useReducedMotion';
import { MotionList } from '../motion/MotionList';
import { MobileButton } from '../button/MobileButton';
import { MobileTabs } from '../tabs/MobileTabs';
import { MobileSegmented } from '../tabs/MobileSegmented';
import { MobileField } from '../form/MobileField';
import { MobileInput, MobileTextarea } from '../form/MobileInput';
import { MobileSelect } from '../form/MobileSelect';
import { MobileStepper } from '../form/MobileStepper';
import { MobileSwitch } from '../form/MobileSwitch';
import { MobileStatusBadge } from '../status/MobileStatusBadge';
import { ProcessingNode } from '../status/ProcessingNode';
import { MobileExpandCard } from '../card/MobileExpandCard';
import { MobileSheet } from '../overlay/MobileSheet';
import { MobileOriginDialog } from '../overlay/MobileOriginDialog';
import { MobileSharedDetail } from '../overlay/MobileSharedDetail';
import { useToastQueue } from '../toast/useToastQueue';
import { MobileToastRegion } from '../toast/MobileToastRegion';
import { P } from '../propTypes';

const INSPECTOR_TABS = [
  { value: 'controls', label: '控件与表单' },
  { value: 'motion', label: '空间与连续动效' },
];

const CONTROL_ANCHORS = [
  { id: 'sec-pwa-notify', label: '00 PWA 通知实测' },
  { id: 'sec-buttons', label: '01 按钮与风险确认' },
  { id: 'sec-tabs', label: '02 页签与分段' },
  { id: 'sec-forms', label: '03 表单与三档密度' },
  { id: 'sec-status', label: '04 状态与 1600ms 节点' },
];

const MOTION_ANCHORS = [
  { id: 'sec-pwa-notify', label: '00 PWA 通知实测' },
  { id: 'sec-sheet', label: '01 直角分步抽屉' },
  { id: 'sec-origin', label: '02 200ms 来源弹窗' },
  { id: 'sec-shared', label: '03 同源展开详情' },
  { id: 'sec-list', label: '04 手风琴与重排列表' },
  { id: 'sec-toast', label: '05 连续通知队列' },
  { id: 'sec-specs', label: '06 时序规范速查' },
];

const MEAL_OPTIONS = [
  { value: 'breakfast', label: '早餐快手 · 10 分钟内' },
  { value: 'lunch', label: '工作午餐 · 下饭热菜' },
  { value: 'dinner', label: '家庭晚餐 · 慢炖硬菜' },
  { value: 'prep', label: '周末备菜 · 冷藏半成品（暂不可选）', disabled: true },
];

const EXTRA_INGREDIENTS_POOL = [
  { name: '二荆条干辣椒段', amount: '12 克', tag: '香辛' },
  { name: '永川九制豆豉', amount: '1 茶匙', tag: '酱料' },
  { name: '手切黄牛肉末', amount: '100 克', tag: '主料' },
  { name: '头道酿造生抽', amount: '1.5 汤匙', tag: '调味' },
  { name: '鲜榨菜籽油', amount: '25 毫升', tag: '油脂' },
];

function ControlsSpecimen({ pushToast }) {
  const [buttonLog, setButtonLog] = useState('点击上方任意按钮，观察 120ms 独立表面缩放（文字与热区保持 1:1 不动）。');
  const [syncLoading, setSyncLoading] = useState(false);

  // Risk confirmation dialogs (200ms button-origin)
  const warnBtnRef = useRef(null);
  const dangerBtnRef = useRef(null);
  const dangerCancelRef = useRef(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  // Tabs & segmented specimen
  const [recipeSubTab, setRecipeSubTab] = useState('main');
  const [viewMode, setViewMode] = useState('standard');
  const [autoTimerOn, setAutoTimerOn] = useState(true);
  const [unitDual, setUnitDual] = useState(false);

  // Form & 3-tier density specimen
  const [density, setDensity] = useState('default');
  const [dishName, setDishName] = useState('');
  const [mealType, setMealType] = useState('');
  const [servings, setServings] = useState(2);
  const [fireNote, setFireNote] = useState('');
  const [errors, setErrors] = useState({ dishName: '', mealType: '', fireNote: '' });

  // ProcessingNode interactive cooking steps
  const [cookSteps, setCookSteps] = useState([
    { id: 's1', title: '南豆腐切块加盐焯水 60 秒', meta: '去除豆腥味并让豆腐定型不易碎', completed: true },
    { id: 's2', title: '小火慢炒郫县豆瓣与剁碎豆豉', meta: '1600ms 匀速流光圆弧 · 持续进行中但绝不闪烁打扰', completed: false },
    { id: 's3', title: '分三次注入水淀粉勾芡收汁', meta: '待前序红油炒香完成后切换', completed: false },
  ]);

  const handleFakeSync = () => {
    if (syncLoading) return;
    setSyncLoading(true);
    setButtonLog('正在同步私房菜谱（按钮宽度与高度保持锁定，不发生布局跳动）...');
    window.setTimeout(() => {
      setSyncLoading(false);
      setButtonLog('✓ 私房菜谱同步完成，可连续再次触发。');
      pushToast({
        title: '私房菜谱已同步',
        description: '3 道川味家常菜与 18 项常用备料已写入本地存储。',
        tone: 'success',
      });
    }, 1200);
  };

  const triggerValidation = () => {
    const nextErrors = {
      dishName: dishName.trim() ? '' : '请输入菜品名称，例如「川味麻婆豆腐」',
      mealType: mealType ? '' : '请选择所属餐段分类',
      fireNote: fireNote.trim().length >= 6 ? '' : '请补充至少 6 个字的火候或勾芡提示',
    };
    if (!nextErrors.dishName && !nextErrors.mealType && !nextErrors.fireNote) {
      setErrors({
        dishName: '同名私房菜谱已存在，请补充风味后缀区分',
        mealType: '',
        fireNote: '',
      });
      return;
    }
    setErrors(nextErrors);
  };

  const fillValidSample = () => {
    setDishName('陈麻婆豆腐 · 家常少油版');
    setMealType('lunch');
    setServings(3);
    setFireNote('豆瓣酱需小火慢煸出红油，水淀粉分三次淋入避免吐水。');
    setErrors({ dishName: '', mealType: '', fireNote: '' });
  };

  const resetForm = () => {
    setDishName('');
    setMealType('');
    setServings(2);
    setFireNote('');
    setErrors({ dishName: '', mealType: '', fireNote: '' });
  };

  return (
    <div>
      {/* Section 01: Buttons */}
      <section id="sec-buttons" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">01</span>
          <h2 className="m-section-title">按钮层级、表面按压分离与风险确认</h2>
        </div>
        <p className="m-section-desc">
          按压时仅独立背景层 <code>.m-btn-surface</code> 在 120ms 内缩放至 <code>0.97</code>，文字、图标与外层点击热区保持
          1:1 静止；按下底色即时响应，悬停与松开按 320ms 平滑过渡。
        </p>

        <div className="m-subhead">6 种语义变体</div>
        <div className="m-row-wrap">
          <MobileButton
            variant="primary"
            icon={<Flame size={16} strokeWidth={2.2} />}
            onClick={() => setButtonLog('触发 Primary 主操作：保存当前菜谱步骤')}
          >
            保存菜谱
          </MobileButton>

          <MobileButton
            variant="secondary"
            onClick={() => setButtonLog('触发 Secondary 次按钮：加入今日备菜清单')}
          >
            加入备菜
          </MobileButton>

          <MobileButton
            variant="ghost"
            onClick={() => setButtonLog('触发 Ghost 轻量操作：稍后整理')}
          >
            稍后整理
          </MobileButton>

          <MobileButton
            variant="subtle"
            iconOnly
            aria-label="分享菜谱"
            title="Subtle 仅图标按钮"
            icon={<Share2 size={18} strokeWidth={2.1} />}
            onClick={() => setButtonLog('触发 Subtle 图标按钮：生成菜谱分享卡片')}
          />

          <MobileButton
            ref={warnBtnRef}
            variant="warning"
            onClick={() => setWarnOpen(true)}
          >
            覆盖做法
          </MobileButton>

          <MobileButton
            ref={dangerBtnRef}
            variant="danger"
            icon={<Trash2 size={15} strokeWidth={2.1} />}
            onClick={() => setDangerOpen(true)}
          >
            删除记录
          </MobileButton>
        </div>

        <div className="m-subhead">4 档高度尺寸（28 / 32 / 36 / 44px）</div>
        <div className="m-row-wrap">
          <MobileButton size="xs" variant="secondary" onClick={() => setButtonLog('XS 28px：紧凑标签旁辅助动作')}>
            XS 28px
          </MobileButton>
          <MobileButton size="sm" variant="secondary" onClick={() => setButtonLog('SM 32px：高密度工具条按钮')}>
            SM 32px
          </MobileButton>
          <MobileButton size="md" variant="secondary" onClick={() => setButtonLog('MD 36px：默认表单与弹窗操作')}>
            MD 36px
          </MobileButton>
          <MobileButton size="lg" variant="primary" onClick={() => setButtonLog('LG 44px：移动端拇指主触控规格')}>
            LG 44px 主触控
          </MobileButton>
        </div>

        <div className="m-subhead">零跳动加载态与禁用态</div>
        <div className="m-row-wrap">
          <MobileButton
            variant="primary"
            loading={syncLoading}
            icon={<Sparkles size={16} strokeWidth={2.2} />}
            onClick={handleFakeSync}
          >
            同步私房菜谱
          </MobileButton>
          <MobileButton variant="primary" disabled>
            主按钮禁用
          </MobileButton>
          <MobileButton variant="secondary" disabled>
            次按钮禁用
          </MobileButton>
        </div>

        <div className="m-feedback-box">{buttonLog}</div>

        {/* Warning 200ms Confirmation Dialog */}
        <MobileOriginDialog
          open={warnOpen}
          onClose={() => setWarnOpen(false)}
          triggerRef={warnBtnRef}
          title="确认覆盖现有烹饪步骤？"
          footer={
            <>
              <MobileButton variant="secondary" onClick={() => setWarnOpen(false)}>
                取消
              </MobileButton>
              <MobileButton
                variant="warning"
                onClick={() => {
                  setWarnOpen(false);
                  setButtonLog('已确认覆盖：使用新版三次勾芡步骤替换旧记录。');
                  pushToast({ title: '已覆盖烹饪步骤', description: '原版本已自动归档至历史快照。', tone: 'warning' });
                }}
              >
                继续覆盖
              </MobileButton>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--ds-text)' }}>
            当前「川味经典麻婆豆腐」包含自定义计时备注，覆盖后将以标准火候参数重设。
          </p>
        </MobileOriginDialog>

        {/* Danger 200ms Confirmation Dialog (Initial focus lands on Cancel!) */}
        <MobileOriginDialog
          open={dangerOpen}
          onClose={() => setDangerOpen(false)}
          triggerRef={dangerBtnRef}
          initialFocusRef={dangerCancelRef}
          title="删除该食材库存记录？"
          footer={
            <>
              <span className="m-dialog-footer-note">默认聚焦于取消键防误触</span>
              <MobileButton ref={dangerCancelRef} variant="secondary" onClick={() => setDangerOpen(false)}>
                取消
              </MobileButton>
              <MobileButton
                variant="danger"
                onClick={() => {
                  setDangerOpen(false);
                  setButtonLog('已执行危险操作确认：移除过期豆瓣酱记录。');
                  pushToast({ title: '食材记录已移除', description: '关联菜谱将标记为缺料待补货。', tone: 'danger' });
                }}
              >
                确认删除
              </MobileButton>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--ds-text)' }}>
            删除「郫县三年陈酿豆瓣酱」后，2 道川菜食谱的备料齐套状态将同步更新，此操作不可直接撤销。
          </p>
        </MobileOriginDialog>
      </section>

      {/* Section 02: Tabs & Segmented */}
      <section id="sec-tabs" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">02</span>
          <h2 className="m-section-title">页签指示条滑动与分段切换</h2>
        </div>
        <p className="m-section-desc">
          底部圆头指示条宽度取文字宽度的 70%，通过 320ms FLIP 位移平滑滑向新页签；新旧内容在同一 320ms 窗口内原位交叉淡入淡出，旧面板立即标记{' '}
          <code>inert</code> 防止快速连点误触。
        </p>

        <div className="m-subhead">MobileTabs 页签内容交叉过渡</div>
        <MobileTabs
          value={recipeSubTab}
          onChange={setRecipeSubTab}
          items={[
            { value: 'main', label: '备菜主料' },
            { value: 'sauce', label: '复合碗汁' },
            { value: 'heat', label: '火候要点' },
          ]}
          renderPanel={(tabKey) => {
            if (tabKey === 'main') {
              return (
                <div className="m-feedback-box" style={{ marginTop: 0 }}>
                  <strong style={{ color: 'var(--ds-text)', display: 'block', marginBottom: 4 }}>
                    石膏嫩豆腐 400g + 手切牛肉末 80g
                  </strong>
                  切 2cm 方块后沸水加少许盐焯烫 60 秒，既去豆腥又能在翻勺时保持完整棱角。
                </div>
              );
            }
            if (tabKey === 'sauce') {
              return (
                <div className="m-feedback-box" style={{ marginTop: 0 }}>
                  <strong style={{ color: 'var(--ds-text)', display: 'block', marginBottom: 4 }}>
                    郫县红油豆瓣 1.5 汤匙 + 永川豆豉 1 茶匙
                  </strong>
                  提前刀背剁细，配 150ml 鲜汤与分三次淋入的土豆水淀粉，形成亮红挂汁。
                </div>
              );
            }
            return (
              <div className="m-feedback-box" style={{ marginTop: 0 }}>
                <strong style={{ color: 'var(--ds-text)', display: 'block', marginBottom: 4 }}>
                  热锅凉油煸酥肉末 · 出锅撒汉源花椒面
                </strong>
                花椒面现焙现碾香气最盛，起锅后再撒青蒜苗碎保持翠绿辛香。
              </div>
            );
          }}
        />

        <div className="m-subhead">MobileSegmented 分段控件与 MobileSwitch 开关</div>
        <MobileSegmented
          value={viewMode}
          onChange={setViewMode}
          items={[
            { value: 'compact', label: '采购速览' },
            { value: 'standard', label: '标准备菜' },
            { value: 'cook', label: '灶台大字' },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div className="m-spec-card">
            <div>
              <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                步骤结束自动响铃（标准开/关态）
              </strong>
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                当前状态：{autoTimerOn ? '已开启提醒' : '静音仅视觉闪烁'}
              </span>
            </div>
            <MobileSwitch checked={autoTimerOn} onChange={setAutoTimerOn} title="切换步骤响铃" />
          </div>

          <div className="m-spec-card">
            <div>
              <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                计量单位模式（Dual 双有效态）
              </strong>
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                两端均为有效模式：{unitDual ? '中式汤匙 / 茶匙' : '精确克重 (g / ml)'}
              </span>
            </div>
            <MobileSwitch checked={unitDual} onChange={setUnitDual} dualMode title="切换计量单位模式" />
          </div>
        </div>
      </section>

      {/* Section 03: Forms & Density */}
      <section id="sec-forms" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">03</span>
          <h2 className="m-section-title">内收焦点表单、320ms 校验展开与三档密度</h2>
        </div>
        <p className="m-section-desc">
          聚焦时通过 <code>inset 0 0 0 1px</code> 向内增厚为视觉 2px 品牌色边框，无外发光环、无 1px 布局抖动；错误提示通过{' '}
          <code>0fr → 1fr</code> 在 320ms 内平滑推开并在收起时保留文案淡出。
        </p>

        <div className="m-subhead">切换三档控件密度（Compact 32px / Default 36px / Comfortable 44px）</div>
        <MobileSegmented
          value={density}
          onChange={setDensity}
          items={[
            { value: 'compact', label: '紧凑 32px' },
            { value: 'default', label: '标准 36px' },
            { value: 'comfortable', label: '舒适 44px' },
          ]}
        />

        <div
          data-density={density}
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--ds-border)',
            backgroundColor: 'var(--ds-background-app)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--m-density-gap)',
          }}
        >
          <MobileField
            label="菜品名称"
            htmlFor="insp-dish-name"
            required
            hint="支持一键清空"
            error={errors.dishName}
          >
            <MobileInput
              id="insp-dish-name"
              value={dishName}
              clearable
              invalid={Boolean(errors.dishName)}
              placeholder="例如：川味经典麻婆豆腐"
              onChange={(e) => {
                setDishName(e.target.value);
                if (errors.dishName) setErrors((prev) => ({ ...prev, dishName: '' }));
              }}
              onClear={() => setDishName('')}
            />
          </MobileField>

          <MobileField
            label="所属餐段"
            htmlFor="insp-meal-type"
            required
            hint="120ms 箭头 / 320ms 菜单"
            error={errors.mealType}
          >
            <MobileSelect
              id="insp-meal-type"
              options={MEAL_OPTIONS}
              value={mealType}
              placeholder="请选择适用的餐段分类"
              onChange={(val) => {
                setMealType(val);
                if (errors.mealType) setErrors((prev) => ({ ...prev, mealType: '' }));
              }}
            />
          </MobileField>

          <MobileField label="备餐份数" htmlFor="insp-servings" hint="步进器常驻内收焦点层">
            <MobileStepper
              id="insp-servings"
              value={servings}
              min={1}
              max={12}
              step={1}
              onChange={setServings}
            />
          </MobileField>

          <MobileField
            label="火候与勾芡备注"
            htmlFor="insp-fire-note"
            required
            error={errors.fireNote}
          >
            <MobileTextarea
              id="insp-fire-note"
              value={fireNote}
              invalid={Boolean(errors.fireNote)}
              placeholder="记录油温、豆瓣慢炒时长与勾芡次数..."
              onChange={(e) => {
                setFireNote(e.target.value);
                if (errors.fireNote) setErrors((prev) => ({ ...prev, fireNote: '' }));
              }}
            />
          </MobileField>

          <div className="m-row-wrap" style={{ marginTop: 4 }}>
            <MobileButton
              variant="primary"
              icon={<TriangleAlert size={15} strokeWidth={2.2} />}
              onClick={triggerValidation}
            >
              触发校验检查
            </MobileButton>
            <MobileButton variant="secondary" onClick={fillValidSample}>
              填入示例并消除错误
            </MobileButton>
            <MobileButton variant="ghost" onClick={resetForm}>
              重置
            </MobileButton>
          </div>
        </div>
      </section>

      {/* Section 04: Status Badges & 1600ms Processing Node */}
      <section id="sec-status" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">04</span>
          <h2 className="m-section-title">语义状态标签与 1600ms 烹饪进程节点</h2>
        </div>
        <p className="m-section-desc">
          遵循「只有真正处理中的节点才动，且只旋转不闪烁」原则：进行中节点以 <code>1600ms (320ms × 5)</code> 匀速驱动渐变流光圆弧，点击下方任意步骤可切换完成态与进行态。
        </p>

        <div className="m-subhead">描边详情态（Outlined）</div>
        <div className="m-row-wrap">
          <MobileStatusBadge tone="brand">灶台烹饪中</MobileStatusBadge>
          <MobileStatusBadge tone="success">备料已齐套</MobileStatusBadge>
          <MobileStatusBadge tone="warning">汤汁收浓待关火</MobileStatusBadge>
          <MobileStatusBadge tone="danger">缺郫县豆瓣酱</MobileStatusBadge>
          <MobileStatusBadge tone="neutral">私房草稿</MobileStatusBadge>
        </div>

        <div className="m-subhead">轻量圆点卡片态（Soft Dot）</div>
        <div className="m-row-wrap">
          <MobileStatusBadge tone="brand" appearance="soft">大火爆香</MobileStatusBadge>
          <MobileStatusBadge tone="success" appearance="soft">已核对 9/9</MobileStatusBadge>
          <MobileStatusBadge tone="warning" appearance="soft">剩余 45 秒</MobileStatusBadge>
          <MobileStatusBadge tone="danger" appearance="soft">库存不足</MobileStatusBadge>
          <MobileStatusBadge tone="neutral" appearance="soft">待排期</MobileStatusBadge>
        </div>

        <div className="m-subhead">1600ms 导线流光节点（点击条目切换完成/进行中）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cookSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() =>
                setCookSteps((prev) =>
                  prev.map((s) => (s.id === step.id ? { ...s, completed: !s.completed } : s))
                )
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--ds-border)',
                backgroundColor: 'var(--ds-background-app)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <ProcessingNode completed={step.completed} size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text)' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)', marginTop: 1 }}>
                  {step.meta}
                </div>
              </div>
              <MobileStatusBadge tone={step.completed ? 'success' : 'brand'} appearance="soft">
                {step.completed ? '已完成' : '进行中'}
              </MobileStatusBadge>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

ControlsSpecimen.propTypes = {
  pushToast: P.func.isRequired,
};

function MotionSpecimen({ pushToast, toastMode, onToastModeChange, onClearToasts }) {
  // 01 Sharp-corner multi-step bottom sheet
  const sheetTriggerRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState('prep');

  // 02 200ms Button-origin dialogs from left & right triggers
  const leftOriginRef = useRef(null);
  const rightOriginRef = useRef(null);
  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [originSide, setOriginSide] = useState('left');

  // 03 320ms + 320ms Shared-identity detail cards
  const [openDetailId, setOpenDetailId] = useState(null);

  // 04 Single-active accordion & FLIP MotionList
  const [expandedFaq, setExpandedFaq] = useState('faq-1');
  const [prepItems, setPrepItems] = useState([
    { id: 'ing-1', name: '石膏嫩豆腐（切 2cm 方块）', amount: '400 克', tag: '主料' },
    { id: 'ing-2', name: '郫县红油豆瓣酱（剁细）', amount: '1.5 汤匙', tag: '酱料' },
    { id: 'ing-3', name: '本地蒜苗青段（斜切）', amount: '2 根', tag: '提香' },
  ]);
  const poolIndexRef = useRef(0);

  const handleAddPrepTop = () => {
    const sample = EXTRA_INGREDIENTS_POOL[poolIndexRef.current % EXTRA_INGREDIENTS_POOL.length];
    poolIndexRef.current += 1;
    const nextItem = {
      id: `ing-${Date.now()}-${poolIndexRef.current}`,
      ...sample,
    };
    setPrepItems((prev) => [nextItem, ...prev]);
  };

  const handleInsertMiddle = () => {
    const sample = EXTRA_INGREDIENTS_POOL[poolIndexRef.current % EXTRA_INGREDIENTS_POOL.length];
    poolIndexRef.current += 1;
    const nextItem = {
      id: `ing-${Date.now()}-${poolIndexRef.current}`,
      ...sample,
    };
    setPrepItems((prev) => {
      const mid = Math.min(1, prev.length);
      const copy = [...prev];
      copy.splice(mid, 0, nextItem);
      return copy;
    });
  };

  const handleRotateOrder = () => {
    setPrepItems((prev) => {
      if (prev.length < 2) return prev;
      return [...prev.slice(1), prev[0]];
    });
  };

  return (
    <div>
      {/* Section 01: Sharp-Corner Multi-Step Sheet */}
      <section id="sec-sheet" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">01</span>
          <h2 className="m-section-title">分步直角底部抽屉（0px 圆角 + 高度平滑自适应）</h2>
        </div>
        <p className="m-section-desc">
          贴合视口边缘的底部抽屉严格采用 <strong>0px 直角</strong>；外层负责{' '}
          <code>320ms cubic-bezier(0.32, 0.72, 0, 1)</code> 上滑进出，内层在步骤切换时独立测量新旧高度做 320ms 容器平滑伸缩与内容交叉过渡。
        </p>

        <div className="m-row-wrap">
          <MobileButton
            ref={sheetTriggerRef}
            variant="primary"
            icon={<Layers size={16} strokeWidth={2.2} />}
            onClick={() => {
              setSheetStep('prep');
              setSheetOpen(true);
            }}
          >
            打开直角分步备菜抽屉
          </MobileButton>
        </div>

        <MobileSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          triggerRef={sheetTriggerRef}
          stepKey={sheetStep}
          title={sheetStep === 'prep' ? '步骤 1/2 · 麻婆豆腐备菜核对' : '步骤 2/2 · 三次勾芡与火候详述'}
          renderStep={(key) => {
            if (key === 'prep') {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--ds-text)' }}>
                    当前为<strong>较矮步骤视图</strong>。点击下方「下一步：查看勾芡火候」，观察抽屉外层保持贴底不动，内层舞台按面板曲线在
                    320ms 内平滑长高。
                  </p>
                  <div className="m-spec-card">
                    <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>南豆腐 + 牛肉末 + 郫县豆瓣</span>
                    <code>9 项已备齐</code>
                  </div>
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--ds-text)' }}>
                  当前为<strong>较高详情视图</strong>。切回上一步时旧步骤立即设为 <code>inert</code>，抽屉高度同步平滑收拢，无闪白或跳帧。
                </p>
                <div className="m-spec-card">
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                      第一次勾芡 · 紧汁入味
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                      小火慢烧 5 分钟后淋入 1/3 水淀粉，用勺背轻推锅底防粘。
                    </span>
                  </div>
                  <code>00:30</code>
                </div>
                <div className="m-spec-card">
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                      第二、三次勾芡 · 亮油挂汁
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                      间隔 30 秒补淋剩余水淀粉，红油浮面裹住豆腐不吐水。
                    </span>
                  </div>
                  <code>01:00</code>
                </div>
                <div className="m-spec-card">
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                      出锅撒花椒面与青蒜苗
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                      关火盛盘后立即撒现焙汉源花椒粉，保留麻香层次。
                    </span>
                  </div>
                  <code>收尾</code>
                </div>
              </div>
            );
          }}
          footer={
            sheetStep === 'prep' ? (
              <>
                <MobileButton variant="ghost" onClick={() => setSheetOpen(false)}>
                  关闭
                </MobileButton>
                <MobileButton variant="primary" onClick={() => setSheetStep('cook')}>
                  下一步：查看勾芡火候
                </MobileButton>
              </>
            ) : (
              <>
                <MobileButton variant="secondary" onClick={() => setSheetStep('prep')}>
                  返回备菜摘要
                </MobileButton>
                <MobileButton
                  variant="primary"
                  icon={<Check size={16} strokeWidth={2.2} />}
                  onClick={() => {
                    setSheetOpen(false);
                    pushToast({
                      title: '备菜核对已完成',
                      description: '焦点已平滑归还至触发按钮。',
                      tone: 'success',
                    });
                  }}
                >
                  完成并开火
                </MobileButton>
              </>
            )
          }
        />
      </section>

      {/* Section 02: 200ms Button-Origin Dialog */}
      <section id="sec-origin" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">02</span>
          <h2 className="m-section-title">按钮来源快速弹窗（200ms 表面展开 + 文字零缩放）</h2>
        </div>
        <p className="m-section-desc">
          总预算严格控制在 <code>200ms</code>：前 <code>0..104ms</code> 独立背景层从触发按钮位置与底色快速生长至弹窗尺寸，后{' '}
          <code>80..200ms</code> 文字在最终排版坐标直接淡入（绝不缩放文字）；关闭时反向收回至对应触发键。
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <MobileButton
            ref={leftOriginRef}
            variant="secondary"
            icon={<SlidersHorizontal size={15} strokeWidth={2.2} />}
            onClick={() => {
              setOriginSide('left');
              setOriginDialogOpen(true);
            }}
          >
            左侧触发 · 调味换算
          </MobileButton>

          <MobileButton
            ref={rightOriginRef}
            variant="primary"
            icon={<Clock size={15} strokeWidth={2.2} />}
            onClick={() => {
              setOriginSide('right');
              setOriginDialogOpen(true);
            }}
          >
            右侧触发 · 计时预设
          </MobileButton>
        </div>

        <MobileOriginDialog
          open={originDialogOpen}
          onClose={() => setOriginDialogOpen(false)}
          triggerRef={originSide === 'right' ? rightOriginRef : leftOriginRef}
          title={originSide === 'right' ? '灶台分段计时预设' : '中式勺量与克重换算'}
          footer={
            <>
              <MobileButton variant="secondary" onClick={() => setOriginDialogOpen(false)}>
                收起回原按钮
              </MobileButton>
              <MobileButton
                variant="primary"
                onClick={() => {
                  setOriginDialogOpen(false);
                  pushToast({
                    title: originSide === 'right' ? '已载入 3 段烹饪计时' : '已切换为克重显示',
                    tone: 'brand',
                  });
                }}
              >
                应用设置
              </MobileButton>
            </>
          }
        >
          {originSide === 'right' ? (
            <div className="m-spec-grid">
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>豆腐沸水加盐焯烫</span>
                <code>01:00</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>豆瓣豆豉小火慢炒红油</span>
                <code>02:30</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>高汤慢烧入味与三次勾芡</span>
                <code>05:00</code>
              </div>
            </div>
          ) : (
            <div className="m-spec-grid">
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>1 标准汤匙 (tbsp) 豆瓣酱</span>
                <code>≈ 18 g</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>1 标准茶匙 (tsp) 花椒粉</span>
                <code>≈ 3.5 g</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>1 小碗复合宫保调味汁</span>
                <code>≈ 95 ml</code>
              </div>
            </div>
          )}
        </MobileOriginDialog>
      </section>

      {/* Section 03: Shared-Identity Two-Stage Detail Expansion */}
      <section id="sec-shared" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">03</span>
          <h2 className="m-section-title">条目同源两段式展开详情（320ms 位移 + 320ms 细节显露）</h2>
        </div>
        <p className="m-section-desc">
          第一段 <code>0..320ms</code> 源卡片原地隐藏，图标与标题以 1:1 字号直接平移到弹窗摘要槽位；第二段{' '}
          <code>320..640ms</code> 顶栏分割线与详细参数才渐显，避免横线在移动中扫过文字；收起时先退分割线再归位。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MobileSharedDetail
            open={openDetailId === 'douban'}
            onOpenChange={(next) => setOpenDetailId(next ? 'douban' : null)}
            icon={<Flame size={20} strokeWidth={2.2} />}
            title="郫县三年陈酿红油豆瓣"
            subtitle="川菜灵魂酱料 · 常备余量 320g"
            dialogTitle="馆藏调味料详情"
            badge={<MobileStatusBadge tone="brand" appearance="soft">核心风味</MobileStatusBadge>}
            footer={
              <>
                <MobileButton variant="secondary" onClick={() => setOpenDetailId(null)}>
                  原路收起
                </MobileButton>
                <MobileButton
                  variant="primary"
                  onClick={() => {
                    setOpenDetailId(null);
                    pushToast({ title: '已标记豆瓣酱优先使用', tone: 'success' });
                  }}
                >
                  设为默认酱料
                </MobileButton>
              </>
            }
          >
            <div className="m-spec-grid">
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>预处理建议</span>
                <code>使用前刀背剁细</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>最佳油温区间</span>
                <code>110°C–130°C 小火慢煸</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>关联私房菜谱</span>
                <code>麻婆豆腐 / 回锅肉 / 水煮牛肉</code>
              </div>
              <p style={{ fontSize: 13, lineHeight: '20px', color: 'var(--ds-text-subtle)', marginTop: 4 }}>
                开封后建议冷藏密封保存，取用时使用干燥洁净汤匙以维持红油色泽与酯香。
              </p>
            </div>
          </MobileSharedDetail>

          <MobileSharedDetail
            open={openDetailId === 'pepper'}
            onOpenChange={(next) => setOpenDetailId(next ? 'pepper' : null)}
            icon={<UtensilsCrossed size={20} strokeWidth={2.2} />}
            title="汉源贡椒大红袍花椒粒"
            subtitle="天然香辛料 · 现焙现碾麻香饱满"
            dialogTitle="天然香辛料详情"
            badge={<MobileStatusBadge tone="success" appearance="soft">库存充足</MobileStatusBadge>}
            footer={
              <MobileButton variant="primary" onClick={() => setOpenDetailId(null)}>
                完成查看
              </MobileButton>
            }
          >
            <div className="m-spec-grid">
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>干锅焙香时间</span>
                <code>小火无油干焙 45 秒</code>
              </div>
              <div className="m-spec-card">
                <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>出香时机</span>
                <code>起锅装盘后撒粉防苦</code>
              </div>
              <p style={{ fontSize: 13, lineHeight: '20px', color: 'var(--ds-text-subtle)', marginTop: 4 }}>
                油炸花椒粒时切忌大火久炸，微变棕褐即出香，久炸易发黑变苦。
              </p>
            </div>
          </MobileSharedDetail>
        </div>
      </section>

      {/* Section 04: Single-Item Accordion & FLIP MotionList */}
      <section id="sec-list" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">04</span>
          <h2 className="m-section-title">单项手风琴与 FLIP 动态重排列表</h2>
        </div>
        <p className="m-section-desc">
          手风琴高度与透明度在 320ms 内同步过渡，快速连点中途反向时从当前实时像素高度无缝折返；动态列表无首屏交错入场，仅在增删或调序时做
          320ms FLIP 位移与原位淡出。
        </p>

        <div className="m-subhead">MobileExpandCard 单项展开手风琴（支持中途打断）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MobileExpandCard
            title="为什么豆腐下锅前要先用淡盐水焯烫？"
            summary="定型去腥 · 翻炒不易碎裂"
            badge={<MobileStatusBadge tone="brand" appearance="soft">技法 01</MobileStatusBadge>}
            expanded={expandedFaq === 'faq-1'}
            onToggle={(next) => setExpandedFaq(next ? 'faq-1' : '')}
          >
            淡盐水能通过渗透压析出南豆腐表层多余水分，使蛋白质轻微收紧定型，后续烧制与勾芡推勺时依然滑嫩完整。
          </MobileExpandCard>

          <MobileExpandCard
            title="宫保鸡丁的「糊辣荔枝口」如何调配糖醋比例？"
            summary="小荔枝口酸甜微辣 · 亮油不泻汁"
            badge={<MobileStatusBadge tone="warning" appearance="soft">技法 02</MobileStatusBadge>}
            expanded={expandedFaq === 'faq-2'}
            onToggle={(next) => setExpandedFaq(next ? 'faq-2' : '')}
          >
            传统川式小荔枝口讲究先干椒花椒爆出糊辣香，碗汁中白糖与保宁醋约按 1 : 1.1 配比，辅以少量水淀粉大火急炒收亮。
          </MobileExpandCard>

          <MobileExpandCard
            title="番茄炒蛋怎样炒出浓郁红沙汁且鸡蛋不老？"
            summary="热油蓬松滑蛋 · 分段加盐锁汁"
            badge={<MobileStatusBadge tone="success" appearance="soft">技法 03</MobileStatusBadge>}
            expanded={expandedFaq === 'faq-3'}
            onToggle={(next) => setExpandedFaq(next ? 'faq-3' : '')}
          >
            蛋液打至起细泡，八成油温下锅刚凝结湿润即盛出；番茄去皮切块中火慢压出沙，合炒仅翻拌 10 秒即可出锅。
          </MobileExpandCard>
        </div>

        <div className="m-subhead">MotionList 备菜清单增删与 FLIP 重排</div>
        <div className="m-row-wrap" style={{ marginBottom: 10 }}>
          <MobileButton
            size="sm"
            variant="primary"
            icon={<Plus size={14} strokeWidth={2.3} />}
            onClick={handleAddPrepTop}
          >
            顶部新增备料
          </MobileButton>
          <MobileButton
            size="sm"
            variant="secondary"
            icon={<Plus size={14} strokeWidth={2.3} />}
            onClick={handleInsertMiddle}
          >
            中部插入香料
          </MobileButton>
          <MobileButton
            size="sm"
            variant="secondary"
            icon={<ArrowUpDown size={14} strokeWidth={2.2} />}
            disabled={prepItems.length < 2}
            onClick={handleRotateOrder}
          >
            首尾轮换调序
          </MobileButton>
        </div>

        <MotionList
          items={prepItems}
          getKey={(item) => item.id}
          renderItem={(item) => (
            <div className="m-spec-card" style={{ backgroundColor: 'var(--m-layer-1-bg)' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ds-text)' }}>{item.name}</strong>
                  <MobileStatusBadge tone="neutral" appearance="soft">
                    {item.tag}
                  </MobileStatusBadge>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>用量：{item.amount}</span>
              </div>
              <MobileButton
                variant="ghost"
                size="xs"
                iconOnly
                aria-label={`移除 ${item.name}`}
                icon={<Trash2 size={14} strokeWidth={2.1} />}
                onClick={() => setPrepItems((prev) => prev.filter((x) => x.id !== item.id))}
              />
            </div>
          )}
        />
      </section>

      {/* Section 05: Toast Notification Queue */}
      <section id="sec-toast" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">05</span>
          <h2 className="m-section-title">连续通知队列（唯一允许克制回弹的场景）</h2>
        </div>
        <p className="m-section-desc">
          移动端默认自顶部安全区滑入（避开底部导航、拇指触控区与软键盘遮挡）。全系统仅在 Toast 上使用弹性曲线：位移{' '}
          <code>bounce: 0.12</code>，背景层入场/堆叠缩放 <code>bounce: 0.22</code>
          （文字不参与缩放），离场回退至无回弹 320ms 向上收起淡出；支持「向下推开」与「顶部叠放」双模式实时切换。
        </p>

        <div className="m-spec-card" style={{ marginBottom: 12 }}>
          <div>
            <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
              多条通知排列模式：{toastMode === 'stack' ? '顶部叠放 (Stack · 点击或悬停向下展开)' : '向下推开 (Push · 自顶逐条下推)'}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
              最多同时保留 4 条通知，悬停或展开堆叠时自动暂停 6 秒倒计时
            </span>
          </div>
          <MobileSwitch
            checked={toastMode === 'stack'}
            dualMode
            title="切换通知推开或堆叠模式"
            onChange={(checked) => onToastModeChange(checked ? 'stack' : 'push')}
          />
        </div>

        <div className="m-row-wrap">
          <MobileButton
            variant="primary"
            icon={<Bell size={15} strokeWidth={2.2} />}
            onClick={() =>
              pushToast({
                title: '灶台计时已启动 · 03:00',
                description: '麻婆豆腐慢烧入味阶段，到点将自动响铃提醒。',
                tone: 'brand',
              })
            }
          >
            推送烹饪计时
          </MobileButton>

          <MobileButton
            variant="secondary"
            onClick={() =>
              pushToast({
                title: '备菜清单已核对完成',
                description: '主料、辅料与天然香辛料共 9 项全部就绪。',
                tone: 'success',
              })
            }
          >
            推送齐套成功
          </MobileButton>

          <MobileButton
            variant="secondary"
            onClick={() =>
              pushToast({
                title: '红油豆瓣库存偏低',
                description: '剩余约 1.5 汤匙，建议列入下次采购清单。',
                tone: 'warning',
              })
            }
          >
            推送补货预警
          </MobileButton>

          <MobileButton variant="ghost" onClick={onClearToasts}>
            清空通知
          </MobileButton>
        </div>
      </section>

      {/* Section 06: Motion Timing Reference */}
      <section id="sec-specs" className="m-inspector-section">
        <div className="m-section-head">
          <span className="m-section-num">06</span>
          <h2 className="m-section-title">动效时序与缓动曲线基准速查</h2>
        </div>
        <p className="m-section-desc">
          所有组件显式声明过渡属性（禁用 <code>transition: all</code>），并在系统或顶部开关开启「减弱动效」时自动归零。
        </p>

        <div className="m-spec-grid">
          <div className="m-spec-card">
            <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>按钮表面缩放 (0.97)、下拉/手风琴箭头旋转、清空键显隐</span>
            <code>120ms · Fast</code>
          </div>
          <div className="m-spec-card">
            <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>按钮来源快速弹窗（表面展开 + 文字原位淡入 + 反向收回）</span>
            <code>200ms · Origin</code>
          </div>
          <div className="m-spec-card">
            <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>直角抽屉、页签指示条、同源详情两段展开、列表 FLIP、错误展开</span>
            <code>320ms · Normal</code>
          </div>
          <div className="m-spec-card">
            <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>烹饪进程节点匀速流光圆弧（320ms × 5，不闪烁脉冲）</span>
            <code>1600ms · Cycle</code>
          </div>
          <div className="m-spec-card">
            <span style={{ fontSize: 13, color: 'var(--ds-text)' }}>反馈/状态曲线（无过冲）与抽屉/面板曲线</span>
            <code>(0.16,1,0.3,1) / (0.32,0.72,0,1)</code>
          </div>
        </div>
      </section>
    </div>
  );
}

MotionSpecimen.propTypes = {
  pushToast: P.func.isRequired,
  toastMode: P.string.isRequired,
  onToastModeChange: P.func.isRequired,
  onClearToasts: P.func.isRequired,
};

function PwaNotificationLab({ pushToast }) {
  const [caps, setCaps] = useState({
    secureContext: true,
    standalone: false,
    ios: false,
    hasNotificationApi: false,
    permission: 'default',
    swState: 'checking',
    hasWakeLock: false,
  });
  const [countdown, setCountdown] = useState({ active: false, targetSec: 0, runId: 0 });
  const [remainingSec, setRemainingSec] = useState(0);
  const [labLog, setLabLog] = useState(
    '苹果 iPhone 实测步骤：需在 HTTPS 下通过 Safari「分享 → 添加到主屏幕」从桌面图标启动，再依次点击「1. 请求通知权限」与下方触发按钮。'
  );
  const audioCtxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const syncCaps = () => {
      inspectPwaNotificationCapabilities().then((next) => {
        if (!cancelled) {
          setCaps(next);
        }
      });
    };
    syncCaps();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncCaps();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const ensureAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!countdown.active || countdown.targetSec <= 0) return undefined;

    const startedAt = Date.now();
    const endAt = startedAt + countdown.targetSec * 1000;
    let finished = false;

    const playShortChime = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const base = ctx.currentTime;
        for (let i = 0; i < 2; i += 1) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, base + i * 0.32);
          gain.gain.setValueAtTime(0, base + i * 0.32);
          gain.gain.linearRampToValueAtTime(0.32, base + i * 0.32 + 0.04);
          gain.gain.linearRampToValueAtTime(0, base + i * 0.32 + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(base + i * 0.32);
          osc.stop(base + i * 0.32 + 0.26);
        }
      } catch {
        // Ignore audio playback errors if muted/blocked by OS
      }
    };

    const tick = () => {
      if (finished) return;
      const now = Date.now();
      const leftMs = endAt - now;

      if (leftMs <= 0) {
        finished = true;
        const elapsedMs = now - startedAt;
        const actualSec = (elapsedMs / 1000).toFixed(1);
        const suspendedByOs = elapsedMs - countdown.targetSec * 1000 > 1800;

        setCountdown((prev) => ({ ...prev, active: false }));
        setRemainingSec(0);
        playShortChime();

        sendSystemTimerNotificationDetailed({
          recipeTitle: '麻婆豆腐 · 实测',
          timerLabel: `${countdown.targetSec} 秒倒计时测试`,
          stepTitle: suspendedByOs ? '切回前台校准补发' : '组件页倒计时到点',
        }).then((res) => {
          const timingNote = `预期 ${countdown.targetSec}.0s / 实际 ${actualSec}s${
            suspendedByOs ? '（检测到锁屏或切后台期间 JS 定时器被系统挂起，已在唤醒瞬间补发）' : '（准点触发）'
          }`;
          setLabLog(
            `${res.ok ? '✓ 系统通知已派发' : '⚠ 系统通知未派发'} [${res.channel}] · ${timingNote} · ${res.reason}`
          );
          pushToast({
            title: res.ok
              ? `⏰ ${countdown.targetSec} 秒实测已发系统通知`
              : `⏰ ${countdown.targetSec} 秒已到时（仅页内提醒）`,
            description: `${timingNote} · ${res.reason}`,
            tone: res.ok ? 'success' : 'warning',
          });
          inspectPwaNotificationCapabilities().then(setCaps);
        });
        return;
      }

      const nextLeft = Math.max(1, Math.ceil(leftMs / 1000));
      setRemainingSec((prev) => (prev === nextLeft ? prev : nextLeft));
    };

    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [countdown.active, countdown.targetSec, countdown.runId, pushToast]);

  const handleRefreshCaps = async () => {
    const next = await inspectPwaNotificationCapabilities();
    setCaps(next);
    setLabLog(
      `环境已刷新：安全上下文=${next.secureContext ? '是' : '否'} · 模式=${
        next.standalone ? '主屏幕 PWA' : next.ios ? 'iOS Safari 标签页' : '浏览器标签页'
      } · SW=${next.swState} · 通知权限=${next.permission}`
    );
  };

  const handleRequestPermission = async () => {
    const result = await requestTimerNotificationPermission();
    const next = await inspectPwaNotificationCapabilities();
    setCaps(next);

    if (result === 'granted') {
      setLabLog('✓ 已获取系统通知权限 (granted)，现在可以点击「2. 立即发系统通知」或倒计时按钮实测。');
      pushToast({
        title: '系统通知权限已开启',
        description: '现在可测试立即通知与 15 秒切后台/锁屏倒计时。',
        tone: 'success',
      });
    } else if (result === 'ios-needs-install') {
      setLabLog(
        '⚠ 检测到 iOS Safari 普通标签页：苹果要求先点浏览器底部「分享 → 添加到主屏幕」，从主屏幕图标打开后才开放 Notification API。'
      );
      pushToast({
        title: '需从 iPhone 主屏幕打开',
        description: 'Safari 点击「分享 → 添加到主屏幕」后打开，才能请求系统通知权限。',
        tone: 'warning',
      });
    } else if (result === 'insecure-context') {
      setLabLog(
        '⚠ 当前为局域网 HTTP 非安全上下文：iOS 与现代浏览器在 http://局域网IP 下会屏蔽 Service Worker 与系统通知，请使用 HTTPS 域名/隧道访问。'
      );
      pushToast({
        title: '需要 HTTPS 安全上下文',
        description: '手机通过局域网 HTTP IP 访问时，浏览器不开放 Service Worker 与通知权限。',
        tone: 'danger',
      });
    } else if (result === 'denied') {
      setLabLog('✕ 通知权限处于已拒绝 (denied) 状态，需前往系统设置或浏览器网站设置中重新允许通知。');
      pushToast({
        title: '通知权限已被拒绝',
        description: '请在系统设置 → 通知 中开启当前主屏幕应用的通知权限。',
        tone: 'danger',
      });
    } else {
      setLabLog(`通知权限请求返回：${result}`);
    }
  };

  const handleImmediateNotify = async () => {
    ensureAudioContext();
    const res = await sendSystemTimerNotificationDetailed({
      recipeTitle: '麻婆豆腐 · 实测',
      timerLabel: '立即系统通知测试',
      stepTitle: '组件页手动触发',
    });
    const next = await inspectPwaNotificationCapabilities();
    setCaps(next);
    setLabLog(`${res.ok ? '✓ 发送成功' : '⚠ 未能发送'} [通道: ${res.channel}] · ${res.reason}`);
    pushToast({
      title: res.ok ? '系统通知已发出' : '未能发出系统通知',
      description: `${res.channel !== 'none' ? `${res.channel} · ` : ''}${res.reason}`,
      tone: res.ok ? 'brand' : 'warning',
    });
  };

  const handleStartCountdown = (seconds) => {
    ensureAudioContext();
    setRemainingSec(seconds);
    setCountdown((prev) => ({ active: true, targetSec: seconds, runId: prev.runId + 1 }));
    setLabLog(
      `已启动 ${seconds} 秒实测倒计时：现在可切回 iPhone 主屏幕或按下侧边锁屏键，实测苹果后台/锁屏处理机制。`
    );
  };

  const handleCancelCountdown = () => {
    setCountdown((prev) => ({ ...prev, active: false }));
    setRemainingSec(0);
    setLabLog('已手动取消实测倒计时。');
  };

  const permissionBadge = !caps.hasNotificationApi
    ? { tone: 'warning', text: 'API 未开放' }
    : caps.permission === 'granted'
      ? { tone: 'success', text: '已授权 Granted' }
      : caps.permission === 'denied'
        ? { tone: 'danger', text: '已拒绝 Denied' }
        : { tone: 'brand', text: '待授权 Default' };

  const swBadge =
    caps.swState === 'active'
      ? { tone: 'success', text: '已激活 Active' }
      : caps.swState === 'installing'
        ? { tone: 'warning', text: '安装中' }
        : caps.swState === 'checking'
          ? { tone: 'neutral', text: '检测中' }
          : { tone: 'warning', text: caps.swState === 'unsupported' ? 'API 被屏蔽' : caps.swState };

  return (
    <section id="sec-pwa-notify" className="m-inspector-section">
      <div className="m-section-head">
        <span className="m-section-num">PWA</span>
        <h2 className="m-section-title">系统通知与辅助计时实测台（iPhone / Android）</h2>
      </div>
      <p className="m-section-desc">
        一屏诊断苹果 iOS Safari 与「添加到主屏幕」独立 PWA 下的通知权限、Service Worker 通道，以及切后台/锁屏后的倒计时表现。
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div className="m-subhead" style={{ margin: 0 }}>
          实时环境自检
        </div>
        <MobileButton
          size="xs"
          variant="ghost"
          icon={<RefreshCw size={13} strokeWidth={2.2} />}
          onClick={handleRefreshCaps}
        >
          刷新检测
        </MobileButton>
      </div>

      <div className="m-spec-grid">
        <div className="m-spec-card">
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
              1. 安全上下文 (HTTPS / localhost)
            </strong>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
              {caps.secureContext
                ? '已满足 Service Worker 与系统通知前提'
                : '局域网 HTTP IP 下手机会屏蔽 SW 与通知，请用 HTTPS 访问'}
            </span>
          </div>
          <MobileStatusBadge tone={caps.secureContext ? 'success' : 'danger'} appearance="soft">
            {caps.secureContext ? '安全上下文' : '非安全 HTTP'}
          </MobileStatusBadge>
        </div>

        <div className="m-spec-card">
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
              2. 运行容器（iOS 需主屏幕启动）
            </strong>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
              {caps.standalone
                ? '已以主屏幕独立应用运行 (standalone)'
                : caps.ios
                  ? 'Safari 普通标签页不开放通知，请点「分享 → 添加到主屏幕」'
                  : '常规浏览器标签页模式'}
            </span>
          </div>
          <MobileStatusBadge
            tone={caps.standalone ? 'success' : caps.ios ? 'warning' : 'neutral'}
            appearance="soft"
          >
            {caps.standalone ? '主屏幕 PWA' : caps.ios ? 'Safari 标签页' : '浏览器标签页'}
          </MobileStatusBadge>
        </div>

        <div className="m-spec-card">
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
              3. Service Worker 通道 (/sw.js)
            </strong>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
              屏幕常亮防熄屏 (Wake Lock)：{caps.hasWakeLock ? '当前支持' : '当前不支持'}
            </span>
          </div>
          <MobileStatusBadge tone={swBadge.tone} appearance="soft">
            {swBadge.text}
          </MobileStatusBadge>
        </div>

        <div className="m-spec-card">
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
              4. 系统通知 API 与权限
            </strong>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
              {caps.hasNotificationApi
                ? '优先走 ServiceWorkerRegistration.showNotification'
                : '当前容器未暴露 window.Notification'}
            </span>
          </div>
          <MobileStatusBadge tone={permissionBadge.tone} appearance="soft">
            {permissionBadge.text}
          </MobileStatusBadge>
        </div>
      </div>

      <div className="m-subhead">分步实测动作（iOS 必须在点击手势中触发）</div>
      <div className="m-row-wrap">
        <MobileButton
          variant="primary"
          icon={<Bell size={15} strokeWidth={2.2} />}
          onClick={handleRequestPermission}
        >
          1. 请求通知权限
        </MobileButton>

        <MobileButton
          variant="secondary"
          icon={<Sparkles size={15} strokeWidth={2.2} />}
          onClick={handleImmediateNotify}
        >
          2. 立即发系统通知
        </MobileButton>

        <MobileButton
          variant="secondary"
          icon={<Clock size={15} strokeWidth={2.2} />}
          onClick={() => handleStartCountdown(5)}
        >
          5 秒倒计时
        </MobileButton>

        <MobileButton
          variant="secondary"
          icon={<Clock size={15} strokeWidth={2.2} />}
          onClick={() => handleStartCountdown(15)}
        >
          15 秒切后台/锁屏
        </MobileButton>
      </div>

      {countdown.active && (
        <div
          className="m-spec-card"
          style={{
            marginTop: 10,
            borderColor: 'var(--ds-border-brand)',
            backgroundColor: 'var(--brand-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <ProcessingNode completed={false} size={20} />
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 13, color: 'var(--ds-text)', display: 'block' }}>
                实测倒计时进行中：剩余 {remainingSec} 秒（目标 {countdown.targetSec}s）
              </strong>
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                现在可切回主屏幕或锁屏，观察 iOS 是否在后台挂起定时器或弹出系统横幅
              </span>
            </div>
          </div>
          <MobileButton size="xs" variant="secondary" onClick={handleCancelCountdown}>
            取消
          </MobileButton>
        </div>
      )}

      <div className="m-feedback-box">{labLog}</div>
    </section>
  );
}

PwaNotificationLab.propTypes = {
  pushToast: P.func.isRequired,
};

export function ComponentInspectorPage() {
  const { reducedMotion, forcedReducedMotion, setForcedReducedMotion } = useMotionEnvironment();
  const [activeGroup, setActiveGroup] = useState('controls');
  const [toastMode, setToastMode] = useState('push');
  const { toasts, push, dismiss, clear } = useToastQueue({ maxVisible: 4 });

  const anchors = activeGroup === 'controls' ? CONTROL_ANCHORS : MOTION_ANCHORS;

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="m-inspector">
      <div className="m-inspector-hero">
        <div className="m-inspector-eyebrow">Mobile Component &amp; Motion Inspector</div>
        <h2 className="m-inspector-title">移动端组件与连续动效检查台</h2>
        <p className="m-inspector-desc">
          严格保留「日常菜谱」暖橙与冷岩灰双主题配色，独立实现表面按压分离、120ms / 200ms / 320ms 时序层级、0px 直角分步抽屉与同源连续空间过渡。
        </p>

        <div className="m-inspector-env-bar">
          <div className="m-inspector-env-label">
            <strong>减弱动效预览（Reduced Motion）</strong>
            <small>
              {reducedMotion
                ? '当前已启用：关闭位移与缩放过渡，状态即时直达'
                : '当前为标准连续动效：可随时开启验证无障碍降级'}
            </small>
          </div>
          <MobileSwitch
            checked={forcedReducedMotion}
            onChange={setForcedReducedMotion}
            title="切换减弱动效预览"
          />
        </div>
      </div>

      <PwaNotificationLab pushToast={push} />

      <div className="m-inspector-tabs-wrap">
        <MobileTabs
          items={INSPECTOR_TABS}
          value={activeGroup}
          onChange={setActiveGroup}
          fullWidth
        />
      </div>

      <nav className="m-inspector-anchors" aria-label="检查章节快速跳转">
        {anchors.map((anchor) => (
          <button
            key={anchor.id}
            type="button"
            className="m-inspector-anchor-chip"
            onClick={() => scrollToSection(anchor.id)}
          >
            {anchor.label}
          </button>
        ))}
      </nav>

      {activeGroup === 'controls' ? (
        <ControlsSpecimen pushToast={push} />
      ) : (
        <MotionSpecimen
          pushToast={push}
          toastMode={toastMode}
          onToastModeChange={setToastMode}
          onClearToasts={clear}
        />
      )}

      <MobileToastRegion toasts={toasts} onDismiss={dismiss} mode={toastMode} />
    </div>
  );
}
