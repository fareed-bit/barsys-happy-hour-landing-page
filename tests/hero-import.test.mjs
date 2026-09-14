import test from 'node:test';
import assert from 'node:assert/strict';
import {findHeroVideo} from '../scripts/sync-live-hero.mjs';
test('Finds explicitly identified hero, not a later product video',()=>{
 const html='<section id="hero"><video muted poster="/photos/p.jpg"><source src="/media/h.mp4?x=1&amp;y=2" type="video/mp4"></video></section><section id="machine"><video src="/media/m.mp4"></video></section>';
 assert.deepEqual(findHeroVideo(html),{src:'https://happyhours.barsys.com/media/h.mp4?x=1&y=2',poster:'https://happyhours.barsys.com/photos/p.jpg'});
});
test('Supports data-src on the sole video',()=>assert.equal(findHeroVideo('<video data-src="https://media.barsys.com/event.mp4"></video>').src,'https://media.barsys.com/event.mp4'));
test('Does not guess from multiple unidentified videos',()=>assert.throws(()=>findHeroVideo('<video src="a.mp4"></video><video src="b.mp4"></video>'),/unambiguously/));
test('Rejects iframe-only and manifests without changing any file',()=>{
 assert.throws(()=>findHeroVideo('<iframe src="https://example.com/player"></iframe>'),/No native/);
 assert.throws(()=>findHeroVideo('<video src="/hero.m3u8"></video>'),/streaming manifest/);
});
