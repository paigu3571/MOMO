export const WIDTH = 1440;
export const HEIGHT = 2560;
export const TITLE = '别扯了！我的电子手办成精了';
export const FACES = ['idle', 'wink', 'surprised', 'annoyed', 'panic', 'smug', 'speechless', 'laugh'];

export const PARTS = {
  ahoge: { kind: 'ahoge', grid: [12, 24], root: [.84, .96], tip: [.12, .73], axis: [-.16, -1], stiffness: 120, damping: 4, maxMult: 3, reach: 119, padding: 12 },
  ribbon_spring: { kind: 'ribbon_spring', grid: [8, 32], root: [.08, .06], tip: [.81, .97], stiffness: 50, damping: 3, maxMult: 2.2, reach: 148, padding: 10 },
  charm_peach: { kind: 'charm_peach', grid: [8, 12], root: [.84, .06], tip: [.34, .88], stiffness: 80, damping: 3, maxMult: 1.6, reach: 105, padding: 12 },
  sleeve_L: { kind: 'sleeve', grid: [16, 16], root: [.21, .10], tip: [.75, .89], stiffness: 160, damping: 8, maxMult: 1.5, reach: 150, padding: 8 },
  sleeve_R: { kind: 'sleeve', grid: [16, 16], root: [.26, .88], tip: [.76, .18], stiffness: 160, damping: 8, maxMult: 1.5, reach: 145, padding: 8 },
  legwear_L: { kind: 'legwear', grid: [12, 24], root: [.5, .01], tip: [.95, .6], stiffness: 260, damping: 10, maxMult: 1.25, reach: 107, side: 1, knee: 1700 },
  legwear_R: { kind: 'legwear', grid: [12, 24], root: [.5, .01], tip: [.05, .6], stiffness: 260, damping: 10, maxMult: 1.25, reach: 104, side: -1, knee: 1689 },
  face: { kind: 'face', grid: [24, 24], root: [.5, .5], tip: [.9, .5], stiffness: 300, damping: 12, maxMult: 1.2, reach: 78 },
};
export const CHEEKS = [
  { x: 672, y: 379, rx: 20, ry: 14 },
  { x: 794, y: 356, rx: 16, ry: 12 },
];

export const CHALLENGES = [
  { id: 'C1', part: 'ahoge', title: '把呆毛拉到 2.0 倍不许断', hint: '接近 2.0 倍就松手，超过 2.4 倍会拉断。', duration: 10 },
  { id: 'C2', part: 'ribbon_spring', title: '5 秒内让弹簧飘带弹 3 次', hint: '每次拉到至少 1.5 倍再松手。', duration: 10, window: 5 },
  { id: 'C3', part: 'charm_peach', title: '让桃子挂件晃够 3 秒', hint: '来回晃动腰间桃子，累计有效晃动时间。', duration: 10 },
  { id: 'C4', part: 'face', title: '轻轻捏一下脸，别捏疼了', hint: '拖动脸颊到 1.05–1.12 倍后松手。', duration: 10 },
  { id: 'C5', part: 'sleeve', title: '袖口质检：拉到 1.3 倍停 1 秒', hint: '拉住任一侧袖口，在 1.25–1.35 倍之间保持。', duration: 10 },
  { id: 'C6', part: 'legwear', title: '机能长袜质检：横向拉到 1.15 倍', hint: '从小腿外侧向外轻拉，接近 1.15 倍就松手。', duration: 10 },
];
export const RATINGS = [
  { min: 9, label: '夯', face: 'laugh' },
  { min: 7.5, label: '顶级', face: 'wink' },
  { min: 6, label: '人上人', face: 'smug' },
  { min: 4, label: 'NPC', face: 'speechless' },
  { min: 0, label: '拉完了', face: 'annoyed' },
];
export const QUIPS = {
  ahoge: ['再拽我呆毛就要报警了！', '呆毛是天线，拽坏了你修？', '信号……信号要断了！'],
  ribbon_spring: ['这是弹簧不是跳绳！', '弹回来打到你可不负责哦', '绕成麻花了啦！'],
  charm_peach: ['别晃了，桃子要晕了', '这可是限定挂件！'],
  face: ['脸不是捏捏乐！', '再捏收费了', '别把我脸扯成大饼！'],
  sleeve: ['袖子要被你拉长了！', '这件外套很贵的！'],
  legwear: ['质检员请规范操作！', '袜子不是橡皮筋啊喂！', '这双是 9.9 包邮的，经不起你这么拉！', '拉抽丝了你赔？'],
  low: ['就这？拉完了', '手残认证'],
  high: ['你是懂物理的！', '顶级夯，给你颁个奖'],
};
