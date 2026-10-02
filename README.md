# Ant Colony – Web

เกมวางแผนอาณาจักรมดบนเว็บ แรงบันดาลใจจาก Ant Colony: Wild Forest
Stack: **TypeScript + PixiJS 8 + Vite + Vitest**

## คำสั่ง
```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + build ไป dist/ (โฮสต์เป็นไฟล์สถิตได้)
npm test           # unit test ของ sim
npm run lint
```

## สถาปัตยกรรม
```
src/
  sim/      logic เกมล้วน ไม่แตะ DOM/Pixi — deterministic (seeded RNG, fixed 30Hz tick)
    types.ts      World = plain data (serialize ได้)
    commands.ts   ทุก action ของผู้เล่นเป็น Command → ตรวจสอบ/replay/sync ได้
    systems/      economy, gather, combat, waves (เพิ่มระบบใหม่ = เพิ่มไฟล์ + เรียกใน step.ts)
    spatial.ts    grid hash สำหรับ query ศัตรู/มดใกล้เคียง
    events.ts     sim → host (toast, sfx, float text)
  data/     balance.ts + defs.ts: มด/ศัตรู/อัปเกรด/ทรัพยากรแบบ data-driven
  render/   PixiJS: renderer, camera, textures (procedural → สลับเป็น atlas จริงได้ที่ textures.ts)
  input/    pointer/keyboard → camera + onTap
  ui/       HUD/overlay (DOM) + i18n (th)
  audio/    AudioManager (WebAudio ชั่วคราว → สลับเป็น sample ได้)
  save/     serialize + migrations + SaveStorage (localStorage → cloud ภายหลัง)
  game/     Game: loop, pause/speed, autosave, event fan-out
tests/      vitest
```
กฎสำคัญ: `sim/` ห้าม import จาก `render/ ui/ audio/ game/` และห้ามใช้ `Math.random()` (ใช้ `core/rng`)

## Branch & Deploy
- `main` = production (Vercel deploy อัตโนมัติ) · `dev` = พัฒนา/preview
- ทำงานบน `dev` → ผ่าน CI (typecheck, lint, test, build) → merge เข้า `main` เพื่อปล่อย
- Vercel: Framework = Vite, build `npm run build`, output `dist`

## Roadmap
1. ✅ รากฐาน TS + Pixi + save + test (เฟสนี้)
2. ✅ ห้องในรัง (ฟาร์มเชื้อรา, ห้องฟักไข่, คลัง, ค่ายทหาร)
3. ต้นไม้เทคโนโลยี + มดหลายชนิด
4. Pheromone / pathfinding
5. แผนที่ + ภารกิจ + ภาคผจญภัย
6. Sprite/เสียงจริง (asset loader)
7. Backend: บัญชี + leaderboard + cloud save
