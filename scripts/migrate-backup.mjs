#!/usr/bin/env node
/**
 * Standalone CLI migration tool for exported JSON backups (v1 -> v2).
 *
 * Usage:
 *   npm run migrate:data -- <input-backup.json> [output-backup.json] [--in-place] [--dry-run]
 *   npm run migrate:data -- --self-test
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { DATA_VERSION, migrateData, parseV1IngredientText } from '../src/migrations.js';

function printUsage() {
  console.log(`
菜谱库备份迁移脚本 (Target Schema: v${DATA_VERSION})

用法:
  node scripts/migrate-backup.mjs <input.json> [output.json] [--in-place] [--dry-run]
  node scripts/migrate-backup.mjs --self-test

选项:
  --in-place   直接覆盖原输入文件（默认输出为 <原文件名>.v${DATA_VERSION}.json）
  --dry-run    仅校验并打印迁移统计，不写入磁盘
  --self-test  运行内置 v1 -> v${DATA_VERSION} 迁移回归自测
  -h, --help   显示帮助说明
`.trim());
}

function summarizeRecipes(recipes = []) {
  let totalSlots = 0;
  let optionalSlots = 0;
  let alternativeGroups = 0;
  let totalAlternatives = 0;

  for (const recipe of recipes) {
    const ings = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    for (const ing of ings) {
      totalSlots += 1;
      if (ing.optional) optionalSlots += 1;
      if (Array.isArray(ing.alternatives) && ing.alternatives.length > 0) {
        alternativeGroups += 1;
        totalAlternatives += ing.alternatives.length;
      }
    }
  }

  return {
    recipeCount: recipes.length,
    totalSlots,
    optionalSlots,
    alternativeGroups,
    totalAlternatives,
  };
}

function buildMigratedEnvelope(rawPayload) {
  const isEnvelope =
    rawPayload &&
    typeof rawPayload === 'object' &&
    'data' in rawPayload &&
    rawPayload.data &&
    typeof rawPayload.data === 'object';

  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new Error('无效的 JSON 备份文件：根节点必须为对象');
  }

  const sourceVersion =
    isEnvelope && typeof rawPayload.version === 'number' && rawPayload.version >= 1
      ? Math.floor(rawPayload.version)
      : 1;

  const migratedData = migrateData(
    isEnvelope ? { version: sourceVersion, data: rawPayload.data } : { version: 1, data: rawPayload }
  );

  return {
    sourceVersion,
    envelope: {
      version: DATA_VERSION,
      exportedAt:
        isEnvelope && typeof rawPayload.exportedAt === 'string'
          ? rawPayload.exportedAt
          : new Date().toISOString(),
      migratedAt: new Date().toISOString(),
      migratedFromVersion: sourceVersion,
      appName:
        isEnvelope && typeof rawPayload.appName === 'string' ? rawPayload.appName : '日常菜谱',
      data: migratedData,
    },
  };
}

function runSelfTest() {
  // 1. Unit checks on v1 text pattern parser
  assert.deepEqual(parseV1IngredientText('香菜 (可选)', '1 根', 'spice'), {
    name: '香菜',
    optional: true,
    alternatives: [],
  });

  assert.deepEqual(parseV1IngredientText('牛肉末 (或猪肉末)', '80 克', 'basic'), {
    name: '牛肉末',
    optional: false,
    alternatives: [{ name: '猪肉末', amount: '80 克', type: 'basic' }],
  });

  assert.deepEqual(parseV1IngredientText('粉丝 (可换腐竹/魔芋丝)', '100 克', 'basic'), {
    name: '粉丝',
    optional: false,
    alternatives: [
      { name: '腐竹', amount: '100 克', type: 'basic' },
      { name: '魔芋丝', amount: '100 克', type: 'basic' },
    ],
  });

  assert.deepEqual(parseV1IngredientText('高汤或清水', '150 毫升', 'seasoning'), {
    name: '高汤',
    optional: false,
    alternatives: [{ name: '清水', amount: '150 毫升', type: 'seasoning' }],
  });

  assert.deepEqual(parseV1IngredientText('小米辣 (或干辣椒) (可选)', '2 个', 'spice'), {
    name: '小米辣',
    optional: true,
    alternatives: [{ name: '干辣椒', amount: '2 个', type: 'spice' }],
  });

  // Descriptive parentheses must NOT be falsely split into alternatives
  assert.deepEqual(parseV1IngredientText('水淀粉 (勾芡用)', '适量', 'seasoning'), {
    name: '水淀粉 (勾芡用)',
    optional: false,
    alternatives: [],
  });
  assert.deepEqual(parseV1IngredientText('嫩豆腐 (石膏/南豆腐)', '400 克', 'basic'), {
    name: '嫩豆腐 (石膏/南豆腐)',
    optional: false,
    alternatives: [],
  });

  // 2. End-to-end v1 backup envelope migration test
  const sampleV1Backup = {
    version: 1,
    exportedAt: '2026-05-01T12:00:00.000Z',
    appName: '日常菜谱',
    data: {
      theme: 'dark',
      workplaceMode: false,
      homeIngredients: ['鸡蛋', '番茄'],
      ingredientLibrary: [{ name: '豆腐', category: 'basic' }],
      recipes: [
        {
          id: '1',
          title: '川味经典麻婆豆腐',
          tags: ['经典川菜', '下饭神器'],
          tagClasses: ['lozenge-red', 'lozenge-orange'],
          ingredients: [
            { name: '嫩豆腐 (石膏/南豆腐)', amount: '400 克', type: 'basic' },
            { name: '牛肉末 (或猪肉末)', amount: '80 克', type: 'basic' },
            { name: '郫县豆瓣酱', amount: '1.5 汤匙', type: 'seasoning' },
          ],
          steps: [],
        },
        {
          id: 'custom_101',
          title: '酸辣肥牛金针菇',
          ingredients: [
            { name: '肥牛卷 (或羊肉卷)', amount: '200 克', type: 'basic' },
            { name: '金针菇', amount: '150 克', type: 'basic' },
            { name: '高汤或清水', amount: '200 毫升', type: 'seasoning' },
            { name: '香菜 (可选)', amount: '1 根', type: 'spice' },
            { name: '水淀粉 (勾芡用)', amount: '适量', type: 'seasoning' },
          ],
          steps: [],
        },
      ],
    },
  };

  const { sourceVersion, envelope } = buildMigratedEnvelope(sampleV1Backup);
  assert.equal(sourceVersion, 1);
  assert.equal(envelope.version, DATA_VERSION);
  assert.equal(envelope.data.theme, 'dark');
  assert.equal(envelope.data.workplaceMode, false);
  assert.deepEqual(envelope.data.homeIngredients, ['鸡蛋', '番茄']);

  // Built-in recipe '1' upgraded to curated v2 ingredients
  const migratedBuiltIn = envelope.data.recipes[0];
  assert.deepEqual(migratedBuiltIn.tags, ['麻辣', '豆腐']);
  assert.equal(migratedBuiltIn.ingredients[1].name, '牛肉末');
  assert.equal(migratedBuiltIn.ingredients[1].alternatives[0].name, '猪肉末');
  assert.equal(migratedBuiltIn.ingredients[5].name, '豆豉');
  assert.equal(migratedBuiltIn.ingredients[5].optional, true);

  // Custom recipe 'custom_101' migrated cleanly
  const migratedCustom = envelope.data.recipes[1];
  assert.deepEqual(migratedCustom.ingredients[0], {
    name: '肥牛卷',
    amount: '200 克',
    type: 'basic',
    optional: false,
    alternatives: [{ name: '羊肉卷', amount: '200 克', type: 'basic' }],
  });
  assert.deepEqual(migratedCustom.ingredients[2], {
    name: '高汤',
    amount: '200 毫升',
    type: 'seasoning',
    optional: false,
    alternatives: [{ name: '清水', amount: '200 毫升', type: 'seasoning' }],
  });
  assert.deepEqual(migratedCustom.ingredients[3], {
    name: '香菜',
    amount: '1 根',
    type: 'spice',
    optional: true,
    alternatives: [],
  });
  assert.deepEqual(migratedCustom.ingredients[4], {
    name: '水淀粉 (勾芡用)',
    amount: '适量',
    type: 'seasoning',
    optional: false,
    alternatives: [],
  });

  // 3. Idempotency check: re-running migration on v2 envelope yields identical recipe data
  const secondPass = buildMigratedEnvelope(envelope);
  assert.deepEqual(secondPass.envelope.data, envelope.data);

  const stats = summarizeRecipes(envelope.data.recipes);
  console.log(
    `[SELF-TEST PASSED] v1 -> v${DATA_VERSION} 迁移校验全部通过 ` +
      `(菜谱 ${stats.recipeCount} 道 | 槽位 ${stats.totalSlots} 个 | 可选 ${stats.optionalSlots} 项 | 备选组 ${stats.alternativeGroups} 组)`
  );
}

function resolveDefaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  const ext = parsed.ext || '.json';
  return path.join(parsed.dir, `${parsed.name}.v${DATA_VERSION}${ext}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const inPlace = args.includes('--in-place');
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((arg) => !arg.startsWith('--'));

  if (positional.length === 0) {
    console.error('错误：请提供待迁移的 JSON 备份文件路径，或使用 --self-test。');
    printUsage();
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), positional[0]);
  const outputPath = inPlace
    ? inputPath
    : positional[1]
      ? path.resolve(process.cwd(), positional[1])
      : resolveDefaultOutputPath(inputPath);

  const rawText = await fs.readFile(inputPath, 'utf8');
  const rawPayload = JSON.parse(rawText);
  const { sourceVersion, envelope } = buildMigratedEnvelope(rawPayload);
  const stats = summarizeRecipes(envelope.data.recipes);

  console.log(`源文件:   ${inputPath}`);
  console.log(`版本升级: v${sourceVersion} -> v${DATA_VERSION}`);
  console.log(
    `迁移统计: ${stats.recipeCount} 道菜谱 | ${stats.totalSlots} 个材料槽位 | ` +
      `${stats.optionalSlots} 项可选 | ${stats.alternativeGroups} 组备选 (共 ${stats.totalAlternatives} 个替换项)`
  );

  if (dryRun) {
    console.log('模式:     --dry-run（未写入文件）');
    return;
  }

  await fs.writeFile(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  console.log(`输出文件: ${outputPath}`);
}

main().catch((err) => {
  console.error(`迁移失败: ${err.message}`);
  process.exit(1);
});
