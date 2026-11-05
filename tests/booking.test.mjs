import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/booking.js';
const payload={request_id:'local-request-123',name:'Test Request',phone:'555-010-1234',email:'test@example.test',service:'Acknowledgment',addr:'Test appointment location'};
const send=(body,env)=>onRequestPost({request:new Request('https://example.test/api/booking',{method:'POST',body:JSON.stringify(body)}),env});
test('missing or failed booking storage never reports success',async()=>{
 assert.equal((await send(payload,{})).status,503);
 const env={BOOKINGS:{get:async()=>null,put:async()=>{throw new Error('unavailable')}}};
 assert.equal((await send(payload,env)).status,503);
});
test('saved requests survive notification failure; exact retries reuse the reference',async()=>{
 const records=new Map();let notifications=0;
 const env={BOOKINGS:{get:async key=>records.get(key)||null,put:async(key,value)=>records.set(key,JSON.parse(value))}};
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{notifications++;return new Response('',{status:503})};
 try{
  const first=await (await send(payload,env)).json();
  assert.equal(first.ok,true);assert.equal(records.size,1);
  assert.equal(records.get(first.id).status,'new');
  const retry=await (await send(payload,env)).json();
  assert.equal(retry.id,first.id);assert.equal(retry.reused,true);assert.equal(notifications,1);
  assert.equal((await send({...payload,service:'Changed service'},env)).status,409);
 }finally{globalThis.fetch=original;}
});
test('malformed requests and invalid contact values are rejected',async()=>{
 assert.equal((await send(null,{})).status,400);
 assert.equal((await send({...payload,phone:'invalid'},{})).status,400);
 assert.equal((await send({...payload,email:'invalid'},{})).status,400);
});

test('virtual requests retain the online preference without marking an appointment confirmed or paid',async()=>{
 let record;
 const env={BOOKINGS:{get:async()=>null,put:async(_,value)=>{record=JSON.parse(value)}}};
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:202});
 try{
  const response=await send({...payload,online:true,addr:'California, United States'},env);
  assert.equal(response.status,200);
  assert.equal(record.online,true);assert.equal(record.status,'new');
  assert.equal(record.addr,'California, United States');
 }finally{globalThis.fetch=original;}
});
