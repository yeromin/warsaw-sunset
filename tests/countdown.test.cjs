const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function app(iso, { storage = new Map(), storageBlocked = false } = {}) {
  let now = Date.parse(iso);
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', hidden: false, children: [], attributes: {}, styles: {}, events: {},
      style: { setProperty(name, value) { this[name] = value; } },
      classList: { toggle() {} },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
      querySelector() { return { textContent: id }; }
    });
    return elements.get(id);
  };
  class Clock extends Date { static now() { return now; } }
  const context = {
    Date: Clock, Intl, Math, Number, Object, String,
    document: {
      getElementById: element, querySelector: element,
      createElement: () => element(Symbol()), createTextNode: text => ({textContent: text}),
      addEventListener() {}, hidden: false
    },
    setInterval() {}
  };
  context.localStorage = {
    getItem(key) { if (storageBlocked) throw new Error('Storage blocked'); return storage.get(key); },
    setItem(key, value) { if (storageBlocked) throw new Error('Storage blocked'); storage.set(key, value); }
  };
  const instrumented = script.replace('      setInterval(tick, 1000);',
    '      globalThis.api = { getSchedule, localDate, nextDay, tick, countdown, cities };\n      setInterval(tick, 1000);');
  vm.runInNewContext(instrumented, context);
  return {
    ...context.api, element,
    at(iso) { now = Date.parse(iso); context.api.tick(); },
    choose(id) { element('city-select').value = id; element('city-select').events.change(); }
  };
}

test('original November schedule, seven dots and live countdowns remain intact', () => {
  const page = app('2026-11-09T14:00:00Z');
  assert.equal(page.element('clock').textContent, '15:00:00');
  assert.equal(page.element('sun-count').textContent, '00:53:00');
  assert.equal(page.element('dark-count').textContent, '02:50:00');
  for (const name of ['dawnFaint', 'dawn', 'rise', 'sunset', 'civil', 'nautical', 'dark']) {
    assert.equal(page.element(`point-${name}`).hidden, false);
    assert.match(page.element(`tip-time-${name}`).textContent, /^\d\d:\d\d$/);
  }
  page.at('2026-11-09T14:00:01Z');
  assert.equal(page.element('sun-count').textContent, '00:52:59');
  assert.equal(page.element('tip-relative-sunset').textContent, 'In 00:52:59');
});

test('Warsaw midnight recalculates while the page stays open', () => {
  const page = app('2026-11-09T22:59:59Z');
  assert.equal(page.element('date-label').textContent, 'MON, NOV 09');
  page.at('2026-11-09T23:00:00Z');
  assert.equal(page.element('date-label').textContent, 'TUE, NOV 10');
  assert.equal(page.element('time-sunset').textContent, '15:51');
  assert.equal(page.element('morning-light').textContent, '06:10');
});

test('summer dawn uses the previous UTC day; absent astronomical night does not crash', () => {
  const page = app('2027-06-21T10:00:00Z');
  const times = page.getSchedule({y: 2027, m: 6, d: 21});
  assert.ok(times.dawnFaint < times.dawn && times.dawn < times.rise);
  assert.equal(page.localDate(new Date(times.dawnFaint)).d, 21);
  assert.ok(Number.isNaN(times.dark));
  assert.equal(page.element('dark-count').textContent, 'No full darkness');
  assert.equal(page.element('point-dark').hidden, true);
  assert.equal(page.element('time-dark').textContent, '—');
  assert.ok(!page.element('track').style['--progress'].includes('NaN'));
});

test('Warsaw date and clock respect spring and autumn daylight saving changes', () => {
  const page = app('2027-03-28T00:59:59Z');
  assert.equal(page.element('clock').textContent, '01:59:59');
  page.at('2027-03-28T01:00:00Z');
  assert.equal(page.element('clock').textContent, '03:00:00');
  page.at('2027-10-31T00:59:59Z');
  assert.equal(page.element('clock').textContent, '02:59:59');
  page.at('2027-10-31T01:00:00Z');
  assert.equal(page.element('clock').textContent, '02:00:00');
});

