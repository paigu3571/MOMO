import { CHALLENGES, RATINGS, TITLE } from './config.js';
import { ratingFor } from './challenge.js';

const el = (id) => document.getElementById(id);
const number = (n) => n.toFixed(1);
const font = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

function panel(context, x, y, width, height, fill, radius = 30) {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

export function makeUI(game) {
  const cover = el('cover');
  const hud = el('hud');
  const results = el('results');
  const meter = el('meter');
  const title = el('prompt');
  const score = el('score');
  const activeBar = el('time-fill');
  const tiers = [...el('tiers').children];
  const time = el('time');
  const bubble = el('bubble');
  const feedback = el('feedback');
  let bubbleTimer;
  let lastNumber;
  let meterLimit;

  return {
    mode(mode) {
      game.dataset.mode = mode;
      cover.hidden = mode !== 'cover';
      hud.hidden = !['play', 'free'].includes(mode);
      el('challenge').hidden = hud.hidden;
      results.hidden = mode !== 'results';
      bubble.hidden = true;
      feedback.hidden = true;
      meter.hidden = true;
    },
    score(value) {
      const grade = value === null ? null : ratingFor(value);
      score.textContent = value === null ? '—' : number(value);
      tiers.forEach((tier, i) => {
        tier.classList.toggle('active', RATINGS[i] === grade);
        if (RATINGS[i] === grade) tier.setAttribute('aria-current', 'true');
        else tier.removeAttribute('aria-current');
      });
    },
    round(spec, index) {
      el('round').textContent = '第 ' + index + ' / 3 关';
      title.textContent = spec.title;
      el('hint').textContent = spec.hint;
      feedback.hidden = true;
      bubble.hidden = true;
      meter.hidden = true;
    },
    free() {
      el('round').textContent = '自由玩';
      title.textContent = '拖动 MOMO 的部件';
      el('hint').textContent = '呆毛、飘带、桃子、脸颊、袖口或小腿外侧';
      this.time(0, 0);
      this.score(null);
    },
    time(remaining, limit, progress = '') {
      const label = limit ? (progress ? progress + ' · ' : '') + remaining.toFixed(1) + ' 秒' : '';
      if (label !== time.textContent) time.textContent = label;
      activeBar.style.transform = 'scaleX(' + (limit ? remaining / limit : 0) + ')';
    },
    meter(value, max) {
      meter.hidden = false;
      const text = '×' + value.toFixed(2);
      if (lastNumber !== text) {
        el('multiplier').textContent = text;
        lastNumber = text;
      }
      if (meterLimit !== max) {
        el('max-mult').textContent = '×' + max.toFixed(2);
        meterLimit = max;
      }
      el('meter-fill').style.transform = 'scaleY(' + Math.max(0, (value - 1) / (max - 1)) + ')';
    },
    hideMeter() { meter.hidden = true; },
    quip(text) {
      clearTimeout(bubbleTimer);
      bubble.textContent = text;
      bubble.hidden = false;
      bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 1700);
    },
    feedback(result, text) {
      meter.hidden = true;
      bubble.hidden = true;
      el('round-score').textContent = (result.score >= 6 ? '✓ ' : '✗ ') + number(result.score) + ' 分';
      el('round-comment').textContent = (result.status ? result.status + ' · ' : '') + text;
      feedback.hidden = false;
    },
    results(book, average, grade, comment) {
      el('final-tier').textContent = grade.label;
      el('final-score').textContent = number(average) + ' 分';
      el('final-comment').textContent = comment;
      [...el('result-tiers').children].forEach((tier, i) => {
        tier.classList.toggle('active', RATINGS[i] === grade);
        if (RATINGS[i] === grade) tier.setAttribute('aria-current', 'true');
        else tier.removeAttribute('aria-current');
      });
      el('round-results').replaceChildren(...book.map((entry) => {
        const row = document.createElement('li');
        const label = document.createElement('span');
        const points = document.createElement('strong');
        label.textContent = entry.title;
        points.textContent = number(entry.score);
        row.append(label, points);
        return row;
      }));
    },
    debug(activate, toggleSocks) {
      const panel = el('debug');
      const choose = el('debug-round');
      for (const spec of CHALLENGES) {
        choose.append(new Option(spec.id + ' ' + spec.title, spec.id));
      }
      panel.hidden = false;
      el('debug-start').addEventListener('click', () => activate(choose.value));
      el('debug-hide-socks').addEventListener('change', (event) => toggleSocks(event.target.checked));
    },
  };
}

export function exportCard(stage, book, average, grade, comment) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(stage.images.bg_room, 0, 0, 1080, 1920);
  const wash = ctx.createLinearGradient(0, 0, 0, 1920);
  wash.addColorStop(0, '#431b56c9');
  wash.addColorStop(.29, '#521b6400');
  wash.addColorStop(.68, '#521b6400');
  wash.addColorStop(1, '#321437da');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1080, 1920);
  stage.paintCharacter(ctx, 540 - 720 * .45, 305, .45, grade.face);
  panel(ctx, 58, 43, 964, 271, '#fff0f8f5', 39);
  ctx.drawImage(stage.images.icon_peach, 500, 57, 80, 80);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4d2349';
  ctx.font = '800 45px ' + font;
  ctx.fillText(TITLE, 540, 165, 885);
  ctx.font = '900 92px ' + font;
  ctx.fillStyle = '#a51d6b';
  ctx.fillText(grade.label + ' · ' + number(average) + ' 分', 540, 272, 860);
  panel(ctx, 58, 1512, 964, 317, '#fff0f8f5', 39);
  ctx.textAlign = 'left';
  book.forEach((entry, index) => {
    const y = 1550 + index * 65;
    panel(ctx, 100, y, 880, 54, '#f6d4e6', 15);
    ctx.fillStyle = '#4d2349';
    ctx.font = '700 31px ' + font;
    ctx.textAlign = 'left';
    ctx.fillText((index + 1) + '  ' + entry.title, 126, y + 37, 720);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8c225d';
    ctx.fillText(number(entry.score), 954, y + 37);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#572845';
  ctx.font = '800 40px ' + font;
  ctx.fillText(comment, 540, 1785, 880);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff4fc';
  ctx.font = '600 26px ' + font;
  ctx.fillText('开发中 Demo', 1008, 1884);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = 'MOMO-挑战结果-' + number(average) + '.png';
    anchor.href = url;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
}
