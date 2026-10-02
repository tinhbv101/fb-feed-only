const test = require('node:test');
const assert = require('node:assert/strict');
const people = require('../src/people-rules.js');

const ID_A = '1234567890123456';
const ID_B = '22345678901234567';

test('parseThreadId reads standard and end-to-end encrypted thread links', () => {
  assert.equal(people.parseThreadId(`/messages/t/${ID_A}/`), ID_A);
  assert.equal(people.parseThreadId(`/messages/e2ee/t/${ID_B}`), ID_B);
  assert.equal(people.parseThreadId(`https://www.facebook.com/messages/t/${ID_A}/`), ID_A);
  assert.equal(people.parseThreadId(`https://www.messenger.com/t/${ID_A}`), ID_A);
  assert.equal(people.parseThreadId(`https://www.messenger.com/e2ee/t/${ID_B}`), ID_B);
});

test('parseThreadId rejects non-thread and foreign links', () => {
  assert.equal(people.parseThreadId('/messages/t/'), null);
  assert.equal(people.parseThreadId(`/t/${ID_A}`), null);
  assert.equal(people.parseThreadId(`/groups/t/${ID_A}`), null);
  assert.equal(people.parseThreadId(`https://evil.com/messages/t/${ID_A}`), null);
  assert.equal(people.parseThreadId('/messages/t/abc'), null);
  assert.equal(people.parseThreadId(null), null);
  assert.equal(people.parseThreadId('http://[bad'), null);
});

test('parseThreadInput accepts a pasted link or a bare ID', () => {
  assert.equal(people.parseThreadInput(`  ${ID_A} `), ID_A);
  assert.equal(people.parseThreadInput(`https://www.facebook.com/messages/e2ee/t/${ID_B}/`), ID_B);
  assert.equal(people.parseThreadInput('hello'), null);
  assert.equal(people.parseThreadInput(''), null);
});

test('foldText strips Vietnamese diacritics for search', () => {
  assert.equal(people.foldText('  Nguyễn Văn Đức '), 'nguyen van duc');
  assert.equal(people.foldText(null), '');
});

test('cleanName collapses whitespace and rejects empty or oversized names', () => {
  assert.equal(people.cleanName('  Lan   Anh '), 'Lan Anh');
  assert.equal(people.cleanName('   '), null);
  assert.equal(people.cleanName('x'.repeat(101)), null);
});

test('shouldHideThread follows the selected mode', () => {
  const selected = [ID_A];
  assert.equal(people.shouldHideThread('hideAll', selected, ID_B), true);
  assert.equal(people.shouldHideThread('block', selected, ID_A), true);
  assert.equal(people.shouldHideThread('block', selected, ID_B), false);
  assert.equal(people.shouldHideThread('allow', selected, ID_A), false);
  assert.equal(people.shouldHideThread('allow', selected, ID_B), true);
  assert.equal(people.shouldHideThread('off', selected, ID_A), false);
});

test('findLongestName prefers the most specific match', () => {
  const names = ['An', 'Lan Anh', 'Bình'];
  assert.equal(people.findLongestName('Tin nhắn trong cuộc trò chuyện với Lan Anh', names), 'Lan Anh');
  assert.equal(people.findLongestName('Messages with An', names), 'An');
  assert.equal(people.findLongestName('Messages with Cường', names), null);
  assert.equal(people.findLongestName(null, names), null);
});

test('shouldHideChatWindow matches windows by contact name', () => {
  const names = { knownNames: ['An', 'Lan Anh'], selectedNames: ['An'] };
  const lanAnh = 'Messages in conversation with Lan Anh';
  const an = 'Messages in conversation with An';
  const stranger = 'Messages in conversation with Cường';
  assert.equal(people.shouldHideChatWindow('block', names, an), true);
  assert.equal(people.shouldHideChatWindow('block', names, lanAnh), false);
  assert.equal(people.shouldHideChatWindow('block', names, stranger), false);
  assert.equal(people.shouldHideChatWindow('allow', names, an), false);
  assert.equal(people.shouldHideChatWindow('allow', names, lanAnh), true);
  assert.equal(people.shouldHideChatWindow('allow', names, stranger), true);
  assert.equal(people.shouldHideChatWindow('hideAll', names, an), true);
  assert.equal(people.shouldHideChatWindow('off', names, an), false);
});

test('sanitizePeople and sanitizeIds drop corrupted entries', () => {
  assert.deepEqual(people.sanitizePeople({ [ID_A]: { name: ' Lan ' }, bad: { name: 'x' }, [ID_B]: { name: 3 } }), {
    [ID_A]: { name: 'Lan' },
  });
  assert.deepEqual(people.sanitizePeople([]), {});
  assert.deepEqual(people.sanitizePeople(undefined), {});
  assert.deepEqual(people.sanitizeIds([ID_A, ID_A, 'abc', 5, ID_B]), [ID_A, ID_B]);
  assert.deepEqual(people.sanitizeIds('nope'), []);
});

test('mergePeople reports a change only for new IDs or new names', () => {
  const existing = Object.freeze({ [ID_A]: { name: 'Lan' } });
  assert.equal(people.mergePeople(existing, [{ id: ID_A, name: 'Lan' }]).changed, false);
  assert.equal(people.mergePeople(existing, [{ id: ID_A, name: '' }]).changed, false);
  assert.equal(people.mergePeople(existing, [{ id: 'bad', name: 'X' }]).changed, false);

  const renamed = people.mergePeople(existing, [{ id: ID_A, name: 'Lan Anh' }]);
  assert.equal(renamed.changed, true);
  assert.equal(renamed.people[ID_A].name, 'Lan Anh');
  assert.equal(existing[ID_A].name, 'Lan', 'input must not be mutated');

  const added = people.mergePeople(existing, [{ id: ID_B, name: 'Bình' }]);
  assert.deepEqual(Object.keys(added.people).sort(), [ID_A, ID_B]);
});

test('mergePeople settles when one scan sees the same ID under different names', () => {
  const seen = [
    { id: ID_A, name: '' },
    { id: ID_A, name: 'Lan Anh' },
    { id: ID_A, name: 'Lan' },
  ];
  const first = people.mergePeople({ [ID_A]: { name: 'Lan' } }, seen);
  assert.equal(first.changed, true);
  assert.equal(first.people[ID_A].name, 'Lan Anh');
  assert.equal(people.mergePeople(first.people, seen).changed, false);
});

test('namesOf returns unique non-empty names for the given IDs', () => {
  const list = { [ID_A]: { name: 'Lan' }, [ID_B]: { name: '' } };
  assert.deepEqual(people.namesOf(list, [ID_A, ID_B, '99999']), ['Lan']);
});

test('listPeople searches without diacritics and puts selected people first', () => {
  const list = { [ID_A]: { name: 'Nguyễn Lan' }, [ID_B]: { name: 'Bình' }, 33333333: { name: '' } };
  assert.deepEqual(
    people.listPeople(list, 'nguyen', []).map((p) => p.id),
    [ID_A]
  );
  assert.deepEqual(
    people.listPeople(list, '', [ID_A]).map((p) => p.id),
    [ID_A, ID_B, '33333333']
  );
  assert.deepEqual(people.listPeople(list, '3333', []).map((p) => p.id), ['33333333']);
});