test('changing city updates clock, solar schedule, every dot and the morning forecast immediately', () => {
  const page = app('2026-11-09T14:00:00Z');
  const warsaw = page.element('time-sunset').textContent;
  const dawn = page.element('morning-light').textContent;
  page.choose('new-york');
  assert.equal(page.element('clock').textContent, '09:00:00');
  assert.equal(page.element('date-label').textContent, 'MON, NOV 09');
  assert.notEqual(page.element('time-sunset').textContent, warsaw);
  assert.notEqual(page.element('morning-light').textContent, dawn);
  assert.equal(page.element('local-time-note').textContent, 'Live countdown · New York local time · Updated every second');
  assert.equal(page.element('solar-reference').href, 'https://www.timeanddate.com/sun/usa/new-york');
  for (const name of ['dawnFaint', 'dawn', 'rise', 'sunset', 'civil', 'nautical', 'dark']) {
    assert.match(page.element(`tip-time-${name}`).textContent, /^\d\d:\d\d$/);
    const timestamp = page.getSchedule({y: 2026, m: 11, d: 9})[name];
    assert.equal(page.element(`tip-time-${name}`).textContent,
      new Intl.DateTimeFormat('en-GB', {timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(timestamp));
  }
  page.choose('warsaw');
  assert.equal(page.element('time-sunset').textContent, warsaw);
});

test('cities use their own calendar date across midnight and daylight saving changes', () => {
  const page = app('2027-01-01T00:30:00Z');
  page.choose('los-angeles');
  assert.equal(page.element('date-label').textContent, 'THU, DEC 31');
  assert.equal(page.element('clock').textContent, '16:30:00');
  assert.equal(page.element('morning-date').textContent, 'TOMORROW · FRI, JAN 01');
  page.choose('tokyo');
  assert.equal(page.element('date-label').textContent, 'FRI, JAN 01');
  assert.equal(page.element('clock').textContent, '09:30:00');
  page.choose('new-york');
  page.at('2027-03-14T06:59:59Z');
  assert.equal(page.element('clock').textContent, '01:59:59');
  page.at('2027-03-14T07:00:00Z');
  assert.equal(page.element('clock').textContent, '03:00:00');
  page.at('2027-03-15T04:00:00Z');
  assert.equal(page.element('date-label').textContent, 'MON, MAR 15');
});

test('city choice survives reload, with safe fallback for obsolete choices and unavailable storage', () => {
  const storage = new Map();
  const page = app('2027-01-01T12:00:00Z', {storage});
  page.choose('kyiv');
  const reloaded = app('2027-01-01T12:00:00Z', {storage});
  assert.equal(reloaded.element('city-select').value, 'kyiv');
  assert.equal(reloaded.element('clock').textContent, '14:00:00');
  storage.set('sunset-city', 'obsolete');
  const fallback = app('2027-01-01T12:00:00Z', {storage});
  assert.equal(fallback.element('city-select').value, 'warsaw');
  const privatePage = app('2027-01-01T12:00:00Z', {storageBlocked: true});
  assert.doesNotThrow(() => privatePage.choose('london'));
  assert.equal(privatePage.element('clock').textContent, '12:00:00');
});

test('all supported cities retain valid solar event order throughout a full year', () => {
  const page = app('2027-01-01T12:00:00Z');
  for (const city of page.cities) {
    page.choose(city.id);
    for (let time = Date.UTC(2027, 0, 1); time < Date.UTC(2028, 0, 1); time += 86400000) {
      const date = new Date(time);
      const day = {y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate()};
      const schedule = page.getSchedule(day);
      const times = Object.values(schedule).filter(Number.isFinite);
      assert.ok(Number.isFinite(schedule.dawnFaint) && Number.isFinite(schedule.nautical));
      for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1], `${city.id} ${date.toISOString()}`);
      assert.equal(page.localDate(new Date(schedule.rise)).d, day.d, `${city.id} sunrise date`);
      assert.equal(page.localDate(new Date(schedule.sunset)).d, day.d, `${city.id} sunset date`);
      page.at(new Date(time).toISOString());
      for (const id of ['sun-count', 'dark-count', 'morning-count', 'time-sunset', 'morning-light']) {
        assert.doesNotMatch(page.element(id).textContent, /NaN|Invalid/, `${city.id} ${id} ${date.toISOString()}`);
      }
    }
  }
});

test('three full years render without invalid times or reversed solar events', () => {
  const page = app('2026-01-01T12:00:00Z');
  for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2029, 0, 1); time += 86400000) {
    const date = new Date(time);
    const day = {y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate()};
    const schedule = page.getSchedule(day);
    const times = Object.values(schedule).filter(Number.isFinite);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1], JSON.stringify(day));
    for (const hour of [0, 6, 12, 18, 23]) {
      page.at(new Date(time + hour * 3600000).toISOString());
      for (const [id, node] of ['sun-count', 'dark-count', 'morning-count', 'time-sunset'].map(id => [id, page.element(id)])) {
        assert.doesNotMatch(node.textContent, /NaN|Invalid/, `${String(id)} ${date.toISOString()}`);
      }
    }
  }
});
