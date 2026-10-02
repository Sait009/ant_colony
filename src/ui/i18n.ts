const th: Record<string, string> = {
  'ant.worker.name': 'ผู้งาน',
  'ant.worker.desc': 'เก็บทรัพยากร',
  'ant.soldier.name': 'ทหาร',
  'ant.soldier.desc': 'ป้องกันรัง',
  'upgrade.nest.name': 'ขยายรัง',
  'upgrade.carry.name': 'ขนของ',
  'upgrade.weapon.name': 'อาวุธ',
  'action.repair.name': 'ซ่อมรัง',
  'action.repair.desc': '+{amount} HP',
  'ui.full': 'เต็ม',
  'ui.nest': 'รัง',
  'toast.egg': '🥚 ราชินีออกไข่ ได้ผู้งานใหม่',
  'toast.nestUp': '🏰 รังเป็น Lv {level} · รองรับ {cap} ตัว',
  'toast.pinOn': '📌 ผู้งานจะเก็บจุดนี้ก่อน',
  'toast.pinOff': 'ยกเลิกการปักหมุด',
  'toast.wave': '🌊 คลื่นที่ {n}/{max} กำลังมาจากทิศ{dir}!',
  'toast.saved': '💾 บันทึกอัตโนมัติ',
  'dir.east': 'ตะวันออก',
  'dir.south': 'ใต้',
  'dir.west': 'ตะวันตก',
  'dir.north': 'เหนือ',
  'ov.title': '🐜 Ant Colony',
  'ov.desc': 'สร้างอาณาจักรมด เก็บอาหาร ขยายรัง และป้องกันป่าจากศัตรู',
  'ov.help1': '<b>คลิกพื้นที่ว่าง</b> = ตั้งจุดรวมพลของทหาร',
  'ov.help2': '<b>คลิกอาหาร/กิ่งไม้</b> = ให้ผู้งานไปเก็บก่อน',
  'ov.help3': '<b>ลาก</b> = เลื่อนกล้อง · <b>ล้อเมาส์/ถ่างนิ้ว</b> = ซูม · <b>WASD</b> = เลื่อน',
  'ov.help4': 'ป้องกันรังให้รอด <b>{max}</b> คลื่น',
  'ov.start': 'เริ่มเกม',
  'ov.newGame': 'เริ่มใหม่',
  'ov.continue': 'เล่นต่อ',
  'ov.again': 'เล่นอีกครั้ง',
  'ov.win': '🏆 ชนะแล้ว!',
  'ov.winDesc': 'อาณาจักรของคุณรอดครบ {max} คลื่น',
  'ov.lose': '💀 รังแตก',
  'ov.loseDesc': 'รังถูกทำลายที่คลื่นที่ {wave} · รอดมา {secs} วินาที',
};

/** Translate a key, substituting `{param}` placeholders. Falls back to the key itself. */
export function t(key: string, params?: Record<string, string | number>): string {
  const s = th[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')) : s;
}
