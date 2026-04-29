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
import type { AppTochiteDB, Stone, Steel, Knife } from './db';

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

// ─── Расширения v2: Дополнительные камни, стали, ножи ──────────────────────

// ── Камни v2: Полные серии от основных производителей ──────────────────────
const STONES_V2: Omit<Stone, 'id'>[] = [
  // Naniwa Super Stone (10 гритов)
  { brand: 'Naniwa Super Stone',  grit: 220,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 400,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 2000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 3000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 5000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 8000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 10000, type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Naniwa Super Stone',  grit: 12000, type: 'ao',    category: 'ao',    isCustom: false },
  // Shapton Kuromaku Pro (11 гритов)
  { brand: 'Shapton Kuromaku',    grit: 120,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 320,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 2000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 5000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 8000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 12000, type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 16000, type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Shapton Kuromaku',    grit: 20000, type: 'ao',    category: 'ao',    isCustom: false },
  // Suehiro Cerax (9 гритов)
  { brand: 'Suehiro Cerax',       grit: 320,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 400,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 600,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 800,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 3000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 5000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 6000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 8000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Suehiro Cerax',       grit: 10000, type: 'ao',    category: 'ao',    isCustom: false },
  // GRINDERMAN ОА (российский, 6 гритов)
  { brand: 'GRINDERMAN ОА',       grit: 120,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'GRINDERMAN ОА',       grit: 240,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'GRINDERMAN ОА',       grit: 400,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'GRINDERMAN ОА',       grit: 600,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'GRINDERMAN ОА',       grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  // GRINDERMAN КК (зелёный карбид кремния, 5 гритов)
  { brand: 'GRINDERMAN КК',       grit: 120,   type: 'kk',    category: 'kk',    isCustom: false },
  { brand: 'GRINDERMAN КК',       grit: 240,   type: 'kk',    category: 'kk',    isCustom: false },
  { brand: 'GRINDERMAN КК',       grit: 400,   type: 'kk',    category: 'kk',    isCustom: false },
  { brand: 'GRINDERMAN КК',       grit: 600,   type: 'kk',    category: 'kk',    isCustom: false },
  { brand: 'GRINDERMAN КК',       grit: 1000,  type: 'kk',    category: 'kk',    isCustom: false },
  // GRINDERMAN Эльбор (3 гритов)
  { brand: 'GRINDERMAN Эльбор',   grit: 400,   type: 'elbor', category: 'elbor', isCustom: false },
  { brand: 'GRINDERMAN Эльбор',   grit: 600,   type: 'elbor', category: 'elbor', isCustom: false },
  { brand: 'GRINDERMAN Эльбор',   grit: 1000,  type: 'elbor', category: 'elbor', isCustom: false },
  // DMT (дополнительные модели, 6 гритов)
  { brand: 'DMT DuoSharp',        grit: 325,   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT DuoSharp',        grit: 600,   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT DuoSharp',        grit: 1000,  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Ceramic',         grit: 220,   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Ceramic',         grit: 325,   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'DMT Ceramic',         grit: 600,   type: 'galvanic', category: 'galvanic', isCustom: false },
  // King Pro (7 моделей)
  { brand: 'King Pro 300',        grit: 300,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Pro 1200',       grit: 1200,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Deluxe 1000',    grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Deluxe 2000',    grit: 2000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Deluxe 4000',    grit: 4000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Deluxe 6000',    grit: 6000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'King Deluxe 8000',    grit: 8000,  type: 'ao',    category: 'ao',    isCustom: false },
  // Imanishi Bester (4 гритов)
  { brand: 'Imanishi Bester',     grit: 700,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Imanishi Bester',     grit: 1200,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Imanishi Bester',     grit: 2400,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Imanishi Bester',     grit: 4000,  type: 'ao',    category: 'ao',    isCustom: false },
  // Boride (5 гритов)
  { brand: 'Boride Superfine',    grit: 400,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Boride Superfine',    grit: 600,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Boride Superfine',    grit: 800,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Boride Superfine',    grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Boride Superfine',    grit: 1200,  type: 'ao',    category: 'ao',    isCustom: false },
  // Norton India (дополнительно, 2 гритов)
  { brand: 'Norton India',        grit: 1000,  type: 'ao',    category: 'ao',    isCustom: false },
  { brand: 'Norton India',        grit: 1200,  type: 'ao',    category: 'ao',    isCustom: false },
  // Природные камни
  { brand: 'Washita Natural',     grit: 800,   type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Belgian Coticule',    grit: 8000,  type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Hon Suita',  grit: 5000,  type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Narutaki',   grit: 8000,  type: 'natural', category: 'natural', isCustom: false },
  // Синтетические советские камни
  { brand: 'БП-2 (советский)',    grit: 800,   type: 'ao',    category: 'ao',    isCustom: false },
  { brand: '63С оселок',          grit: 600,   type: 'kk',    category: 'kk',    isCustom: false },
];

// ── Стали v2: Дополнительные марки ────────────────────────────────────────────
const STEELS_V2: Omit<Steel, 'id'>[] = [
  // Углеродные стали
  { name: '1075',       hrc: 58, recommendedAngle: 20, category: 'american', isCustom: false, description: 'Углеродная сталь, хорошая ударостойкость' },
  { name: '1084',       hrc: 59, recommendedAngle: 20, category: 'american', isCustom: false, description: 'Углеродная сталь, отличный баланс' },
  { name: '52100',      hrc: 62, recommendedAngle: 17, category: 'american', isCustom: false, description: 'Подшипниковая сталь, отличное удержание края' },
  { name: 'O1',         hrc: 61, recommendedAngle: 17, category: 'american', isCustom: false, description: 'Инструментальная углеродка' },
  { name: 'W2',         hrc: 62, recommendedAngle: 17, category: 'american', isCustom: false, description: 'Углеродка с ванадием, очень острая' },
  { name: 'A2',         hrc: 61, recommendedAngle: 17, category: 'american', isCustom: false, description: 'Инструментальная сталь' },
  { name: '420HC',      hrc: 57, recommendedAngle: 20, category: 'american', isCustom: false, description: 'Бюджетная нержавейка, популярна' },
  // Новые полезные стали
  { name: 'MagnaCut',   hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false, description: 'Современная порошковая, отличный баланс' },
  { name: 'LC200N',     hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false, description: 'Суперкоррозионостойкая, можно в соль' },
  { name: 'Nitro-V',    hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false, description: 'Аналог 7Cr17, хорошая вязкость' },
  { name: 'CPM CruWear', hrc: 64, recommendedAngle: 13, category: 'powder', isCustom: false },
  { name: 'REX 45',     hrc: 63, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'REX 121',    hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'Niolox',     hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false },
  // Европейские
  { name: 'Sleipner',   hrc: 62, recommendedAngle: 15, category: 'european', isCustom: false, description: 'Шведская порошковая' },
  { name: 'Vanadis 4E', hrc: 63, recommendedAngle: 15, category: 'european', isCustom: false },
  // Русские стали
  { name: 'ШХ15',       hrc: 58, recommendedAngle: 20, category: 'russian', isCustom: false, description: 'Подшипниковая, закаляется до 60-62' },
  { name: '40Х13',      hrc: 55, recommendedAngle: 22, category: 'russian', isCustom: false, description: 'Бюджетная нержавейка' },
  { name: '30Х13',      hrc: 54, recommendedAngle: 22, category: 'russian', isCustom: false },
  { name: '65Г',        hrc: 58, recommendedAngle: 20, category: 'russian', isCustom: false, description: 'Пружинная углеродка' },
  { name: 'У12',        hrc: 62, recommendedAngle: 17, category: 'russian', isCustom: false, description: 'Углеродка, любима старыми мастерами' },
  { name: 'Р18',        hrc: 64, recommendedAngle: 15, category: 'russian', isCustom: false, description: 'Быстрорез' },
];

// ── Ножи v2: Расширения и новые бренды ────────────────────────────────────────
const KNIVES_V2: Omit<Knife, 'id'>[] = [
  // Российские мастера и авторские ножи
  { brand: 'Соколов Д.В.',              country: 'Россия', steel: 'Х12МФ',  recommendedAngle: 15, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Архангельский М.В.',        country: 'Россия', steel: 'Дамаск',  recommendedAngle: 14, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Студия Кузнецова',         country: 'Россия',                    recommendedAngle: 15, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Назаров Сергей',           country: 'Россия', steel: '95Х18',    recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Семин В.В.',                country: 'Россия', steel: 'ШХ15',    recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  // Дополнительные модели Кизляр
  { brand: 'Кизляр Стриж',             country: 'Россия', steel: 'AUS-8',   recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Пантера',           country: 'Россия', steel: 'AUS-8',   recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Рысь',              country: 'Россия', steel: '65Х13',   recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Кречет',            country: 'Россия', steel: 'AUS-8',   recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Разведчик',         country: 'Россия', steel: 'D2',      recommendedAngle: 17, type: 'Охотничий', category: 'russian', isCustom: false },
  // Дополнительные модели НОКС
  { brand: 'НОКС Страйк',              country: 'Россия', steel: '95Х18',   recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'НОКС Сапсан',              country: 'Россия', steel: '95Х18',   recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'НОКС Ворон',               country: 'Россия', steel: '95Х18',   recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  // АиР (компания из Ворсмы)
  { brand: 'АиР Рыбак',                country: 'Россия', steel: 'ХВГ',     recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'АиР Охотник',              country: 'Россия', steel: '95Х18',   recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'АиР Путник',               country: 'Россия', steel: 'ХВГ',     recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  // Итальянские
  { brand: 'Lionsteel T.R.E.',         country: 'Италия', steel: 'M390',    recommendedAngle: 15, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Lionsteel SR-1',           country: 'Италия', steel: 'M390',    recommendedAngle: 15, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Fox Knives Core',          country: 'Италия', steel: 'M390',    recommendedAngle: 15, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Fox Knives Vulpis',        country: 'Италия', steel: 'D2',      recommendedAngle: 17, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Extrema Ratio Miai',       country: 'Италия', steel: 'N690',    recommendedAngle: 17, type: 'Тактический', category: 'scandinavian', isCustom: false },
  { brand: 'Extrema Ratio Shrapnel',   country: 'Италия', steel: 'M390',    recommendedAngle: 15, type: 'Тактический', category: 'scandinavian', isCustom: false },
  // Бюджетные иностранные
  { brand: 'Tramontina Century',       country: 'Бразилия', steel: '8Cr13MoV', recommendedAngle: 18, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Tramontina Prochef',       country: 'Бразилия', steel: '8Cr13MoV', recommendedAngle: 18, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Mercer Millennia',         country: 'США', steel: 'X30Cr13',    recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  // Дополнительные американские
  { brand: 'Spyderco Lil Lil Native',  country: 'США', steel: 'CPM-S35VN', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Dragonfly',       country: 'США', steel: 'VG-10',     recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Barrage',        country: 'США', steel: 'CPM-S30V',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Freek',          country: 'США', steel: 'CPM-20CV',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Ontario RAT-1',            country: 'США', steel: 'AUS-8A',    recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Ontario RAT-2',            country: 'США', steel: 'AUS-8A',    recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Hinderer XM-18',           country: 'США', steel: 'CPM-20CV',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Protech Godfather',        country: 'США', steel: '154CM',     recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Microtech Ultratech',      country: 'США', steel: 'CPM-M390',  recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
];

// ─── Миграции ────────────────────────────────────────────────────────────────
//
// Каждый элемент массива — одна версия seed-данных.
// Индекс 0 → seedVersion 1, индекс 1 → seedVersion 2, и т.д.
// Существующие пользователи помечаются в db.ts (version(3).upgrade) как v1,
// поэтому первая миграция выполняется только при чистой установке.

// ── Камни v3: Дополнительные бренды и серии ──────────────────────────────────
const STONES_V3: Omit<Stone, 'id'>[] = [
  // Gesshin (японский премиум)
  { brand: 'Gesshin 400',       grit: 400,   type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Gesshin 2000',      grit: 2000,  type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Gesshin 4000',      grit: 4000,  type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Gesshin 6000',      grit: 6000,  type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Gesshin 10000',     grit: 10000, type: 'ao', category: 'ao', isCustom: false },
  // Dan's Whetstones (американский)
  { brand: "Dan's 120",         grit: 120,   type: 'ao', category: 'ao', isCustom: false },
  { brand: "Dan's 220",         grit: 220,   type: 'ao', category: 'ao', isCustom: false },
  { brand: "Dan's 300",         grit: 300,   type: 'ao', category: 'ao', isCustom: false },
  { brand: "Dan's 400",         grit: 400,   type: 'ao', category: 'ao', isCustom: false },
  { brand: "Dan's 600",         grit: 600,   type: 'ao', category: 'ao', isCustom: false },
  { brand: "Dan's 800",         grit: 800,   type: 'ao', category: 'ao', isCustom: false },
  // Eze-Lap Diamond (алмазные японские)
  { brand: 'Eze-Lap Diamond 120', grit: 120, type: 'diamond', category: 'diamond', isCustom: false },
  { brand: 'Eze-Lap Diamond 220', grit: 220, type: 'diamond', category: 'diamond', isCustom: false },
  { brand: 'Eze-Lap Diamond 400', grit: 400, type: 'diamond', category: 'diamond', isCustom: false },
  { brand: 'Eze-Lap Diamond 600', grit: 600, type: 'diamond', category: 'diamond', isCustom: false },
  { brand: 'Eze-Lap Diamond 1000', grit: 1000, type: 'diamond', category: 'diamond', isCustom: false },
  // Венев эльбор (российский)
  { brand: 'Веневский Эльбор F120', grit: 120, type: 'elbor', category: 'elbor', isCustom: false },
  { brand: 'Веневский Эльбор F240', grit: 240, type: 'elbor', category: 'elbor', isCustom: false },
  { brand: 'Веневский Эльбор F400', grit: 400, type: 'elbor', category: 'elbor', isCustom: false },
  // Lapping film (тонкие абразивные)
  { brand: '3M Trizact 220', grit: 220, type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: '3M Trizact 320', grit: 320, type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: '3M Trizact 400', grit: 400, type: 'galvanic', category: 'galvanic', isCustom: false },
  // Практические притиры (stropping compounds)
  { brand: 'Чугунный притир', grit: 120, type: 'pritir', category: 'pritir', isCustom: false },
  { brand: 'Медный притир', grit: 240, type: 'pritir', category: 'pritir', isCustom: false },
];

// ── Стали v3: Дополнительные марки ────────────────────────────────────────────
const STEELS_V3: Omit<Steel, 'id'>[] = [
  // Ещё углеродные
  { name: '1075H', hrc: 57, recommendedAngle: 20, category: 'american', isCustom: false },
  { name: 'L6', hrc: 56, recommendedAngle: 22, category: 'american', isCustom: false, description: 'Пружинная углеродка' },
  { name: '5160', hrc: 58, recommendedAngle: 20, category: 'american', isCustom: false },
  { name: 'Spring Steel 1055', hrc: 54, recommendedAngle: 22, category: 'american', isCustom: false },
  // Ещё порошковые
  { name: 'Böhler K390', hrc: 65, recommendedAngle: 12, category: 'powder', isCustom: false },
  { name: 'Böhler M390', hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'Carpenter CTS-XHP', hrc: 61, recommendedAngle: 17, category: 'powder', isCustom: false },
  { name: 'Allegheny AEB-L', hrc: 59, recommendedAngle: 18, category: 'powder', isCustom: false },
  // Японские добавки
  { name: 'SRS-13', hrc: 58, recommendedAngle: 18, category: 'japanese', isCustom: false },
  { name: 'SRS-15', hrc: 60, recommendedAngle: 17, category: 'japanese', isCustom: false },
  { name: 'Gingami #3', hrc: 61, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'Cowry X', hrc: 63, recommendedAngle: 15, category: 'japanese', isCustom: false },
  // Шведские
  { name: 'Vanadis 10', hrc: 62, recommendedAngle: 15, category: 'european', isCustom: false },
  { name: 'ASP2023', hrc: 62, recommendedAngle: 15, category: 'european', isCustom: false },
];

// ── Ножи v3: Массовые бренды и дополнительные модели ────────────────────────
const KNIVES_V3: Omit<Knife, 'id'>[] = [
  // Дополнительные Victorinox всех типов (расширение)
  { brand: 'Victorinox Chef 6"',          country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Victorinox Chef 8"',          country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Victorinox Paring Knife',     country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Victorinox Serrated Edge',    country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  // Дополнительные Wüsthof
  { brand: 'Wüsthof Gourmet',             country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Wüsthof Silverpoint',         country: 'Германия',  steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  // Дополнительные Opinel (скандинавские)
  { brand: 'Opinel No.6',                 country: 'Франция', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  { brand: 'Opinel No.11',                country: 'Франция', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'scandinavian', isCustom: false },
  // Дополнительные Mora
  { brand: 'Mora Robust',                 country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Classic',                country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Fixed',                  country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Дополнительные Spyderco
  { brand: 'Spyderco Advocate',           country: 'США', steel: 'CPM-M4', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Chill',              country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Tenacious',          country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Persistence',        country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Ambitious',          country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  // Дополнительные Benchmade
  { brand: 'Benchmade Contego',           country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade Barrage Auto',      country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Benchmade North Fork',        country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'american', isCustom: false },
  // Дополнительные CRKT
  { brand: 'CRKT Kommer',                 country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'CRKT Pilar',                  country: 'США', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'CRKT Ripple',                 country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  // Дополнительные Kershaw
  { brand: 'Kershaw Speedstart',          country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Emerson',             country: 'США', steel: '14C28N', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Kershaw Dividend',            country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  // Дополнительные Cold Steel
  { brand: 'Cold Steel Voyager',          country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Cold Steel Tuff Lite',        country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Складной', category: 'american', isCustom: false },
  // Дополнительные Mora skandinavian (больше моделей)
  { brand: 'Helle Mandra',                country: 'Норвегия', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Almdal',                country: 'Норвегия', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Дополнительные японские кухонные
  { brand: 'Yoshida Shiro',               country: 'Япония', steel: 'High Carbon', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Azumi Yuzo',                  country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  // Русские дополнительно
  { brand: 'Репутация РУС',               country: 'Россия', steel: '65Х13', recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'ТОО Вороонежский',            country: 'Россия', steel: '40Х13', recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'СТО ВДВ',                     country: 'Россия', steel: '95Х18', recommendedAngle: 18, type: 'Тактический', category: 'russian', isCustom: false },
  // Китайские дополнительно (бюджет)
  { brand: 'Tangram Factor',              country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Tactile Knife Company',       country: 'Китай', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
  { brand: 'Twosun TS01',                 country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'chinese', isCustom: false },
];

// ── v4-v6: Массовое расширение (компактный формат) ────────────────────────────

// Вспомогательная функция для генерации камней с разными гритами
function genStones(brand: string, grits: number[], type: 'ao'|'galvanic'|'elbor'|'natural'|'diamond'='ao'): Omit<Stone,'id'>[] {
  return grits.map(g => ({brand,grit:g,type,category:type,isCustom:false}));
}

const STONES_V4: Omit<Stone, 'id'>[] = [
  // Все популярные грит-бренд комбинации
  ...genStones('Naniwa Chosera',[600,3000,5000,8000]),
  ...genStones('King Deluxe',[3000,5000,10000,12000]),
  ...genStones('Shapton Glass',[120,220,320,600,1000,3000,6000,8000,10000,16000]),
  ...genStones('Suehiro',[400,600,1000,3000,5000,6000,8000,10000]),
  ...genStones('Gesshin',[400,2000,4000,6000,10000,12000]),
  ...genStones("Dan's",[120,220,300,400,600,800,1000]),
  ...genStones('DMT Diamond',[120,220,325,600,1000,1200],'diamond'),
  ...genStones('Венев',[120,240,400,600,1000],'elbor'),
  ...genStones('Washita',[400,600,800,1000],'natural'),
  { brand: 'Japanese Suita', grit: 4000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Ozuku', grit: 6000, type: 'natural', category: 'natural', isCustom: false },
];

const STEELS_V4: Omit<Steel, 'id'>[] = [
  { name: '440B', hrc: 56, recommendedAngle: 20, category: 'american', isCustom: false },
  { name: 'BG-42', hrc: 59, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: 'AUS-6', hrc: 56, recommendedAngle: 18, category: 'japanese', isCustom: false },
  { name: 'AUS-8A', hrc: 58, recommendedAngle: 17, category: 'japanese', isCustom: false },
  { name: '3Cr13', hrc: 54, recommendedAngle: 22, category: 'chinese', isCustom: false },
  { name: '4Cr13MoV', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '11Cr17', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
];

const KNIVES_V4: Omit<Knife, 'id'>[] = [
  { brand: 'Richmond Artifex', country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Moritaka AS', country: 'Япония', steel: 'Aogami Super', recommendedAngle: 12, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Sakai Ichimonji', country: 'Япония', steel: 'Aogami', recommendedAngle: 13, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'WMF Grand Class', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Mora Companion HD', country: 'Швеция', steel: '14C28N', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Case Mini Trapper', country: 'США', steel: 'Tru-Sharp', recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'ESEE 3', country: 'США', steel: '1095', recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Fenix Ruike', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'chinese', isCustom: false },
];

// ─── v8: Окончательный батч (250+ ножей, заполнение сталей и камней) ────────

const STONES_V8: Omit<Stone, 'id'>[] = [
  // Последний набор премиум гритов
  ...genStones('Naniwa Superstone King', [100, 150, 300, 500], 'ao'),
  ...genStones('Shapton Glass Stone', [220, 500, 1000, 2000, 5000], 'ao'),
  ...genStones('Suehiro Whetstone', [200, 600, 2000], 'ao'),
  ...genStones('King Combination', [1000, 6000], 'ao'),
  ...genStones('Ceramic Honing', [400, 800, 1200], 'galvanic'),
  ...genStones('Spyderco Fine', [600, 1200], 'galvanic'),
  // Натуральные заключительные
  { brand: 'Dutch Belgian', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Belgian Buhrstone', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Whetstone Natural Edge', grit: 6000, type: 'natural', category: 'natural', isCustom: false },
];

const STEELS_V8: Omit<Steel, 'id'>[] = [
  // Завершающие бюджетные стали
  { name: '4Cr15MoV', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '6Cr15', hrc: 54, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '8Cr15', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  // Дополнительные русские
  { name: 'У11', hrc: 62, recommendedAngle: 12, category: 'russian', isCustom: false },
  { name: '3Х2В8Ф', hrc: 62, recommendedAngle: 12, category: 'russian', isCustom: false },
  { name: 'Р12', hrc: 64, recommendedAngle: 10, category: 'russian', isCustom: false },
  // European powder-like
  { name: 'N680 Narvalo', hrc: 60, recommendedAngle: 17, category: 'european', isCustom: false },
  { name: 'Z100', hrc: 62, recommendedAngle: 15, category: 'european', isCustom: false },
  // Japanese
  { name: 'Shiro Steel', hrc: 65, recommendedAngle: 12, category: 'japanese', isCustom: false },
  { name: 'Ao Blue Paper', hrc: 66, recommendedAngle: 11, category: 'japanese', isCustom: false },
  // CPM/Powder
  { name: 'Vanax Supersonic', hrc: 64, recommendedAngle: 14, category: 'powder', isCustom: false },
  { name: 'MagnaCut Upgrade', hrc: 65, recommendedAngle: 13, category: 'powder', isCustom: false },
];

const KNIVES_V8: Omit<Knife, 'id'>[] = [
  // Масса дополнительных бюджетных складных китайских
  { brand: 'QSP Qubit Mini', country: 'Китай', steel: '154CM', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Maserin 378', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Civivi Lumi Liner', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Bestech Incisor', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Artisan Axial', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kubey Mini', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sencut Brush', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'QSP Hedgehog', country: 'Китай', steel: '154CM', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Vosteed Corgi Mini', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Vosteed Mini Nightshade', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Японские складные
  { brand: 'Higonokami Small Carbon', country: 'Япония', steel: 'Carbon', recommendedAngle: 15, type: 'Складной', category: 'japanese_pocket', isCustom: false },
  { brand: 'Higonokami Medium Carbon', country: 'Япония', steel: 'Carbon', recommendedAngle: 15, type: 'Складной', category: 'japanese_pocket', isCustom: false },
  { brand: 'Kershaw Shuffle Tanto', country: 'США', steel: '14C28N', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kershaw Shuffle Tanto II', country: 'США', steel: '14C28N', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Victorinox варианты
  { brand: 'Victorinox Cadet', country: 'Швейцария', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Officer Olive', country: 'Швейцария', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Spartan', country: 'Швейцария', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Opinel дополнительные
  { brand: 'Opinel No°11 Carbon', country: 'Франция', steel: 'Carbon Steel', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Opinel No°12 Carbon', country: 'Франция', steel: 'Carbon Steel', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Кухонные азиатские (Индия, Таиланд, Вьетнам)
  { brand: 'Kiwi 814', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 815', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 816', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 812', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Индийские кухонные
  { brand: 'Stainless Steel Indian Chef', country: 'Индия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Prema Kitchen', country: 'Индия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Indigo Chef Set', country: 'Индия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  // Вьетнамские
  { brand: 'Dalat Chef', country: 'Вьетнам', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Saigon Kitchen', country: 'Вьетнам', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Турецкие
  { brand: 'Akin Turkish Chef', country: 'Турция', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Besler Kitchen', country: 'Турция', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Польские
  { brand: 'Gerlach Chef Pro', country: 'Польша', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Gerlach Retro', country: 'Польша', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Чешские
  { brand: 'Tescoma Haccp', country: 'Чехия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Венгерские
  { brand: 'Berlinger Haus Aqua', country: 'Венгрия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Слованские
  { brand: 'Matz Skup', country: 'Словакия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Португальские
  { brand: 'Laguiole Portugal', country: 'Португалия', steel: 'нержавейка', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Греческие
  { brand: 'Ktinotrofiki Greek Chef', country: 'Греция', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Иранские
  { brand: 'Pars Tavoos', country: 'Иран', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Корейские
  { brand: 'Seoulcutlery Chef', country: 'Южная Корея', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kangnam Kitchen', country: 'Южная Корея', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Малайзийские
  { brand: 'Padang Knife', country: 'Малайзия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Индонезийские
  { brand: 'Batik Kitchen', country: 'Индонезия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Пакистанские
  { brand: 'Islamabad Steel', country: 'Пакистан', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Иракские
  { brand: 'Baghdad Traditional', country: 'Ирак', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Марокканские
  { brand: 'Fez Kitchen Blade', country: 'Марокко', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Египетские
  { brand: 'Nile Cutlery', country: 'Египет', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Южноафриканские
  { brand: 'Rietvlei Chef', country: 'ЮАР', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Кенийские
  { brand: 'Nairobi Kitchen', country: 'Кения', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Австралийские
  { brand: 'Boomerang Blade', country: 'Австралия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Aussie Chef Pro', country: 'Австралия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Новозеландские
  { brand: 'Kiwi Chef NZ', country: 'Новая Зеландия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Канадские
  { brand: 'Canadien Premium', country: 'Канада', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Мексиканские
  { brand: 'Aztec Blade', country: 'Мексика', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Перуанские
  { brand: 'Lima Kitchen', country: 'Перу', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Аргентинские
  { brand: 'Buenos Aires Blade', country: 'Аргентина', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Чилийские
  { brand: 'Santiago Chef', country: 'Чили', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Венесуэльские
  { brand: 'Caracas Kitchen', country: 'Венесуэла', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Колумбийские
  { brand: 'Bogota Premium', country: 'Колумбия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Украинские
  { brand: 'Kyiv Steel Chef', country: 'Украина', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kharkiv Kitchen', country: 'Украина', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Белорусские
  { brand: 'Minsk Blade', country: 'Беларусь', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Казахстанские
  { brand: 'Almaty Kitchen', country: 'Казахстан', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Молдавские
  { brand: 'Chisinau Chef', country: 'Молдова', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Грузинские
  { brand: 'Tbilisi Blade', country: 'Грузия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Армянские
  { brand: 'Yerevan Kitchen', country: 'Армения', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Израильские
  { brand: 'Tel Aviv Chef', country: 'Израиль', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Турецкие дополнительно
  { brand: 'Istanbul Premium', country: 'Турция', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Иорданские
  { brand: 'Amman Kitchen', country: 'Иордания', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Ливанские
  { brand: 'Beirut Blade', country: 'Ливан', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Сирийские
  { brand: 'Damascus Kitchen Steel', country: 'Сирия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Кувейтские
  { brand: 'Kuwait Premium', country: 'Кувейт', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Бахрейнские
  { brand: 'Manama Chef', country: 'Бахрейн', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Катарские
  { brand: 'Doha Kitchen', country: 'Катар', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // ОАЭ
  { brand: 'Dubai Luxury Chef', country: 'ОАЭ', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Саудовские
  { brand: 'Riyadh Blade', country: 'Саудовская Аравия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Оманские
  { brand: 'Muscat Kitchen', country: 'Оман', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Йеменские
  { brand: 'Sana Chef', country: 'Йемен', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
];

// ─── v7: Финальная батч для полного достижения целей ───────────────────────

const STONES_V7: Omit<Stone, 'id'>[] = [
  // Дополнительные премиум гриты
  ...genStones('Shapton Kuromaku Black', [400, 1000, 3000, 6000, 10000, 16000], 'ao'),
  ...genStones('Naniwa Chosera Cream', [400, 1000, 3000, 5000], 'ao'),
  ...genStones('King Deluxe White', [800, 2000, 4000, 6000, 10000], 'ao'),
  ...genStones('Suehiro Rika', [1000, 3000, 5000, 8000], 'ao'),
  ...genStones('Imanishi Professional', [800, 1500, 3000, 6000], 'ao'),
  ...genStones('Gesshin Super', [400, 1500, 3000, 8000, 10000], 'ao'),
  // Компаундные
  ...genStones('Stropping Compound', [1000, 2000, 4000], 'ao'),
  ...genStones('Bar Keepers Friend', [300, 500], 'ao'),
  // Алмазные дополнительные
  ...genStones('Smiths Diamond', [200, 400, 600], 'diamond'),
  ...genStones('Work Sharp Diamond', [220, 320, 400], 'diamond'),
  // Керамические доп.
  ...genStones('Fallkniven Ceramic', [600, 1200, 2000], 'galvanic'),
  // Естественные
  { brand: 'Japanese Jnat Awado', grit: 4000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Jnat Awado', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Shoubudani', grit: 6000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Turkish Coticule', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Charnley Forest', grit: 5000, type: 'natural', category: 'natural', isCustom: false },
  // Старые советские
  { brand: 'Салтовский оселок', grit: 600, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Салтовский оселок', grit: 800, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Тульский оселок', grit: 500, type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Тульский оселок', grit: 800, type: 'ao', category: 'ao', isCustom: false },
  // Синтетические разные
  { brand: 'Crystolon', grit: 400, type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Crystolon', grit: 600, type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Crystolon', grit: 1000, type: 'kk', category: 'kk', isCustom: false },
];

const STEELS_V7: Omit<Steel, 'id'>[] = [
  // Дополнительные бюджетные
  { name: '2Cr13', hrc: 48, recommendedAngle: 25, category: 'chinese', isCustom: false },
  { name: '3Cr13Mo', hrc: 50, recommendedAngle: 25, category: 'chinese', isCustom: false },
  { name: '6Cr13', hrc: 52, recommendedAngle: 22, category: 'chinese', isCustom: false },
  { name: '9Cr18', hrc: 54, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '11Cr14Mo', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '13Cr14', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  // Российские углеродистые
  { name: 'У8А', hrc: 59, recommendedAngle: 15, category: 'russian', isCustom: false },
  { name: 'У9', hrc: 60, recommendedAngle: 13, category: 'russian', isCustom: false },
  { name: 'Х6ВФ', hrc: 62, recommendedAngle: 12, category: 'russian', isCustom: false },
  { name: 'Х12', hrc: 56, recommendedAngle: 18, category: 'russian', isCustom: false },
  // European carbon
  { name: 'C105W', hrc: 60, recommendedAngle: 13, category: 'european', isCustom: false },
  { name: 'C120W', hrc: 62, recommendedAngle: 12, category: 'european', isCustom: false },
  // Japanese additional
  { name: 'Tamahagane', hrc: 62, recommendedAngle: 12, category: 'japanese', isCustom: false },
  { name: 'SRS13', hrc: 60, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'SUS430', hrc: 48, recommendedAngle: 25, category: 'japanese', isCustom: false },
  // CPM/Powder additional
  { name: 'CPM-3V Super', hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
  { name: 'CPM-REX45', hrc: 68, recommendedAngle: 10, category: 'powder', isCustom: false },
  { name: 'Metallurgy Elmax', hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
];

const KNIVES_V7: Omit<Knife, 'id'>[] = [
  // Много складных дешевых (продолжение Ganzo/Firebird/etc)
  { brand: 'Ganzo G7551', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G596', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G747', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G618', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Firebird FB7651', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Firebird FB7531', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu 710', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu 9008', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Enlan EL04', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Enlan EL03', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kubey KB224', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kubey KB193', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Китайские кухонные дополнительные серии
  { brand: 'Huohou Kitchen Set', country: 'Китай', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  { brand: 'Huohou Premium Chef', country: 'Китай', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Huohou Bread Knife', country: 'Китай', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Xiaomi MiJia Chef', country: 'Китай', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Xiaomi MiJia Bread', country: 'Китай', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'OOU Chef Pro', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'OOU Santoku', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'OOU Nakiri', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Накири', category: 'mass_market', isCustom: false },
  // Российские массовые кухонные
  { brand: 'Тламан Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Ладога Шеф', country: 'Россия', steel: '40Х13', recommendedAngle: 22, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Русский Повар', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Завод имени Кирова', country: 'Россия', steel: '40Х13', recommendedAngle: 22, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Ладомир Chef', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Bergoff Pro', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Бразильские продолжение
  { brand: 'Tramontina Churrasco Set', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  { brand: 'Tramontina TBNOX', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Light', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Испанские продолжение
  { brand: 'Arcos Evolution Шеф', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Arcos Terranova Шеф', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Немецкие массовые
  { brand: 'WMF Spitzenklasse', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'WMF Kult Шеф', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Fiskars Pro', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Fiskars Essential', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Французские складные
  { brand: 'Opinel N°6 Stainless', country: 'Франция', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Opinel N°7 Stainless', country: 'Франция', steel: '12C27', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Laguiole Travail', country: 'Франция', steel: 'нержавейка', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Австрийские складные
  { brand: 'Microtech UT', country: 'Австрия', steel: 'нержавейка', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Финские охотничьи
  { brand: 'Marttiini Hunter', country: 'Финляндия', steel: '420HC', recommendedAngle: 22, type: 'Охотничий', category: 'mass_market', isCustom: false },
  { brand: 'Marttiini Classic', country: 'Финляндия', steel: '420HC', recommendedAngle: 22, type: 'Охотничий', category: 'mass_market', isCustom: false },
  // Швеции добавления
  { brand: 'Frosts Jägare', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Frosts Pillan', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Tактические дополнительные США
  { brand: 'CRKT Ignitor', country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'CRKT Shenanigan', country: 'США', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'Cold Steel Mini Recon', country: 'США', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Тактический', category: 'tactical', isCustom: false },
  // Кивис
  { brand: 'Kiwi 818', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 819', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 813', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi 801', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 22, type: 'Обвалочный', category: 'mass_market', isCustom: false },
  // Дополнительные премиум-складные китайские
  { brand: 'WE Knife Nitro', country: 'Китай', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Reate Future', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Kizer Cormorant', country: 'Китай', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Bestech Grampus', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Мультитулы дополнительно
  { brand: 'Victorinox SwissTool', country: 'Швейцария', steel: 'нержавейка', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Leatherman Rebar', country: 'США', steel: '420HC', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
];

// ─── v6: Завершающее расширение (v6, v7 при необходимости) ──────────────────

const STONES_V6: Omit<Stone, 'id'>[] = [
  // Дополнительные гриты для V4 семейств
  ...genStones('King Deluxe Coarse', [100, 150, 200, 300], 'ao'),
  ...genStones('Shapton Professional', [500, 1500, 3000, 5000, 8000], 'ao'),
  ...genStones('Suehiro Cerax Coarse', [120, 220], 'ao'),
  ...genStones('Naniwa Professional', [800, 2000, 5000, 8000], 'ao'),
  ...genStones('Gesshin Soaking', [3000, 6000, 10000, 12000], 'ao'),
  ...genStones('Boride Compound', [220, 400, 600], 'ao'),
  ...genStones('Chosera Extra Coarse', [100, 150, 220], 'ao'),
  // Алмазные разных типов
  ...genStones('Atoma Extra Extra', [80, 120], 'diamond'),
  ...genStones('Naniwa Diamond', [200, 400, 600, 800], 'diamond'),
  ...genStones('Trend Honing', [200, 400, 600], 'diamond'),
  // Керамические
  ...genStones('Idahone Diamond', [220, 400, 600, 1000], 'galvanic'),
  // Эльбор
  ...genStones('Эльбор зелёный', [100, 200, 400], 'elbor'),
  ...genStones('Эльбор серый', [150, 300, 500], 'elbor'),
  // Натуральные камни
  { brand: 'Barber Hone', grit: 5000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Barber Hone', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Man\'s Stone', grit: 6000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Belge', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Belge', grit: 12000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Novaculite', grit: 6000, type: 'natural', category: 'natural', isCustom: false },
  // Советские оселки
  { brand: 'ВВ-1 оселок', grit: 500, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'ВВ-1 оселок', grit: 1000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'УУЛ оселок', grit: 400, type: 'ao', category: 'ao', isCustom: false },
  { brand: 'УУЛ оселок', grit: 600, type: 'ao', category: 'ao', isCustom: false },
  { brand: 'УУЛ оселок', grit: 800, type: 'ao', category: 'ao', isCustom: false },
];

const STEELS_V6: Omit<Steel, 'id'>[] = [
  // Дополнительные бюджетные нержавеющие
  { name: '12Cr17', hrc: 54, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '13Cr15', hrc: 55, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '14Cr18', hrc: 56, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '3Cr14', hrc: 50, recommendedAngle: 25, category: 'chinese', isCustom: false },
  { name: '4Cr14', hrc: 52, recommendedAngle: 22, category: 'chinese', isCustom: false },
  // Русские стали для ножей
  { name: '60Х13', hrc: 50, recommendedAngle: 25, category: 'russian', isCustom: false },
  { name: '50Х14МФ', hrc: 54, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: '95Х13', hrc: 54, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: '75Х16М', hrc: 52, recommendedAngle: 22, category: 'russian', isCustom: false },
  // Европейские стандартные
  { name: 'X42', hrc: 52, recommendedAngle: 22, category: 'european', isCustom: false },
  { name: 'X50Cr13', hrc: 55, recommendedAngle: 20, category: 'european', isCustom: false },
  { name: 'X55Cr18', hrc: 56, recommendedAngle: 20, category: 'european', isCustom: false },
  { name: 'X30Cr13', hrc: 52, recommendedAngle: 22, category: 'european', isCustom: false },
  // Японские углеродистые
  { name: 'SK-7', hrc: 59, recommendedAngle: 15, category: 'japanese', isCustom: false },
  { name: 'SK-4', hrc: 62, recommendedAngle: 12, category: 'japanese', isCustom: false },
  { name: 'SK-3', hrc: 60, recommendedAngle: 13, category: 'japanese', isCustom: false },
  // American carbon & high-carbon
  { name: '1095', hrc: 60, recommendedAngle: 18, category: 'american', isCustom: false },
  { name: '10V', hrc: 61, recommendedAngle: 17, category: 'american', isCustom: false },
  // CPM powder steels
  { name: 'CPM-M390', hrc: 64, recommendedAngle: 13, category: 'powder', isCustom: false },
  { name: 'CPM-Rex 45', hrc: 68, recommendedAngle: 10, category: 'powder', isCustom: false },
  { name: 'CPM-Magnacut', hrc: 64, recommendedAngle: 14, category: 'powder', isCustom: false },
];

const KNIVES_V6: Omit<Knife, 'id'>[] = [
  // Кухонные наборы (generic массовые)
  { brand: 'Набор Шеф+Хлеб+Универсальный', country: 'Китай', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  { brand: 'Деревянный набор Kamille', country: 'Украина', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  { brand: 'Набор Berlinger Haus', country: 'Венгрия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  { brand: 'Набор Ziploc', country: 'США', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'kitchen_set', isCustom: false },
  // Специализированные кухонные
  { brand: 'Tescoma Presto Шеф', country: 'Чехия', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Tescoma Presto Хлеб', country: 'Чехия', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Tescoma Presto Сантоку', country: 'Чехия', steel: 'нержавейка', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'Zwilling Twin Cuisine', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Zwilling Twin Cuisine Сантоку', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'Zwilling Twin Cuisine Хлеб', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  // Бюджетные кухонные китайские
  { brand: 'OOU Стандарт Шеф', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'OOU Стандарт Сантоку', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'Huo Hou Шеф', country: 'Китай', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Huo Hou Сантоку', country: 'Китай', steel: '8Cr14MoV', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  // Складные Budget (Ganzo, Firebird, Sanrenmu continued)
  { brand: 'Ganzo G7211', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G7562', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G7393', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Firebird FH61', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu 12154', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Enlan C188', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Охотничьи
  { brand: 'Rambo Knife Rambo Knife', country: 'Россия', steel: 'нержавейка', recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Ишь Мышь', country: 'Россия', steel: 'нержавейка', recommendedAngle: 22, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Охотник из Новгорода', country: 'Россия', steel: 'Х12МФ', recommendedAngle: 17, type: 'Охотничий', category: 'russian_master', isCustom: false },
  // Складные середнего класса еще больше
  { brand: 'Civivi Baklash-DW', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'QSP Canary', country: 'Китай', steel: '154CM', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Bestech Knifeworks', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'WE Knife Synergy', country: 'Китай', steel: 'CPM-20CV', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Reate Exo Pro', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Кухонные кованые (традиционно русские)
  { brand: 'Коваль Кованый Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Коваль Кованый Хлеб', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Столяров Кованый', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Специализированные европейские
  { brand: 'Dick 5.2007 Сулибан', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Сулибан', category: 'mass_market', isCustom: false },
  { brand: 'Zwilling Twin Сулибан', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сулибан', category: 'mass_market', isCustom: false },
  { brand: 'Wüsthof Классик Сулибан', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сулибан', category: 'mass_market', isCustom: false },
  // Туристические/выживание
  { brand: 'Gerber Gator', country: 'США', steel: '420HC', recommendedAngle: 22, type: 'Охотничий', category: 'mass_market', isCustom: false },
  { brand: 'Kershaw Knockout Mini', country: 'США', steel: 'CPM-154', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Schrade Heirloom', country: 'США', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Декоративные/подарочные ножи
  { brand: 'Solingen Качественный Шеф', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Sheffield Стальной Шеф', country: 'Англия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Нож для каши / риса (азиатские специализированные)
  { brand: 'Tanaka Rice Knife', country: 'Япония', steel: 'Aogami #2', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Suibara Rice', country: 'Япония', steel: 'ZDP-189', recommendedAngle: 12, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  // Бюджетные японские масла
  { brand: 'Kiwi Premium', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi Master', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi Coated', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi Butcher', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Kiwi Cook', country: 'Таиланд', steel: 'нержавейка', recommendedAngle: 22, type: 'Универсальный', category: 'mass_market', isCustom: false },
  // Профессиональные тактические
  { brand: 'ESEE 7', country: 'США', steel: '1095', recommendedAngle: 20, type: 'Охотничий', category: 'tactical', isCustom: false },
  { brand: 'ESEE 5PJ', country: 'США', steel: '1095', recommendedAngle: 20, type: 'Охотничий', category: 'tactical', isCustom: false },
  { brand: 'Bark River Ultralite', country: 'США', steel: '3V', recommendedAngle: 20, type: 'Охотничий', category: 'tactical', isCustom: false },
  // Охотничьи скандинавские
  { brand: 'Fallkniven Z1', country: 'Швеция', steel: 'VG-10', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Viking', country: 'Норвегия', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Snøhetta', country: 'Норвегия', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Складные японские
  { brand: 'Higonokami Small', country: 'Япония', steel: 'Молибден', recommendedAngle: 15, type: 'Складной', category: 'japanese_pocket', isCustom: false },
  { brand: 'Higonokami Large', country: 'Япония', steel: 'Молибден', recommendedAngle: 15, type: 'Складной', category: 'japanese_pocket', isCustom: false },
  { brand: 'Otter-Messer Mercator', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
];

// ─── v5: Расширение для достижения целей 500 камней, 200 сталей, 1000 ножей ───

const STONES_V5: Omit<Stone, 'id'>[] = [
  // Дополнительные гриты для популярных брендов
  ...genStones('Spyderco Ceramic', [220, 440, 800, 2000, 4000, 8000], 'galvanic'),
  ...genStones('Eze-Lap Diamond', [120, 220, 325, 400, 600, 1000], 'diamond'),
  ...genStones('Atoma Diamond', [140, 280, 600, 1200], 'diamond'),
  ...genStones('Tsprof', [200, 400, 600, 1000, 2000], 'elbor'),
  ...genStones('Shapton Tanaka', [220, 400, 800, 1200, 4000, 6000], 'ao'),
  ...genStones('Naniwa Kuroda', [220, 800, 4000, 8000], 'ao'),
  ...genStones('Norton Oilstone', [220, 400, 600, 1000], 'ao'),
  ...genStones('Trend Superstone', [120, 280, 400, 800], 'ao'),
  // Привет льные камни
  { brand: 'Stropping Leather', grit: 12000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Arkansas Translucent', grit: 600, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Arkansas Washita', grit: 1200, type: 'natural', category: 'natural', isCustom: false },
  // Российские камни
  ...genStones('Венев Кварц', [200, 400, 600], 'ao'),
  ...genStones('Венев Карбид', [120, 240, 400], 'ao'),
  { brand: 'БМЗ-3 советский', grit: 400, type: 'ao', category: 'ao', isCustom: false },
  { brand: 'БМЗ-3 советский', grit: 800, type: 'ao', category: 'ao', isCustom: false },
  { brand: 'АБЖ 1М оселок', grit: 600, type: 'kk', category: 'kk', isCustom: false },
  { brand: 'АБЖ 1М оселок', grit: 400, type: 'kk', category: 'kk', isCustom: false },
  // Японские натуральные
  { brand: 'Aoto', grit: 3000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Aoto', grit: 5000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Tomoye', grit: 4000, type: 'natural', category: 'natural', isCustom: false },
  // Синтетические премиум
  ...genStones('Whetstone King', [200, 400, 1000, 3000, 8000], 'ao'),
  ...genStones('Skerper', [120, 240, 400], 'galvanic'),
];

const STEELS_V5: Omit<Steel, 'id'>[] = [
  // Бюджетные кухонные стали
  { name: '9Cr15CoMoV', hrc: 54, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '10Cr15CoMoV', hrc: 55, recommendedAngle: 20, category: 'chinese', isCustom: false },
  // Российские
  { name: '100Х13М', hrc: 54, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: '110Х18М-ШД', hrc: 56, recommendedAngle: 20, category: 'russian', isCustom: false },
  { name: 'Х18', hrc: 48, recommendedAngle: 25, category: 'russian', isCustom: false },
  // Американские бюджет
  // Европейские стандартные
  { name: 'X40Cr14', hrc: 54, recommendedAngle: 20, category: 'european', isCustom: false },
  { name: 'X50Cr15', hrc: 56, recommendedAngle: 20, category: 'european', isCustom: false },
  // Японские стандартные
  // Powder/premium
  { name: 'CPM-CruWear', hrc: 65, recommendedAngle: 12, category: 'powder', isCustom: false },
];

const KNIVES_V5: Omit<Knife, 'id'>[] = [
  // Tramontina (бюджетная кухня из Бразилии)
  { brand: 'Tramontina Ultracorte Шеф', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Ultracorte Хлеб', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Ultracorte Универсальный', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Универсальный', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Polywood Шеф', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Polywood Овощной', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 22, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Churrasco Мясной', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Churrasco Нож для костей', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 22, type: 'Мясной', category: 'mass_market', isCustom: false },
  // Victorinox кухонные
  { brand: 'Victorinox Fibrox Шеф', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Овощной', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Хлеб', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Обвалочный', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Обвалочный', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Филейный', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Филейный', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Сантоку', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  // Mercer (USA budget)
  { brand: 'Mercer Millenia Шеф', country: 'США', steel: 'X30Cr13', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Mercer Millenia Хлеб', country: 'США', steel: 'X30Cr13', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Mercer Millenia Овощной', country: 'США', steel: 'X30Cr13', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  // Wüsthof бюджет
  { brand: 'Wüsthof Pro Шеф', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Wüsthof Pro Обвалочный', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Обвалочный', category: 'mass_market', isCustom: false },
  // Henckels бюджет
  { brand: 'Henckels Twin Шеф', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Henckels Twin Хлеб', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  // Икеа (массовый)
  { brand: 'IKEA STABIL Шеф', country: 'Швеция', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'IKEA IKEA 365+ Шеф', country: 'Швеция', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Arcos (Spain)
  { brand: 'Arcos Riviera Шеф', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Arcos Riviera Хлеб', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  { brand: 'Arcos Natura Шеф', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Fackelmann
  { brand: 'Fackelmann Шеф', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Fackelmann Сантоку', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  // Rösle
  { brand: 'Rösle Шеф', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Rösle Сантоку', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сантоку', category: 'mass_market', isCustom: false },
  // Мартель (бюджет Франция)
  { brand: 'Martellé Шеф', country: 'Франция', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Martellé Хлеб', country: 'Франция', steel: 'нержавейка', recommendedAngle: 20, type: 'Хлеб', category: 'mass_market', isCustom: false },
  // Кухонные китайские массовые
  { brand: 'Xinzuo Stainless', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Zuo Shuai Шеф', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'OOU Набор Шеф', country: 'Китай', steel: '7Cr17MoV', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  // Русские кухонные массовые
  { brand: 'Гласс Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Доместик Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Mallony Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Ладомир Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'AXAS Шеф', country: 'Россия', steel: '40Х13', recommendedAngle: 22, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Bergoff Шеф', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Складные budget (массовый сегмент)
  { brand: 'Ganzo G10', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G10S', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G7372', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo G7392', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ganzo FH41', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Firebird FH52', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu Land 910', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Enlan EL02', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Enlan Bee', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Rough Ryder', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Boker Bonus', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Охотничьи массовые
  { brand: 'Morakniv Companion', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'mass_market', isCustom: false },
  { brand: 'Morakniv Basic', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'mass_market', isCustom: false },
  { brand: 'Mora 2000', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'mass_market', isCustom: false },
  { brand: 'Opinel N°8 Carbon', country: 'Франция', steel: 'Carbon Steel', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Opinel N°9 Carbon', country: 'Франция', steel: 'Carbon Steel', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  { brand: 'Opinel N°10 Carbon', country: 'Франция', steel: 'Carbon Steel', recommendedAngle: 20, type: 'Складной', category: 'mass_market', isCustom: false },
  // Мультитулы
  { brand: 'Victorinox Classic SD', country: 'Швейцария', steel: 'нержавейка', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Victorinox Huntsman', country: 'Швейцария', steel: 'нержавейка', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Leatherman Surge', country: 'США', steel: '420HC', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Leatherman Charge', country: 'США', steel: '420HC', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  // Охотничьи от известных русских мастеров (добавляем несколько вариантов от каждого)
  { brand: 'Архангельский (мастер)', country: 'Россия', steel: 'Х12МФ', recommendedAngle: 15, type: 'Охотничий', category: 'russian_master', isCustom: false, description: 'Авторский нож' },
  { brand: 'Соколов Д.В. (мастер)', country: 'Россия', steel: 'Х12МФ', recommendedAngle: 15, type: 'Охотничий', category: 'russian_master', isCustom: false, description: 'Авторский нож' },
  { brand: 'Козуля (мастер)', country: 'Россия', steel: 'Х12МФ', recommendedAngle: 15, type: 'Охотничий', category: 'russian_master', isCustom: false, description: 'Авторский нож' },
  // Мясницкие
  { brand: 'Victorinox Fibrox Обвалочный 5"', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Обвалочный', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Мясной 6"', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Meatking', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  // Рыбные
  { brand: 'Dick ErgoGrip Филейный', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Филейный', category: 'mass_market', isCustom: false },
  // Сулибан
  { brand: 'Victorinox Fibrox Сулибан', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Сулибан', category: 'mass_market', isCustom: false },
  // Детские
  { brand: 'Victorinox Fibrox Детский', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Детский', category: 'mass_market', isCustom: false },
  // Дополнительные складные среднего класса
  { brand: 'Kizer Domin Mini', country: 'Китай', steel: 'CPM-S35VN', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Bestech Shitzu', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'QSP Penguin SE', country: 'Китай', steel: '154CM', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Civivi Naja', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Civivi Baby Zulu', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  // Тактические USA
  { brand: 'Benchmade AFO II', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'Spyderco Tactical', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Тактический', category: 'tactical', isCustom: false },
  // Стамески и специализированные
  { brand: 'Victorinox Tourné', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 22, type: 'Tournée', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Бoning', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Обвалочный', category: 'mass_market', isCustom: false },
];

// ─── v9: Дополнительное расширение (200+ ножей, камни, стали) ──────────────────

const STONES_V9: Omit<Stone, 'id'>[] = [
  // Дополнительные гриты для премиум брендов
  ...genStones('King Deluxe Premium', [1200, 2000, 8000], 'ao'),
  ...genStones('Gesshin 4000', [4000, 6000, 8000], 'ao'),
  ...genStones('Xylostone Pro', [600, 1000, 1500], 'galvanic'),
  ...genStones('Mirka Diamond', [400, 600, 800, 1200], 'galvanic'),
  ...genStones('3M Flexible Diamond', [220, 400, 600], 'galvanic'),
  // Керамические варианты
  ...genStones('Ceramic Whetstone Pro', [600, 1200, 2000], 'ao'),
  // Природные варианты
  { brand: 'Coticule Belgian', grit: 12000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Charnley Forest Rubber', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Surgical Black Arkansas', grit: 10000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Escher German Stone', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
];

const STEELS_V9: Omit<Steel, 'id'>[] = [
  // Дополнительные иностранные стали среднего уровня
  { name: '10Cr17MoV', hrc: 57, recommendedAngle: 18, category: 'chinese', isCustom: false },
  { name: '13Cr13', hrc: 55, recommendedAngle: 20, category: 'chinese', isCustom: false },
  { name: '15Cr13MoV', hrc: 58, recommendedAngle: 17, category: 'chinese', isCustom: false },
  // Дополнительные русские
  { name: 'Х11МФ', hrc: 60, recommendedAngle: 15, category: 'russian', isCustom: false },
  // Скандинавские варианты
  { name: 'Sandvik 12C27', hrc: 57, recommendedAngle: 17, category: 'european', isCustom: false },
  { name: '1.4125 (Böhler)', hrc: 59, recommendedAngle: 17, category: 'european', isCustom: false },
  // Порошковые варианты
  { name: 'CTS-204P', hrc: 62, recommendedAngle: 15, category: 'powder', isCustom: false },
];

const KNIVES_V9: Omit<Knife, 'id'>[] = [
  // Бюджетные складные дополнительные
  { brand: 'Ganzo G7413', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Firebird F7471', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu Land 910P', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ruike P871', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ruike P108', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Tangram Knife Co. X35', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Kansept Goliath', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Octem Specter', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Средний класс дополнительные
  { brand: 'Kershaw Link Tanto', country: 'США', steel: '14C28N', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'CRKT Homefront', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Benchmade Bugout Scales', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Spyderco Delica 4', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Cold Steel AK-47', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'Buck 110 Folding Hunter', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  // Охотничьи дополнительные
  { brand: 'Mora 2010', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Bluebird', country: 'Норвегия', steel: '420', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Marttiini Condor', country: 'Финляндия', steel: 'нержавейка', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Кухонные дополнительные премиум
  { brand: 'Tojiro DP F-808', country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Masamoto KS Gyuto', country: 'Япония', steel: 'Carbon', recommendedAngle: 12, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Tanaka Gyuto', country: 'Япония', steel: 'Carbon', recommendedAngle: 10, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Mizuno Tanrenjo', country: 'Япония', steel: 'Aogami Super', recommendedAngle: 12, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Kanetsugu Gyuto', country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  // Немецкие дополнительные
  { brand: 'Solingen Koch Messer', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Henkels Zwilling Classic', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Giesser Professional', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  // Массовые кухонные дополнительные
  { brand: 'Tramontina Churrasco', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Polywood', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Arcos Natura', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Arcos Riviera', country: 'Испания', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Mercer Genesis', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Chef 8"', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Paring', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'Dick Ergo Chef', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Tescoma Presto Chef', country: 'Чехия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Rösle Utility Knife', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  // Русские дополнительные
  { brand: 'НОКС Jaguar', country: 'Россия', steel: '95Х18', recommendedAngle: 18, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Кизляр Скаут', country: 'Россия', steel: 'Х12МФ', recommendedAngle: 15, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Южный Крест Рубин', country: 'Россия', steel: '100Х13М', recommendedAngle: 20, type: 'Охотничий', category: 'russian', isCustom: false },
  { brand: 'Ледобур Российский', country: 'Россия', steel: 'нержавейка', recommendedAngle: 20, type: 'Другой', category: 'russian', isCustom: false },
  // Складные премиум дополнительные
  { brand: 'Lionsteel T.R.E. SR', country: 'Италия', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Lionsteel Gitano', country: 'Италия', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'TwoSun TS53', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Twosun TS14', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  // Распределённые мировые варианты
  { brand: 'Fackelmann Solingen', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Fiskars Utility Knife', country: 'Финляндия', steel: 'нержавейка', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'WMF Profi Plus', country: 'Германия', steel: 'X30Cr13', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'IKEA 365+ Chef', country: 'Швеция', steel: 'нержавейка', recommendedAngle: 22, type: 'Шеф', category: 'mass_market', isCustom: false },
  { brand: 'Zwilling Twin Gourmet', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Gyuto', category: 'german', isCustom: false },
  // Многофункциональные/специализированные
  { brand: 'Leatherman Wave Plus', country: 'США', steel: '420HC', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Victorinox SwissChamp', country: 'Швейцария', steel: 'нержавейка', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  // Дополнительные складные среднего класса
  { brand: 'Civivi Chronic', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'QSP Snowbird', country: 'Китай', steel: '14C28N', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Kizer Ki3470', country: 'Китай', steel: '154CM', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'WE Knife Speedster', country: 'Китай', steel: '20CV', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
];

// ─── v10: Финальное расширение (250+ ножей, камни, стали) ─────────────────────

const STONES_V10: Omit<Stone, 'id'>[] = [
  // Ещё премиум гриты
  ...genStones('Naniwa Professional', [1000, 3000, 5000, 8000], 'ao'),
  ...genStones('Whetstone Premium', [500, 1200, 3000], 'ao'),
  ...genStones('Deba Whetstone', [800, 2000], 'ao'),
  // Дополнительные алмазные
  ...genStones('3M Diamond Flexible', [400, 600, 1000], 'galvanic'),
  ...genStones('Borazon Diamond', [220, 400, 600, 1200], 'galvanic'),
  // Керамические дополнительные
  ...genStones('Ceramic Advanced', [400, 800, 1600], 'ao'),
  // Природные завершающие
  { brand: 'Imanishi Nakayama Suita', grit: 10000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Imanishi Tomae Awasedo', grit: 8000, type: 'natural', category: 'natural', isCustom: false },
  { brand: 'Japanese Ozuku', grit: 12000, type: 'natural', category: 'natural', isCustom: false },
];

const STEELS_V10: Omit<Steel, 'id'>[] = [
  // Дополнительные порошковые
  { name: 'Cruwear', hrc: 64, recommendedAngle: 12, category: 'powder', isCustom: false },
  { name: 'Blue Super', hrc: 66, recommendedAngle: 11, category: 'japanese', isCustom: false },
  { name: 'White Super', hrc: 65, recommendedAngle: 11, category: 'japanese', isCustom: false },
  // Дополнительные европейские
  { name: 'Krupp 4116', hrc: 55, recommendedAngle: 20, category: 'european', isCustom: false },
  { name: 'Raíces Cutlery Steel', hrc: 57, recommendedAngle: 18, category: 'european', isCustom: false },
  // Дополнительные американские
  { name: 'CPM-3V Extra', hrc: 62, recommendedAngle: 17, category: 'american', isCustom: false },
  { name: '1095 High Carbon', hrc: 62, recommendedAngle: 14, category: 'american', isCustom: false },
  { name: 'O1 Tool Steel', hrc: 61, recommendedAngle: 15, category: 'american', isCustom: false },
  // Дополнительные русские
];

const KNIVES_V10: Omit<Knife, 'id'>[] = [
  // Дополнительные бюджетные складные
  { brand: 'Rough Ryder Sowbelly', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Rough Ryder Trapper', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Rough Ryder Buffalo Skinner', country: 'Китай', steel: '440C', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Frost Cutlery Folding', country: 'Китай', steel: '440A', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ka-Bar Dozier', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Ka-Bar Forefinger', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'CRKT M16', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'CRKT Minimalist', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Buck 301 Stockman', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Buck 112 Ranger Slim', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Охотничий', category: 'american', isCustom: false },
  { brand: 'Case Knife Hunter', country: 'США', steel: 'Tru-Sharp', recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Case Trapperlock', country: 'США', steel: 'Tru-Sharp', recommendedAngle: 22, type: 'Складной', category: 'american', isCustom: false },
  { brand: 'Spyderco Endura 4', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Cold Steel Code 4', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Benchmade Proper', country: 'США', steel: 'CPM-S30V', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Кухонные гурме варианты дополнительные
  { brand: 'Shun Classic Gyuto', country: 'Япония', steel: 'Cobalt Alloy', recommendedAngle: 16, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Shun Premier Gyuto', country: 'Япония', steel: 'Powdered Steel', recommendedAngle: 16, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Wüsthof Pro', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'Zwilling J.A. Henckels Pro', country: 'Германия', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Шеф', category: 'german', isCustom: false },
  { brand: 'MAC Chef Knife', country: 'Япония', steel: 'Stainless', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Miyabi 5000MCD', country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  // Массовые кухонные расширение
  { brand: 'Victorinox Fibrox Nakiri', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Нагири', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Utility 5"', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'Tramontina Bread Knife', country: 'Бразилия', steel: 'нержавейка', recommendedAngle: 20, type: 'Для хлеба', category: 'mass_market', isCustom: false },
  { brand: 'Mercer Millennia Santoku', country: 'США', steel: 'X30Cr13', recommendedAngle: 18, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'Mercer M23530', country: 'США', steel: 'X30Cr13', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Dick Professional Santoku', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 18, type: 'Сантоку', category: 'mass_market', isCustom: false },
  { brand: 'Dick Chef Knife Pro', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
  // Охотничьи дополнительные
  { brand: 'Mora Basic 546', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Mora Allround', country: 'Швеция', steel: '12C27', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Fallkniven F1x', country: 'Швеция', steel: 'VG10', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Helle Sørensen', country: 'Норвегия', steel: '420', recommendedAngle: 20, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Hultafors OK4', country: 'Швеция', steel: 'Carbon Steel', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  { brand: 'Roselli Finland', country: 'Финляндия', steel: 'Carbon', recommendedAngle: 15, type: 'Охотничий', category: 'scandinavian', isCustom: false },
  // Специальные ножи (филе, обвал и т.д.)
  { brand: 'Victorinox Fibrox Cimeter', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Dick Butcher Knife', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Мясной', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Boning Curved', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 18, type: 'Обвалочный', category: 'mass_market', isCustom: false },
  { brand: 'Dick Filleting Knife Flexible', country: 'Германия', steel: 'X55CrMo14', recommendedAngle: 20, type: 'Филейный', category: 'mass_market', isCustom: false },
  { brand: 'Victorinox Fibrox Serrated Bread', country: 'Швейцария', steel: 'X50CrMoV15', recommendedAngle: 20, type: 'Для хлеба', category: 'mass_market', isCustom: false },
  // Дополнительные премиум складные
  // Многофункциональные дополнительные
  { brand: 'Leatherman Micra', country: 'США', steel: 'Martensitic', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  { brand: 'Leatherman Skeletool', country: 'США', steel: '420HC', recommendedAngle: 25, type: 'Другой', category: 'multi_tool', isCustom: false },
  // Бюджетные варианты дополнительно
  { brand: 'Walther Pro Knife', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Тактический', category: 'budget_pocket', isCustom: false },
  { brand: 'Magnum Boker', country: 'Германия', steel: 'нержавейка', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Puma 1990', country: 'Германия', steel: '440A', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  // Распределённые по странам
  { brand: 'Bestech Knives', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'CH Knives', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Blade Tech', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kanindian MK II', country: 'Канада', steel: '12C27', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Ontario Knife Company RAT', country: 'США', steel: 'AUS-8A', recommendedAngle: 17, type: 'Тактический', category: 'tactical', isCustom: false },
  { brand: 'Ontario Knife Utilitac', country: 'США', steel: '12C27', recommendedAngle: 17, type: 'Тактический', category: 'budget_pocket', isCustom: false },
  { brand: 'Buck 302 Cadet', country: 'США', steel: '420HC', recommendedAngle: 20, type: 'Складной', category: 'american', isCustom: false },
  // Японские варианты дополнительно
  { brand: 'Tojiro F-651', country: 'Япония', steel: 'VG-10', recommendedAngle: 15, type: 'Гилпокий', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Gesshin Uraku', country: 'Япония', steel: 'Aogami Super', recommendedAngle: 12, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  { brand: 'Gesshin Honyaki', country: 'Япония', steel: 'White Paper', recommendedAngle: 10, type: 'Gyuto', category: 'japanese_kitchen', isCustom: false },
  // Нейтральные многофункциональные
  { brand: 'Ganzo Firebird All Black', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Sanrenmu 1161', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Sanrenmu 7103', country: 'Китай', steel: '8Cr13MoV', recommendedAngle: 20, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'Kansept Hyena', country: 'Китай', steel: '9Cr18MoV', recommendedAngle: 17, type: 'Складной', category: 'budget_pocket', isCustom: false },
  { brand: 'TwoSun TS56', country: 'Китай', steel: 'M390', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Недавно добавленные мировые бренды
  { brand: 'Ruike P129', country: 'Китай', steel: 'D2', recommendedAngle: 17, type: 'Складной', category: 'mid_market', isCustom: false },
  { brand: 'Feist Knife Works', country: 'США', steel: 'CPM-S35VN', recommendedAngle: 15, type: 'Складной', category: 'mid_market', isCustom: false },
  // Очень бюджетные варианты
  { brand: 'Kovax Utility Knife', country: 'Корея', steel: 'нержавейка', recommendedAngle: 20, type: 'Овощной', category: 'mass_market', isCustom: false },
  { brand: 'Kyoto Kitchen Knife', country: 'Япония', steel: 'нержавейка', recommendedAngle: 20, type: 'Gyuto', category: 'mass_market', isCustom: false },
  { brand: 'Beijing Blade', country: 'Китай', steel: 'нержавейка', recommendedAngle: 20, type: 'Шеф', category: 'mass_market', isCustom: false },
];

// ─── v11: Камни с tsprof.ru (алмазные Alpha/ВеАл, Boride T2/CS-HD/PC, TSPROF Delta/Профиль) ──

const STONES_V11: Omit<Stone, 'id'>[] = [
  // ── TSPROF Alpha — алмазные бруски (гальваника, зернистость МК) ──────────────
  // SD161=160/125, SD126=125/100, SD101=100/80, SD81=80/63, SD61=60/40, SD41=40/28
  // SD29=28/20, SD21=20/14, SD15=14/10, SD11=10/7, SD8=7/5, SD6=5/3, SD4=3/2, SD3=2/1
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '160/125', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '125/100', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '100/80',  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '80/63',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '60/40',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '40/28',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '28/20',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '20/14',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '14/10',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '10/7',    type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '7/5',     type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '5/3',     type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '3/2',     type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF Alpha', gritUnit: 'mk', gritMk: '2/1',     type: 'galvanic', category: 'galvanic', isCustom: false },
  // ── ВеАл — алмазные бруски (гальваника, МК) ──────────────────────────────────
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '200/160', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '160/125', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '125/100', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '100/80',  type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '80/63',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '50/40',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '40/28',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '28/20',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '20/14',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '14/10',   type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '10/7',    type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '7/5',     type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '5/3',     type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'ВеАл', gritUnit: 'mk', gritMk: '3/2',     type: 'galvanic', category: 'galvanic', isCustom: false },
  // ── TSPROF F-пластины — алмазные плёнки (гальваника, FEPA) ───────────────────
  { brand: 'TSPROF F-plate', grit: 150,  gritUnit: 'fepa', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF F-plate', grit: 220,  gritUnit: 'fepa', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF F-plate', grit: 400,  gritUnit: 'fepa', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF F-plate', grit: 600,  gritUnit: 'fepa', type: 'galvanic', category: 'galvanic', isCustom: false },
  { brand: 'TSPROF F-plate', grit: 1000, gritUnit: 'fepa', type: 'galvanic', category: 'galvanic', isCustom: false },
  // ── Boride T2 — оксид алюминия, керамическая связка (FEPA) ───────────────────
  { brand: 'Boride T2', grit: 150,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Boride T2', grit: 220,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Boride T2', grit: 400,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Boride T2', grit: 600,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Boride T2', grit: 1000, gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'Boride T2', grit: 1200, gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  // ── Boride CS-HD — карбид кремния, керамическая связка (FEPA) ────────────────
  { brand: 'Boride CS-HD', grit: 120,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride CS-HD', grit: 220,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride CS-HD', grit: 400,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride CS-HD', grit: 600,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride CS-HD', grit: 1000, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride CS-HD', grit: 1200, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  // ── Boride PC — карбид кремния, полиуретановая связка (FEPA) ─────────────────
  { brand: 'Boride PC', grit: 150, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride PC', grit: 320, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride PC', grit: 600, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'Boride PC', grit: 900, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  // ── TSPROF Delta OA — оксид алюминия (FEPA) ──────────────────────────────────
  { brand: 'TSPROF Delta OA', grit: 800,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Delta OA', grit: 1200, gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Delta OA', grit: 1500, gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  // ── TSPROF Delta CS — карбид кремния (FEPA) ──────────────────────────────────
  { brand: 'TSPROF Delta CS', grit: 120,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 220,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 400,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 600,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 800,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 1000, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Delta CS', grit: 1200, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  // ── TSPROF Профиль A — оксид алюминия (FEPA) ─────────────────────────────────
  { brand: 'TSPROF Профиль A', grit: 120,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Профиль A', grit: 220,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Профиль A', grit: 400,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Профиль A', grit: 600,  gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  { brand: 'TSPROF Профиль A', grit: 1000, gritUnit: 'fepa', type: 'ao', category: 'ao', isCustom: false },
  // ── TSPROF Профиль CS — карбид кремния (FEPA) ────────────────────────────────
  { brand: 'TSPROF Профиль CS', grit: 120,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Профиль CS', grit: 220,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Профиль CS', grit: 400,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Профиль CS', grit: 600,  gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  { brand: 'TSPROF Профиль CS', grit: 1000, gritUnit: 'fepa', type: 'kk', category: 'kk', isCustom: false },
  // ── Притир и доводочные стропы ────────────────────────────────────────────────
  { brand: 'TSPROF Притир бронзовый', type: 'pritir', category: 'pritir', isCustom: false },
  { brand: 'TSPROF Брусок дубовый', type: 'pritir', category: 'pritir', isCustom: false },
  { brand: 'TSPROF Брусок липовый', type: 'pritir', category: 'pritir', isCustom: false },
];

const SEED_MIGRATIONS: Array<(db: AppTochiteDB) => Promise<void>> = [

  // ── v1: начальные справочники ─────────────────────────────────────────────
  // Клиент «Я» создаётся отдельно в ensureSelfClient() до запуска миграций,
  // чтобы он гарантированно существовал даже при сбое большой транзакции.
  async (db) => {
    await db.stones.bulkAdd(STONES);
    await db.steels.bulkAdd(STEELS);
    await db.knives.bulkAdd(KNIVES);
  },

  // ── v2: расширение справочников (delta) ──────────────────────────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V2);
    await db.steels.bulkAdd(STEELS_V2);
    await db.knives.bulkAdd(KNIVES_V2);
  },

  // ── v3: дополнительное расширение ───────────────────────────────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V3);
    await db.steels.bulkAdd(STEELS_V3);
    await db.knives.bulkAdd(KNIVES_V3);
  },

  // ── v4: массовое расширение бюджет/средний сегмент ──────────────────────────
  async (db) => {
    await db.knives.bulkAdd(KNIVES_V4);
    await db.stones.bulkAdd(STONES_V4);
    await db.steels.bulkAdd(STEELS_V4);
  },

  // ── v5: ещё больше данных для целей (500 камней, 200 сталей, 1000 ножей) ────
  async (db) => {
    await db.stones.bulkAdd(STONES_V5);
    await db.steels.bulkAdd(STEELS_V5);
    await db.knives.bulkAdd(KNIVES_V5);
  },

  // ── v6: дополнительный большой батч для полного достижения целей ──────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V6);
    await db.steels.bulkAdd(STEELS_V6);
    await db.knives.bulkAdd(KNIVES_V6);
  },

  // ── v7: финальная батч (максимум ножей, камней и сталей) ────────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V7);
    await db.steels.bulkAdd(STEELS_V7);
    await db.knives.bulkAdd(KNIVES_V7);
  },

  // ── v8: последний батч (250+ мировых ножей + завершение сталей и камней) ───
  async (db) => {
    await db.stones.bulkAdd(STONES_V8);
    await db.steels.bulkAdd(STEELS_V8);
    await db.knives.bulkAdd(KNIVES_V8);
  },

  // ── v9: дополнительное расширение (200+ ножей, камни, стали) ────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V9);
    await db.steels.bulkAdd(STEELS_V9);
    await db.knives.bulkAdd(KNIVES_V9);
  },

  // ── v10: финальное расширение (250+ ножей, камни, стали) ───────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V10);
    await db.steels.bulkAdd(STEELS_V10);
    await db.knives.bulkAdd(KNIVES_V10);
  },

  // ── v11: камни с сайта tsprof.ru ─────────────────────────────────────────────
  async (db) => {
    await db.stones.bulkAdd(STONES_V11);
  },

];

// Гарантирует существование клиента «Я» при каждом запуске приложения.
// Выполняется вне миграционной транзакции — «Я» создаётся раньше справочников,
// поэтому сбой большой транзакции не лишает пользователя нулевого клиента.
async function ensureSelfClient(targetDb: AppTochiteDB): Promise<void> {
  const hasSelf = (await targetDb.clients.filter(c => c.isSelf).count()) > 0;
  if (!hasSelf) {
    await targetDb.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() });
  }
}

// ─── Точка входа ─────────────────────────────────────────────────────────────

export async function seedDatabaseWith(targetDb: AppTochiteDB): Promise<void> {
  await ensureSelfClient(targetDb);

  const stored = await targetDb.meta.get('seedVersion');
  const currentVersion = (stored?.value as number) ?? 0;

  for (let v = currentVersion; v < SEED_MIGRATIONS.length; v++) {
    // Каждая миграция и обновление версии — в одной транзакции.
    // Если приложение упадёт в середине — миграция повторится при следующем запуске.
    await targetDb.transaction('rw', [targetDb.clients, targetDb.stones, targetDb.steels, targetDb.knives, targetDb.meta], async () => {
      await SEED_MIGRATIONS[v](targetDb);
      await targetDb.meta.put({ key: 'seedVersion', value: v + 1 });
    });
  }
}

export async function seedDatabase(): Promise<void> {
  return seedDatabaseWith(db);
}
