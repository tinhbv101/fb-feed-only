const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/rules.js');

test('isMessagesPath matches Messenger routes only', () => {
  assert.equal(rules.isMessagesPath('/messages'), true);
  assert.equal(rules.isMessagesPath('/messages/t/123'), true);
  assert.equal(rules.isMessagesPath('/messenger/'), true);
  assert.equal(rules.isMessagesPath('/'), false);
  assert.equal(rules.isMessagesPath('/messagesfoo'), false);
  assert.equal(rules.isMessagesPath('/groups/messages'), false);
  assert.equal(rules.isMessagesPath(undefined), false);
});

test('isMessageHref handles relative, absolute and messenger.com links', () => {
  assert.equal(rules.isMessageHref('/messages/t/123'), true);
  assert.equal(rules.isMessageHref('https://www.facebook.com/messages/'), true);
  assert.equal(rules.isMessageHref('https://www.messenger.com/t/1'), true);
  assert.equal(rules.isMessageHref('https://evil-messenger.com/'), false);
  assert.equal(rules.isMessageHref('https://example.com/messages/'), false);
  assert.equal(rules.isMessageHref('/watch'), false);
  assert.equal(rules.isMessageHref(''), false);
  assert.equal(rules.isMessageHref(null), false);
});

test('label matching is exact, case-insensitive and bilingual', () => {
  assert.equal(rules.isMessageButtonLabel('Messenger'), true);
  assert.equal(rules.isMessageButtonLabel('  Đoạn chat '), true);
  assert.equal(rules.isMessageButtonLabel('Messenger Kids settings'), false);
  assert.equal(rules.isMessageButtonLabel(null), false);
  assert.equal(rules.isChatDockLabel('New message'), true);
  assert.equal(rules.isChatDockLabel('Tin nhắn mới'), true);
  assert.equal(rules.isChatDockLabel('Messenger'), false);
  assert.equal(rules.isMessageInputLabel('Message'), true);
  assert.equal(rules.isMessageInputLabel('Tin nhắn'), true);
  assert.equal(rules.isMessageInputLabel('Write a comment…'), false);
});

test('mergeSettings falls back to defaults for missing or invalid values', () => {
  assert.deepEqual(rules.mergeSettings(undefined), rules.DEFAULT_SETTINGS);
  assert.deepEqual(rules.mergeSettings({ hideMessages: 'yes', extra: 1 }), rules.DEFAULT_SETTINGS);
  assert.deepEqual(rules.mergeSettings({ hideMessages: false, hideLeftNav: true }), {
    hideMessages: false,
    hideLeftNav: true,
  });
  assert.equal(Object.isFrozen(rules.mergeSettings({})), true);
});
