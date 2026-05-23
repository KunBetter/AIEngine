export const SYMBIOTE_SCENE_CONTEXTS: Record<string, string> = {
  landing:     "着陆点：返回舱坠毁处，紧急信标闪烁。远处有奇怪蓝光。可前往：洞穴入口、外星森林",
  cave:        "洞穴入口：黑暗洞口，石壁上有发光古文字。电流声嗡鸣。可前往：着陆点、洞穴深处",
  cave_deep:   "洞穴深处：巨大地下空洞，中央悬浮脉动蓝色水晶。可前往：洞穴入口、远古遗迹",
  forest:      "外星森林：高大硅基树木，漂浮发光孢子。地面震颤。可前往：着陆点、远古遗迹、外星城市",
  ruins:       "远古遗迹：坍塌石柱和破损壁画，描绘消失的文明。可前往：洞穴深处、外星森林、废弃实验室",
  city:        "外星城市：寂静金属街道，建筑像活物缓慢呼吸。可前往：外星森林、废弃实验室",
  lab:         "废弃实验室：人类建造的金属结构，门半开，屏幕闪烁。可前往：远古遗迹、外星城市、返回舱、远古控制中心",
  pod:         "返回舱：修复完成，随时可以发射回地球。可前往：废弃实验室",
  control:     "远古控制中心：巨大环形控制台，全息影像仍在运转。可前往：废弃实验室",
};

export function buildSceneContext(currentLocation: string): string {
  const ctx = SYMBIOTE_SCENE_CONTEXTS[currentLocation];
  return ctx ? `## 当前位置\n${ctx}` : "";
}
