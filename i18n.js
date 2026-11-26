/* Presentation-only localization for the standalone offline app. */
(function (root) {
  'use strict';
  const languages = new Set(['en', 'zh-CN']);
  const key = 'qq-studio-language';
  let language = 'en';
  try {
    const saved = root.localStorage.getItem(key);
    if (languages.has(saved)) language = saved;
  } catch { /* A browser with restricted storage can still switch languages. */ }

  const copy = root.QQChinese;
  const patterns = new Map();
  const cache = new Map();
  const normalize = value => value.trim().replace(/\s+/g, ' ');
  const words = value => value.toLowerCase().match(/[a-z]+/g) || [];
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slot = /\{(\d+)\}/g;

  for (const [source, translated] of Object.entries(copy)) {
    if (!source.includes('{0}')) continue;
    const fixed = source.replace(slot, ' ');
    const anchor = words(fixed).sort((a, b) => b.length - a.length)[0];
    if (!anchor || /\{\d+\}\s*\{\d+\}/.test(source)) continue;
    if (/^\{0\} (h|hours?|days?|months?|jobs?|projects?|ideas?)$/i.test(source)) continue;
    const order = [];
    let pattern = '', end = 0;
    for (const match of source.matchAll(slot)) {
      pattern += escapeRegex(source.slice(end, match.index)) + '(.+?)';
      order.push(Number(match[1]));
      end = match.index + match[0].length;
    }
    pattern += escapeRegex(source.slice(end));
    if (!patterns.has(anchor)) patterns.set(anchor, []);
    const ending = source.match(/(:|\.| ·)$/)?.[0];
    patterns.get(anchor).push({expression: new RegExp('^' + pattern + '$'), order, translated, ending, weight: fixed.trim().length});
  }

  function phrase(value, depth = 0) {
    if (Object.hasOwn(copy, value)) return copy[value];
    if (!/[A-Za-z]/.test(value) || depth > 4 || value.length > 4000) return value;
    const units = /^([+−–-]?[\d,.]+)\s*(h|hours?|days?|months?|jobs?|projects?|ideas?|%)$/i.exec(value);
    if (units) {
      const unit = {h:'小时',hour:'小时',day:'天',month:'个月',job:'个项目',project:'个项目',idea:'个构想','%':'%'}[units[2].toLowerCase().replace(/s$/, '')];
      return units[1] + (unit === '%' ? '' : ' ') + unit;
    }
    const candidates = [];
    for (const word of new Set(words(value))) {
      if (patterns.has(word)) candidates.push(...patterns.get(word));
    }
    candidates.sort((a, b) => b.weight - a.weight);
    // Keep terminal punctuation when it is part of a complete message
    // template. Stripping it first can make a generic fragment win.
    const suffix = /^(.*?)([:.]| ·)$/.exec(value);
    if (suffix && !candidates.some(item => item.ending === suffix[2] && item.expression.test(value))) {
      const label = phrase(suffix[1], depth + 1);
      if (label !== suffix[1]) return label + ({':':'：','.':'。',' ·':' ·'}[suffix[2]]);
    }
    for (const item of candidates) {
      const match = item.expression.exec(value);
      if (!match) continue;
      const args = [];
      item.order.forEach((index, i) => { args[index] = phrase(match[i + 1], depth + 1); });
      return item.translated.replace(slot, (_, index) => args[index]);
    }
    for (const delimiter of [/\s+·\s+/, /(?<=[.!?])\s+(?=[A-Z])/, /:\s+/, /\s+→\s+/]) {
      const parts = value.split(delimiter);
      if (parts.length === 1) continue;
      const result = parts.map(part => phrase(part, depth + 1));
      if (result.some((part, i) => part !== parts[i])) {
        const join = delimiter.source.startsWith(':') ? '：' : delimiter.source.includes('·') ? ' · ' : delimiter.source.includes('→') ? ' → ' : '';
        return result.join(join);
      }
    }
    return value;
  }

  // Mark user-authored values before HTML escaping. Restore them as DOM text
  // or attribute values after translating the surrounding application message.
  const literalRange = /\uFFF9([^\uFFFB]*)\uFFFB/g;
  function literal(value) {
    if (language === 'en' || !value || typeof value !== 'string') return value;
    const quoted = JSON.stringify(value).replace(/[\uFFF9\uFFFB]/g, ch => ch === '\uFFF9' ? '\\ufff9' : '\\ufffb');
    return '\uFFF9' + quoted + '\uFFFB';
  }

  function unpack(value, replace) {
    return value.replace(literalRange, (original, quoted) => {
      try {
        const content = JSON.parse(quoted);
        return typeof content === 'string' ? replace(content) : original;
      } catch { return original; }
    });
  }

  // Offline USD/CNY cross rate from ECB reference rates on 2026-11-24.
  // One euro bought 1.0963 USD and 7.3063 CNY. Keep a single dated rate
  // for entry, display, replays, and reopened reports.
  const yuanPerDollar = 6.6645;
  const rateNote = '人民币折算采用固定参考汇率：1 美元 ≈ 6.6645 元人民币（欧洲央行，2026 年 11 月 24 日）。金额可用人民币输入，按最接近的美分保存，因此折算后可能相差几分人民币。';
  const yuanFormat = new Intl.NumberFormat('zh-CN', {style:'currency', currency:'CNY', minimumFractionDigits:2, maximumFractionDigits:2});
  const roundCents = amount => Math.round((amount + Number.EPSILON) * 100) / 100;
  const toYuan = amount => Math.sign(Number(amount)) * roundCents(Math.abs(Number(amount)) * yuanPerDollar);
  function yuan(amount) {return yuanFormat.format(toYuan(amount));}

  // Prices in old records are USD. Translate environmental copy and source
  // quotations before restoring the user's literal names and notes.
  const priceDigits = '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)';
  const usdTag = '(?:美元|美金|USD)';
  const signedPrice = new RegExp('(?:US\\s*)?[$＄]\\s*([−-]?)' + priceDigits + '(?:\\s*' + usdTag + ')?','gi');
  const taggedPrice = new RegExp(priceDigits + '\\s*([万亿]?)\\s*' + usdTag,'gi');
  const prefixedPrice = new RegExp('\\bUSD\\s+' + priceDigits,'gi');
  function currencyText(value) {
    if (!/[$＄]|美元|美金|\bUSD\b/i.test(value)) return value;
    const number = raw => Number(raw.replaceAll(',', ''));
    value = value.replace(signedPrice, (_,sign,raw) => yuan((sign?-1:1)*number(raw)));
    value = value.replace(taggedPrice, (_,raw,scale) => yuan(number(raw) * (scale==='万'?10000:scale==='亿'?1e8:1)));
    value = value.replace(prefixedPrice, (_,raw) => yuan(number(raw)));
    return value.replace(/[$＄]|美元|美金|\bUSD\b/gi,'人民币');
  }
  function moneyField(label) {
    return language==='zh-CN' && /\$|\bUSD\b/.test(label) ? ' data-base-usd=""' : '';
  }
  function localizeMoneyInput(input) {
    if (!input.hasAttribute('data-base-usd')) return;
    const value = input.getAttribute('value') ?? '';
    if (input.type==='range') {
      // Slider positions and keyboard increments follow the saved plan.
      // Announce the converted amount just like the adjacent editable field.
      input.setAttribute('aria-valuetext', yuan(value));
      return;
    }
    input.dataset.originalUsd = value;
    if (value.trim() && Number.isFinite(Number(value)) && (input.type==='number'||/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value))) input.setAttribute('value', String(toYuan(value)));
    for (const key of ['min','max']) {
      if (input.hasAttribute(key)) input.setAttribute(key, String(toYuan(input.getAttribute(key))));
    }
    if (input.type==='number') input.step='0.01';
  }
  function inputValue(input) {
    const value = input.value;
    if (language!=='zh-CN' || input.dataset?.originalUsd===undefined) return value;
    const raw = value.trim(), original = input.dataset.originalUsd;
    if (!raw || !Number.isFinite(Number(raw))) return value;
    if (input.type!=='number' && input.type!=='range' && !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw)) return value;
    if (original!=='' && Number(raw)===toYuan(original)) return original;
    return String(roundCents(Number(raw)/yuanPerDollar));
  }

  function text(value) {
    if (language === 'en' || typeof value !== 'string') return value;
    const literals = [];
    const masked = unpack(value, content => '\uE010' + (literals.push(content) - 1) + '\uE011');
    const source = normalize(masked);
    if (!source) return value;
    if (!cache.has(source)) {
      if (cache.size > 12000) cache.clear();
      cache.set(source, phrase(source));
    }
    const result = cache.get(source);
    const translated = result === source ? masked : masked.replace(/\S[\s\S]*\S|\S/, () => result);
    return currencyText(translated).replace(/\uE010(\d+)\uE011/g, (token, index) => literals[index] ?? token);
  }

  function localize(container) {
    if (language === 'en') return;
    function visit(node) {
      if (node.nodeType === 3) {
        const next = text(node.data);
        if (next !== node.data) node.data = next;
        return;
      }
      if (node.nodeType === 1) {
        if (node.getAttribute('translate') === 'no' || ['style','script'].includes(node.localName)) return;
        for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
          if (node.hasAttribute(attr)) node.setAttribute(attr, text(node.getAttribute(attr)));
        }
        if (node.localName === 'input') {localizeMoneyInput(node); return;}
        if (node.localName === 'textarea') return;
        if (node.localName === 'option' && !node.hasAttribute('value')) node.value = node.textContent;
      }
      for (const child of node.childNodes) visit(child);
    }
    visit(container);
  }

  function html(markup) {
    if (language === 'en' || !markup) return markup;
    const template = document.createElement('template');
    template.innerHTML = markup;
    localize(template.content);
    return template.innerHTML;
  }

  function report(markup) {
    if (language === 'en') return markup;
    const doc = new DOMParser().parseFromString(markup, 'text/html');
    localize(doc.documentElement);
    doc.documentElement.lang = language;
    const footnote = doc.createElement('p');
    footnote.textContent = rateNote;
    (doc.querySelector('main') || doc.body).append(footnote);
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  function syncDocument() {
    document.documentElement.lang = language;
    document.title = text('美QQ — Studio & Simulator');
  }

  function choose(value) {
    if (!languages.has(value)) return false;
    language = value;
    syncDocument();
    try { root.localStorage.setItem(key, language); } catch { /* Session-only preference. */ }
    return true;
  }

  root.QQI18n = {get language() {return language;}, text, literal, localize, html, report, syncDocument, choose, yuan, moneyField, inputValue, rateNote};
})(globalThis);
