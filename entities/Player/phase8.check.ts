// Runnable: npx --yes tsx entities/Player/phase8.check.ts
import assert from "node:assert/strict";
import { closestContact, isLegOrFoot } from "./contact";
import { measureTackle } from "./tackle";
import { scoreFoul } from "./foulScore";
import { issueCard, createCardBook } from "../../engine/referee/cards";
import { applyDecisionToRating, createMatchRating } from "../../engine/referee/rating";
import { progressCareer, createCareer } from "../../engine/referee/career";
import { computeVision } from "../../engine/referee/vision";
import * as THREE from "three";

const hit = closestContact(0, 0, 0.5, 0);
assert.ok(hit.distance < 1);
assert.ok(isLegOrFoot("foot"));

const tackle = measureTackle(
  { x: 0, z: 0 },
  { x: 0, z: 6 },
  { x: 0, z: 1 },
  { x: 0, z: 0 },
  { x: 5, z: 5 },
);
assert.ok(tackle.force > 0);
assert.equal(tackle.ballTouched, false);

const dirty = scoreFoul({
  tackle: { ...tackle, ballTouched: false, force: 10, speed: 7 },
  fromBehind: true,
  late: true,
  studs: true,
});
assert.ok(dirty.score > 0.5);
assert.ok(dirty.severity === "foul" || dirty.severity === "reckless");

const book = createCardBook();
const y1 = issueCard(book, 7, "yellow");
assert.equal(y1.cards.length, 1);
const y2 = issueCard(book, 7, "yellow");
assert.ok(y2.sentOff);
assert.equal(y2.cards.length, 2);
assert.equal(y2.cards[1].type, "red");

const rating = applyDecisionToRating(createMatchRating(), {
  correct: true,
  late: false,
  excellentPositioning: true,
  visionQuality: 0.9,
});
assert.ok(rating.overall >= 10 || rating.accuracy > 9);

let career = createCareer();
career = progressCareer(career, 9.5);
assert.ok(career.matchesCompleted === 1);

const dir = new THREE.Vector3(0, 0, 1);
const vision = computeVision({ x: 0, z: 0 }, dir, { x: 0, z: 10 }, [{ x: 0.2, z: 5 }]);
assert.equal(vision.obstructed, true);
assert.ok(vision.quality < 0.6);

console.log("phase8.check: ok");
