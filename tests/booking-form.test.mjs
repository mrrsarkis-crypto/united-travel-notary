import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../booking-form.js',import.meta.url),'utf8');
function setup(fetch){
 const listeners={};const modeListeners={};let sequence=0;
 const button={disabled:false},label={},status={textContent:''};
 const fields=Object.fromEntries(['f-name','f-phone','f-email','f-service','f-location','f-date','f-time','f-notes'].map(id=>[id,{value:'Test value',placeholder:''}]));
 const mode={value:'mobile',addEventListener:(type,fn)=>modeListeners[type]=fn};
 const form={reportValidity:()=>true,querySelector:()=>button,addEventListener:(type,fn)=>listeners[type]=fn,setAttribute:()=>{},removeAttribute:()=>{}};
 vm.runInNewContext(script,{document:{getElementById:id=>id==='bookForm'?form:id==='booking-status'?status:id==='f-mode'?mode:fields[id],querySelector:()=>label},crypto:{randomUUID:()=>`test-request-${++sequence}`},fetch,AbortSignal});
 return {listeners,modeListeners,mode,fields,status,button,label,submit:()=>listeners.submit({preventDefault(){}})};
}
test('virtual booking sends region and online preference, then displays a truthful receipt',async()=>{
 let body;const ui=setup(async(_,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify({ok:true,id:'bk_test'}))});
 ui.mode.value='virtual';ui.modeListeners.change();ui.fields['f-location'].value='California, United States';
 assert.match(ui.label.textContent,/State and country/);
 await ui.submit();assert.equal(body.online,true);assert.equal(body.addr,'California, United States');
 assert.match(ui.status.textContent,/bk_test/);assert.match(ui.status.textContent,/still need confirmation/);assert.match(ui.status.textContent,/No payment/);
 assert.equal(ui.button.disabled,false);
});
test('failed delivery keeps entered details and permits a retry with the same request ID',async()=>{
 const ids=[];const ui=setup(async(_,opts)=>{ids.push(JSON.parse(opts.body).request_id);throw new Error('network')});
 await ui.submit();await ui.submit();assert.equal(ids[0],ids[1]);assert.equal(ui.fields['f-name'].value,'Test value');
 assert.match(ui.status.textContent,/could not confirm receipt/);assert.equal(ui.button.disabled,false);
});
test('double submission while sending makes only one request',async()=>{
 let resolve,calls=0;const ui=setup(()=>{calls++;return new Promise(r=>resolve=r)});
 const pending=ui.submit();await ui.submit();assert.equal(calls,1);assert.equal(ui.button.disabled,true);
 resolve(new Response(JSON.stringify({ok:true,id:'bk_test'})));await pending;
});
