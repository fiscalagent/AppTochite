// src/db/seed.ts
//
// Система версионированных seed-миграций.
//
// Как добавить новые данные в новой версии приложения:
//   1. Добавь функцию-миграцию в массив SEED_MIGRATIONS (в конец).
//   2. Миграция получает только DELTA — новые/изменённые записи, не весь справочник.
//   3. Функция вызывается строго один раз: при первом запуске после обновления.
//   4. seedVersion автоматически продвигается вперёд (включая skip-версии).
//
// Пример добавления новых камней в версии 2:
//   SEED_MIGRATIONS.push(async () => {
//     await db.stones.bulkAdd(NEW_STONES_V2)
//   })

import { db } from './instance';
import type { Stone, Steel, Knife } from './instance';

// ─── Камни ───────────────────────────────────────────────────────────────────

const STONES: Omit<Stone, 'id'>[] = [
  // ОА (оксид алюминия)
  { brand: 'King KW-65',        grit: 1000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'King KW-65',        grit: 6000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 400,   type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 800,   type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 1000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 2000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 3000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Naniwa Chosera',    grit: 5000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Suehiro Cerax',     grit: 1000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Suehiro Cerax',     grit: 3000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 500,   type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 1000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 2000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 4000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 8000,  type: 'ao',      category: 'ao',      isCustom: false },
  { brand: 'Shapton Glass',     grit: 16000, type: 'ao',      category: 'ao',      isCustom: false },
  // Алмазные (гальваника)
  { brand: 'DMT Extra Coarse',    grit: 220,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Coarse',          grit: 325,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Fine',            grit: 600,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Extra Fine',      grit: 1200, type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'Атома Extra Coarse',  grit: 140,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'Атома Coarse',        grit: 360,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'Атома Fine',          grit: 600,  type: 'galvanic', category: 'galvanic', isCustom: false },
  // Природный камень
  { brand: 'Arkansas Soft',       grit: 400,  type: 'natural',  category: 'natural',  isCustom: false },
  { brand: 'Arkansas Hard',       grit: 800,  type: 'natural',  category: 'natural',  isCustom: false },
  { brand: 'Arkansas Black',      grit: 1200, type: 'natural',  category: 'natural',  isCustom: false },
  { brand: 'Norton India Fine',   grit: 600,  type: 'ao',       category: 'ao',       isCustom: false },
  { brand: 'Norton India Medium', grit: 300,  type: 'ao',       category: 'ao',       isCustom: false },
];

// ─── Стали ───────────────────────────────────────────────────────────────────
//
// Принцип категоризации:
//   'japanese'  — японские марки (VG, AUS, Aogami, Shirogami, ZDP и т.д.)
//   'european'  — европейские (немецкие, шведские, австрийские)
//   'american'  — американские non-powder (154CM, ATS-34, D2, 440-серия и т.д.)
//   'powder'    — все порошковые независимо от страны (CPM-*, M390, Elmax, HAP и т.д.)
//   'chinese'   — китайские
//   'russian'   — российские
//
// S30V/S35VN/S45VN/S90V/S110V/20CV представлены ТОЛЬКО в категории 'powder',
// чтобы избежать дублей.

const STEELS: Omit<Steel, 'id'>[] = [
  // Японские
  { name: 'VG-10',        hrc: 60, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'VG-1',         hrc: 59, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'VG-2',         hrc: 59, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'AUS-8',        hrc: 58, recommendedAngle: 17, category: 'japanese', isCustom: false },
  { name: 'AUS-10',       hrc: 60, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'Aogami #1',    hrc: 65, recommendedAngle: 12, category: 'japanese', isCustom: false, description: 'Синяя бумага №1' },
  { name: 'Aogami #2',    hrc: 63, recommendedAngle: 12, category: 'japanese', isCustom: false, description: 'Синяя бумага №2' },
  { name: 'Aogami Super', hrc: 67, recommendedAngle: 10, category: 'japanese', isCustom: false },
  { name: 'Shirogami #1', hrc: 65, recommendedAngle: 10, category: 'japanese', isCustom: false, description: 'Белая бумага №1' },
  { name: 'Shirogami #2', hrc: 62, recommendedAngle: 12, category: 'japanese', isCustom: false, description: 'Белая бумага №2' },
  { name: 'Shirogami #3', hrc: 60, recommendedAngle: 12, category: 'japanese', isCustom: false, description: 'Белая бумага №3' },
  { name: 'ZDP-189',      hrc: 67, recommendedAngle: 10, category: 'japanese', isCustom: false },
  { name: 'HAP40',        hrc: 67, recommendedAngle: 10, category: 'japanese', isCustom: false },
  { name: 'SG2 (R2)',     hrc: 64, recommendedAngle: 12, category: 'japanese', isCustom: false },
  { name: 'SKD-11',       hrc: 62, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'SK-5',         hrc: 60, recommendedAngle: 17, category: 'japanese', isCustom: false },
  // Европейские
  { name: 'X50CrMoV15',   hrc: 56, recommendedAngle: 20, category: 'european', isCustom: false, description: 'Немецкая нержавейка, Wüsthof / Henckels' },
  { name: '1.4116',        hrc: 56, recommendedAngle: 20, category: 'european', isCustom: false },
  { name: 'N690',          hrc: 60, recommendedAngle: 17, category: 'european', isCustom: false },
  { name: 'RWL-34',        hrc: 62, recommendedAngle: 15, category: 'european', isCustom: false },
  { name: 'Vanax 35',      hrc: 63, recommendedAngle: 15, category: 'european', isCustom: false },
  { name: '14C28N',        hrc: 58, recommendedAngle: 17, category: 'european', isCustom: false, description: 'Mora, шведская' },
  { name: '12C27',         hrc: 57, recommendedAngle: 17, category: 'european', isCustom: false },
  { name: 'Sandvik 13C26', hrc: 58, recommendedAngle: 17, category: 'european', isCustom: false },
  // Американские (non-powder)
  { name: '154CM',  hrc: 60, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: 'ATS-34', hrc: 60, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: 'D2',     hrc: 61, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: 'CPM-3V', hrc: 60, recommendedAngle: 20, category: 'american', isCustom: false },
  { name: 'CPM-4V', hrc: 63, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: '440C',   hrc: 58, recommendedAngle: 20, category: 'american', isCustom: false },
  { name: '440A',   hrc: 55, recommendedAngle: 20, category: 'american', isCustom: false },
  // Российские
  { name: '95Х18', hrc: 58, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: '110Х18', hrc: 60, recommendedAngle: 17, category: 'russian', isCustom: false },
  { name: '65Х13',  hrc: 55, recommendedAngle: 22, category: 'russian', isCustom: false },
  { name: 'Х12МФ',  hrc: 62, recommendedAngle: 17, category: 'russian', isCustom: false },
  { name: 'ХВГ',    hrc: 60, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: '9ХС',    hrc: 62, recommendedAngle: 17, category: 'russian', isCustom: false },
  { name: 'У8',     hrc: 60, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: 'У10',    hrc: 62, recommendedAngle: 17, category: 'russian', isCustom: false },
  { name: 'Р6М5',   hrc: 64, recommendedAngle: 15, category: 'russian', isCustom: false, description: 'Быстрорез' },
  // Китайские
  { name: '8Cr13MoV',  hrc: 58, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '8Cr14MoV',  hrc: 58, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '9Cr18MoV',  hrc: 60, recommendedAngle: 17, category: 'chinese', isCustom: false },
  { name: '7Cr17MoV',  hrc: 56, recommendedAngle: 22, category: 'chinese', isCustom: false },
  { name: '5Cr15MoV',  hrc: 54, recommendedAngle: 22, category: 'chinese', isCustom: false },
  // Порошковые (все порошковые марки, включая европейские Böhler)
  { name: 'CPM-S30V',  hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false },
  { name: 'CPM-S35VN', hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false },
  { name: 'CPM-S45VN', hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CPM-S90V',  hrc: 63, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CPM-S110V', hrc: 63, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CPM-20CV',  hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CPM-M4',    hrc: 65, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'Maxamet',   hrc: 68, recommendedAngle: 12, category: 'powder', isCustom: false },
  { name: 'M390',      hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false, description: 'Böhler, австрийская порошковая' },
  { name: 'Elmax',     hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false, description: 'Böhler, австрийская порошковая' },
  { name: 'Böhler K110', hrc: 61, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CTS-XHP',   hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false },
  { name: 'Vanax 75',  hrc: 68, recommendedAngle: 12, category: 'powder', isCustom: false },
  { name: 'K390',      hrc: 65, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'HAP72',     hrc: 69, recommendedAngle: 10, category: 'powder', isCustom: false },
];

// ─── Ножи ────────────────────────────────────────────────────────────────────
//
// Категории:
//   'japanese_kitchen' — японские кухонные
//   'german'           — немецкие + швейцарские кухонные
//   'scandinavian'     — скандинавские охотничьи/фиксы
//   'american'         — американские складные и фиксы
//   'russian'          — российские
//   'chinese'          — китайские (все сегменты)

const KNIVES: Omit<Knife, 'id'>[] = [
  // ── Японские кухонные ──────────────────────────────────────────────────────
  { brand: 'Global G-2',               country: 'Япония', steel: 'CROMOVA 18',    recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Global G-9',               country: 'Япония', steel: 'CROMOVA 18',    recommendedAngle: 15, type: 'Nakiri',    category: 'japanese_kitchen', isCustom: false },
  { brand: 'Global Sai',               country: 'Япония', steel: 'CROMOVA 18',    recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Tojiro DP',                country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Tojiro Flash',             country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Tojiro Shippu',            country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Shun Classic',             country: 'Япония', steel: 'VG-MAX',        recommendedAngle: 16, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Shun Premier',             country: 'Япония', steel: 'VG-MAX',        recommendedAngle: 16, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Shun Dual Core',           country: 'Япония', steel: 'VG-MAX',        recommendedAngle: 16, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'MAC Professional',         country: 'Япония', steel: 'High Carbon',   recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'MAC Chef',                 country: 'Япония', steel: 'High Carbon',   recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'MAC Superior',             country: 'Япония', steel: 'High Carbon',   recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Miyabi Birchwood',         country: 'Япония', steel: 'SG2',           recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Miyabi Kaizen',            country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Miyabi Black',             country: 'Япония', steel: 'SG2',           recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Kasumi Damascus',          country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Kasumi Titanium',          country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Yaxell Ran',               country: 'Япония', steel: 'VG-10',         recommendedAngle: 16, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Yaxell Super Gou',         country: 'Япония', steel: 'SG2',           recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Yaxell Gou',               country: 'Япония', steel: 'SG2',           recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Mcusta Zanmai Damascus',   country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Sakai Takayuki',           country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Sakai Takayuki Damascus',  country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Takamura Chromax',         country: 'Япония', steel: 'R2/SG2',        recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Takamura R2',              country: 'Япония', steel: 'R2/SG2',        recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Misono UX10',              country: 'Япония', steel: 'Swedish Steel',  recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Misono Dragon',            country: 'Япония', steel: 'Swedish Steel',  recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Masamoto VG',              country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Kanehide PS60',            country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Suisin Inox',              country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Hattori FH',               country: 'Япония', steel: 'VG-10',         recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Kikuichi',                 country: 'Япония',                           recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Fujiwara',                 country: 'Япония',                           recommendedAngle: 15, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Konosuke',                 country: 'Япония', steel: 'ZDP-189',        recommendedAngle: 10, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Tanaka',                   country: 'Япония', steel: 'Aogami Super',   recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Zwilling Miyabi',          country: 'Япония', steel: 'SG2',           recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  { brand: 'Yoshimi Kato',             country: 'Япония', steel: 'Aogami Super',   recommendedAngle: 12, type: 'Gyuto',     category: 'japanese_kitchen', isCustom: false },
  // ── Немецкие + швейцарские кухонные ───────────────────────────────────────
  { brand: 'Wüsthof Classic',              country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Wüsthof Ikon',                 country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Wüsthof Classic Ikon',         country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Zwilling Pro',                 country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Zwilling Four Star',           country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Zwilling Twin',                country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Henckels Classic',             country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Henckels International',       country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Güde Alpha',                   country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Messermeister Meridian',       country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Dick Premier Plus',            country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Dick 1905',                    country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Burgvogel',                    country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Nesmuk',                       country: 'Германия',                         recommendedAngle: 17, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Böker Core',                   country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Böker Manufaktur',             country: 'Германия',                         recommendedAngle: 17, type: 'Складной', category: 'german', isCustom: false },
  { brand: 'Victorinox Fibrox',            country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Victorinox Grand Maitre',      country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  { brand: 'Victorinox SwissClassic',      country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф',     category: 'german', isCustom: false },
  // ── Скандинавские ─────────────────────────────────────────────────────────
  { brand: 'Mora Companion',    country: 'Швеция',  steel: '12C27',            recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Garberg',      country: 'Швеция',  steel: '14C28N',           recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Bushcraft',    country: 'Швеция',  steel: '12C27',            recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Kansbol',      country: 'Швеция',  steel: '12C27',            recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Eldris',       country: 'Швеция',  steel: '12C27',            recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Tactical',     country: 'Швеция',  steel: '12C27',            recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Fallkniven A1',     country: 'Швеция',  steel: '3G (Lam. VG-10)', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Fallkniven F1',     country: 'Швеция',  steel: '3G (Lam. VG-10)', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Fallkniven S1',     country: 'Швеция',  steel: '3G (Lam. VG-10)', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Fallkniven WM1',    country: 'Швеция',  steel: '3G (Lam. VG-10)', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Marttiini Lynx',    country: 'Финляндия', steel: '420HC',          recommendedAngle: 22, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Marttiini Tundra',  country: 'Финляндия', steel: '420HC',          recommendedAngle: 22, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Marttiini Ranger',  country: 'Финляндия', steel: '420HC',          recommendedAngle: 22, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Temagami',    country: 'Норвегия', steel: '12C27',           recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Eggen',       country: 'Норвегия', steel: '12C27',           recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Utvaer',      country: 'Норвегия', steel: '12C27',           recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Roselli Hunting',   country: 'Финляндия', steel: 'HC',             recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Roselli UHC',       country: 'Финляндия', steel: 'UHC',            recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Puukko',            country: 'Финляндия',                           recommendedAngle: 22, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.7',       country: 'Франция',  steel: '12C27',           recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.8',       country: 'Франция',  steel: '12C27',           recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.9',       country: 'Франция',  steel: '12C27',           recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.10',      country: 'Франция',  steel: '12C27',           recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.12',      country: 'Франция',  steel: '12C27',           recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Laguiole en Aubrac', country: 'Франция',                            recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  // ── Американские ──────────────────────────────────────────────────────────
  { brand: 'Spyderco Paramilitary 2', country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Para 3',         country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Military',       country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Delica',         country: 'США', steel: 'VG-10',     recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Endura',         country: 'США', steel: 'VG-10',     recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Native',         country: 'США', steel: 'CPM-S35VN', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Manix 2',        country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Chaparral',      country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Caribbean',      country: 'США', steel: 'LC200N',    recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Griptilian',    country: 'США', steel: '154CM',     recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Bugout',        country: 'США', steel: 'CPM-S30V',  recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Osborne',       country: 'США', steel: 'CPM-S30V',  recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Crooked River', country: 'США', steel: 'CPM-S30V',  recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Adamas',        country: 'США', steel: 'CPM-CruWear', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Bailout',       country: 'США', steel: 'CPM-M4',    recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Mini Griptilian', country: 'США', steel: '154CM',   recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Blur',            country: 'США', steel: '14C28N',    recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Leek',            country: 'США', steel: '14C28N',    recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Cryo',            country: 'США', steel: '8Cr13MoV',  recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Skyline',         country: 'США', steel: '14C28N',    recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Launch',          country: 'США', steel: 'CPM-154',   recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Knockout',        country: 'США', steel: 'CPM-154',   recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Zero Tolerance 0562',     country: 'США', steel: 'CPM-20CV',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Zero Tolerance 0450',     country: 'США', steel: 'CPM-20CV',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Zero Tolerance 0308',     country: 'США', steel: 'CPM-20CV',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'CRKT Drifter',            country: 'США', steel: '8Cr14MoV',  recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'CRKT Squid',              country: 'США', steel: '8Cr13MoV',  recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'CRKT Provoke',            country: 'США', steel: '8Cr13MoV',  recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Cold Steel Recon 1',      country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Cold Steel AD-15',        country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Cold Steel SRK',          country: 'США', steel: 'CPM-3V',    recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Cold Steel Tanto',        country: 'США', steel: 'CPM-3V',    recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Buck 110',                country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Buck 112',                country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Buck 119',                country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Buck 120',                country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Ka-Bar USMC',             country: 'США', steel: '1095 Cro-Van', recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Ka-Bar Becker',           country: 'США', steel: '1095 Cro-Van', recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Gerber Strongarm',        country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Gerber LMF II',           country: 'США', steel: '420HC',     recommendedAngle: 22, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'SOG Flash',               country: 'США', steel: 'AUS-8',     recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'SOG Seal Pup',            country: 'США', steel: 'AUS-8',     recommendedAngle: 17, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'SOG Trident',             country: 'США', steel: 'AUS-8',     recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Case Trapper',            country: 'США', steel: 'Tru-Sharp', recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Case Stockman',           country: 'США', steel: 'Tru-Sharp', recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'ESEE 4',                  country: 'США', steel: '1095',      recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'ESEE 5',                  country: 'США', steel: '1095',      recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'ESEE 6',                  country: 'США', steel: '1095',      recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'ESEE Junglas',            country: 'США', steel: '1075',      recommendedAngle: 22, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Bark River Bravo',        country: 'США', steel: 'CPM-3V',    recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Bark River Aurora',       country: 'США', steel: 'CPM-3V',    recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Chris Reeve Sebenza',     country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Chris Reeve Inkosi',      country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Emerson Commander',       country: 'США', steel: '154CM',     recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Emerson CQC-7',           country: 'США', steel: '154CM',     recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Medford Praetorian',      country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Leatherman Wave',         country: 'США', steel: '420HC',     recommendedAngle: 25, type: 'Другой',    category: 'american', isCustom: false },
  { brand: 'Leatherman Signal',       country: 'США', steel: '420HC',     recommendedAngle: 25, type: 'Другой',    category: 'american', isCustom: false },
  // ── Российские ────────────────────────────────────────────────────────────
  { brand: 'Кизляр Финка',            country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Волк',             country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Орёл',             country: 'Россия', steel: 'AUS-8',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Скорпион',         country: 'Россия', steel: 'AUS-8',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Коршун',           country: 'Россия', steel: 'AUS-8',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Supreme Croc',     country: 'Россия', steel: 'D2',     recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Ворон-3',          country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Южный Крест Шершень',     country: 'Россия', steel: 'Х12МФ',  recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Южный Крест Бобёр',       country: 'Россия', steel: 'Х12МФ',  recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Южный Крест Нерпа',       country: 'Россия', steel: 'Х12МФ',  recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Hiro Шеф',                country: 'Россия',                   recommendedAngle: 15, type: 'Шеф',       category: 'russian', isCustom: false },
  { brand: 'Hiro Сантоку',            country: 'Россия',                   recommendedAngle: 15, type: 'Сантоку',   category: 'russian', isCustom: false },
  { brand: 'Самура Mo-V',             country: 'Россия', steel: 'AUS-8',  recommendedAngle: 17, type: 'Шеф',       category: 'russian', isCustom: false },
  { brand: 'Самура Harakiri',         country: 'Россия', steel: 'AUS-8',  recommendedAngle: 17, type: 'Шеф',       category: 'russian', isCustom: false },
  { brand: 'Самура Reptile',          country: 'Россия',                   recommendedAngle: 17, type: 'Шеф',       category: 'russian', isCustom: false },
  { brand: 'НОКС Сова',               country: 'Россия', steel: '95Х18',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'НОКС Аргун',              country: 'Россия', steel: '95Х18',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'НОКС Финка-2',            country: 'Россия', steel: '95Х18',  recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Reptilian Трапёр',        country: 'Россия',                   recommendedAngle: 20, type: 'Складной', category: 'russian', isCustom: false },
  { brand: 'Чебурков',                country: 'Россия', steel: 'Х12МФ',  recommendedAngle: 15, type: 'Складной', category: 'russian', isCustom: false },
  { brand: 'Русский булат',           country: 'Россия',                   recommendedAngle: 15, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Ворсма',                  country: 'Россия',                   recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Витязь',                  country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Мелита-К',                country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Павловские ножи',         country: 'Россия',                   recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'НОЖЕМИР Беркут',          country: 'Россия', steel: '65Х13',  recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  // ── Китайские ─────────────────────────────────────────────────────────────
  // Кухонные премиум
  { brand: 'HezHen Master',           country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'HezHen Bunka',            country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Бунка',    category: 'chinese', isCustom: false },
  { brand: 'HezHen Santoku',          country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Сантоку',  category: 'chinese', isCustom: false },
  { brand: 'HezHen Kiritsuke',        country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Kiritsuke', category: 'chinese', isCustom: false },
  { brand: 'XinZuo Panda',            country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'XinZuo Lan',              country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'Shibazi',                 country: 'Китай', steel: '8Cr13MoV',    recommendedAngle: 20, type: 'Шеф',      category: 'chinese', isCustom: false },
  { brand: 'TuoTown Common',          country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'TuoTown Hawk',            country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'TuoTown Canyon',          country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  { brand: 'TuoTown NEO',             country: 'Китай', steel: '10Cr15CoMoV', recommendedAngle: 15, type: 'Gyuto',    category: 'chinese', isCustom: false },
  // Складные премиум
  { brand: 'WE Knife Banter',         country: 'Китай', steel: 'CPM-20CV',    recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'WE Knife RekkeR',         country: 'Китай', steel: 'CPM-20CV',    recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'WE Knife Typhoeus',       country: 'Китай', steel: 'CPM-20CV',    recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'WE Knife Arrakis',        country: 'Китай', steel: 'CPM-20CV',    recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'WE Knife Merata',         country: 'Китай', steel: 'CPM-20CV',    recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Reate EXO',               country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Reate Jack',              country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Reate Horizon',           country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kizer Gemini',            country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kizer Domin',             country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kizer Feist',             country: 'Китай', steel: '154CM',       recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kizer Megatherium',       country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  // Средний сегмент
  { brand: 'Civivi Elementum',        country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Praxis',           country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Baklash',          country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Banter',           country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Mini Asticus',     country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Qubit',            country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Brazen',           country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Lumi',             country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Civivi Anthropos',        country: 'Китай', steel: '9Cr18MoV',    recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'SENCUT Actway',           country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'SENCUT Crowflight',       country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'SENCUT Serene',           country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'QSP Penguin',             country: 'Китай', steel: '154CM',       recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'QSP Parrot',              country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'QSP Hawk',                country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'QSP Otter',               country: 'Китай', steel: '154CM',       recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'QSP Grebe',               country: 'Китай', steel: '154CM',       recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Bestech Starfall',        country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Bestech Togatta',         country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Bestech Keen II',         country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Bestech Paladin',         country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kansept Kryo',            country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kansept Goblin',          country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kansept Fenrir',          country: 'Китай', steel: 'CPM-S35VN',   recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Artisan Tomahawk',        country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Artisan Artery',          country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Artisan Tradition',       country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Vosteed Corgi',           country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Vosteed Nightshade',      country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Vosteed Raccoon',         country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Petrified Fish Victor',   country: 'Китай', steel: '154CM',       recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Real Steel Luna',         country: 'Китай', steel: 'N690',        recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Real Steel E802',         country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Real Steel H6',           country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Kunwu Pulsar',            country: 'Китай', steel: 'M390',        recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  // Бюджетные
  { brand: 'Ganzo G704',              country: 'Китай', steel: '440C',        recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Ganzo G7531',             country: 'Китай', steel: '440C',        recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Ganzo G729',              country: 'Китай', steel: '440C',        recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Firebird FH41',           country: 'Китай', steel: 'D2',          recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Sanrenmu 9001',           country: 'Китай', steel: '8Cr13MoV',    recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Sanrenmu 7010',           country: 'Китай', steel: '8Cr13MoV',    recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Sanrenmu Land',           country: 'Китай', steel: '8Cr13MoV',    recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Enlan EL01',              country: 'Китай', steel: '8Cr13MoV',    recommendedAngle: 20, type: 'Складной', category: 'chinese', isCustom: false },
];

// ─── Миграции ────────────────────────────────────────────────────────────────
//
// Каждый элемент массива — одна версия seed-данных.
// Индекс 0 → seedVersion 1, индекс 1 → seedVersion 2, и т.д.
// Существующие пользователи помечаются в db.ts (version(3).upgrade) как v1,
// поэтому первая миграция выполняется только при чистой установке.

const SEED_MIGRATIONS: Array<() => Promise<void>> = [

  // ── v1: начальные справочники ─────────────────────────────────────────────
  async () => {
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() });
    await db.stones.bulkAdd(STONES);
    await db.steels.bulkAdd(STEELS);
    await db.knives.bulkAdd(KNIVES);
  },

  // ── v2 и далее: добавлять сюда новые записи (только delta) ───────────────
  // async () => {
  //   await db.stones.bulkAdd(STONES_V2)
  // },

];

// ─── Точка входа ─────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  const stored = await db.meta.get('seedVersion');
  const currentVersion = (stored?.value as number) ?? 0;

  for (let v = currentVersion; v < SEED_MIGRATIONS.length; v++) {
    // Каждая миграция и обновление версии — в одной транзакции.
    // Если приложение упадёт в середине — миграция повторится при следующем запуске.
    await db.transaction('rw', [db.clients, db.stones, db.steels, db.knives, db.meta], async () => {
      await SEED_MIGRATIONS[v]();
      await db.meta.put({ key: 'seedVersion', value: v + 1 });
    });
  }
}
