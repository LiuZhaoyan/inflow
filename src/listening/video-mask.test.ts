import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustVideoMask, containedVideoBounds, validateVideoMask, type VideoMask } from './video-mask';

const rectangle: VideoMask = { enabled: true, x: 0.25, y: 0.25, width: 0.5, height: 0.5 };

test('mask coordinates follow the contained picture rather than player letterboxing', () => {
  assert.deepEqual(containedVideoBounds(640, 360, 1920, 1080), { x: 0, y: 0, width: 640, height: 360 });
  assert.deepEqual(containedVideoBounds(640, 360, 640, 480), { x: 80, y: 0, width: 480, height: 360 });
  assert.deepEqual(containedVideoBounds(640, 360, 1080, 1920), { x: 218.75, y: 0, width: 202.5, height: 360 });
  assert.deepEqual(containedVideoBounds(1280, 720, 640, 480), { x: 160, y: 0, width: 960, height: 720 });
  assert.equal(containedVideoBounds(640, 360, 0, 0), null);
  assert.equal(containedVideoBounds(0, 0, 1920, 1080), null);
});

test('moving and resizing keep the mask within the picture without crossing edges', () => {
  assert.deepEqual(adjustVideoMask(rectangle, 'move', 1, -1), { ...rectangle, x: 0.5, y: 0 });
  assert.deepEqual(adjustVideoMask(rectangle, 'nw', -1, -1), { ...rectangle, x: 0, y: 0, width: 0.75, height: 0.75 });
  assert.deepEqual(adjustVideoMask(rectangle, 'se', 1, 1), { ...rectangle, width: 0.75, height: 0.75 });
  const shrunk = adjustVideoMask(rectangle, 'nw', 1, 1);
  assert.ok(Math.abs(shrunk.width - 0.02) < 1e-9);
  assert.ok(Math.abs(shrunk.height - 0.02) < 1e-9);
  assert.equal(shrunk.x + shrunk.width, 0.75);
  assert.equal(shrunk.y + shrunk.height, 0.75);
  for (const handle of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const) {
    for (const delta of [-10, 10]) assert.doesNotThrow(() => validateVideoMask(adjustVideoMask(rectangle, handle, delta, delta)));
  }
});

test('optional mask settings remain disabled by absence and reject unsafe persisted coordinates', () => {
  assert.equal(validateVideoMask(undefined), undefined);
  assert.deepEqual(validateVideoMask({ ...rectangle, enabled: false }), { ...rectangle, enabled: false });
  for (const mask of [null, [], {}, { ...rectangle, enabled: 'true' }, { ...rectangle, x: -0.01 }, { ...rectangle, y: NaN },
    { ...rectangle, width: 0 }, { ...rectangle, height: Infinity }, { ...rectangle, x: 0.6 }, { ...rectangle, y: 0.6 }]) {
    assert.throws(() => validateVideoMask(mask), /视频字幕遮罩无效/);
  }
});
