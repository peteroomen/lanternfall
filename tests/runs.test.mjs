import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../scripts/simulate.mjs';

test('a careful player can finish four floors and the boss using normal game actions',()=>{
  for(const seed of [0,1,19,37,42]){
    const run=simulate(seed,{maxActions:1800});
    assert.equal(run.phase,'won',`seed ${seed}: ${JSON.stringify(run)}`);
    assert.deepEqual(run.floors,[0,1,2,3]);assert.ok(run.kills>20);assert.equal(run.rejected,0);
  }
});

test('repeated save/resume produces the same full-run outcome',()=>{
  for(const seed of [0,19,37])assert.deepEqual(simulate(seed,{resume:true}),simulate(seed));
});

test('death is a reachable normal outcome when supplies and danger warnings are ignored',()=>{
  const runs=Array.from({length:20},(_,seed)=>simulate(seed,{careful:false,maxActions:1800}));
  assert.ok(runs.some(r=>r.phase==='dead'));assert.ok(runs.some(r=>r.phase==='won'));
  assert.ok(runs.every(r=>r.phase!=='playing'));
});
