const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createDouyin } = require('../lib/core')
const image = { mediaType: 'image', resources: [{ type: 'file', uri: 'file:///tmp/a.png' }] }
function fixture(cancelRejects = true) {
  const calls = []
  let resolve, reject
  const native = {
    configure: async config => { calls.push(['configure', config]) },
    isAppInstalled: async () => true,
    getCapabilities: async () => ({ share: 'unknown' }),
    prepareResources: async resources => resources,
    share: (request, id) => { calls.push(['share', request, id]); return new Promise((a,b) => { resolve=a;reject=b }) },
    forwardToDaily: (request, id) => { calls.push(['daily', request, id]); return new Promise((a,b) => { resolve=a;reject=b }) },
    shareToContacts: (request, id) => { calls.push(['contacts', request, id]); return new Promise((a,b) => { resolve=a;reject=b }) },
    cancelPendingShare: async id => { calls.push(['cancel',id]); if(cancelRejects) reject?.(Object.assign(new Error('native cancelled'), { code: 'E_CANCELLED' })) },
  }
  return { api: createDouyin(native), calls, capture: () => resolve, complete: value => resolve(value), fail: value => reject(value) }
}
test('requires configuration and rejects unknown configuration fields', async () => {
  const {api}=fixture()
  await assert.rejects(api.share(image), {code:'E_NOT_CONFIGURED'})
  await assert.rejects(api.configure({clientKey:'k',clientSecret:'x'}),{code:'E_INVALID_ARGUMENT'})
})
test('maps one request and returns native results without claiming publish', async () => {
  const f=fixture();await f.api.configure({clientKey:'k'})
  const task=f.api.share(image)
  const result={status:'failed',platform:'android',nativeResponse:{errorCode:123}}
  f.complete(result); assert.equal(await task,result)
  assert.equal(f.calls[1][0],'share')
})
test('prevents concurrent requests and reconfiguration, releases after callback',async()=>{
  const f=fixture();await f.api.configure({clientKey:'k'})
  const first=f.api.share(image)
  await assert.rejects(f.api.share(image),{code:'E_BUSY'})
  await assert.rejects(f.api.configure({clientKey:'other'}),{code:'E_BUSY'})
  f.complete({status:'cancelled'});await first
  const next=f.api.share(image);f.complete({status:'success'});await next
})
test('validates resource types, publish constraints and unsupported options',async()=>{
  const {api}=fixture();await api.configure({clientKey:'k'})
  for(const req of [ {...image,targetPage:'publish'}, {...image,title:''}, {...image,foo:true}, {...image,resources:[{type:'file',uri:'https://example.com/a.png'}]}, {...image,imageAlbumMode:'yes'} ]) {
    await assert.rejects(api.share(req),{code:'E_INVALID_ARGUMENT'})
  }
})
test('contact links map to contact native path and require HTTPS',async()=>{
  const f=fixture();await f.api.configure({clientKey:'k'})
  const request={mediaType:'link',link:{url:'https://example.com/123',title:'title',description:'desc'}}
  const task=f.api.shareToContacts(request);f.complete({status:'success'});await task
  assert.equal(f.calls[1][0],'contacts')
  await assert.rejects(f.api.shareToContacts({...request,link:{...request.link,url:'http://example.com'}}),{code:'E_INVALID_ARGUMENT'})
  await assert.rejects(f.api.shareToContacts({...image,resources:[...image.resources,...image.resources]}),{code:'E_INVALID_ARGUMENT'})
})
test('local cancellation rejects only the local wait and releases busy',async()=>{
  const f=fixture();await f.api.configure({clientKey:'k'})
  const task=f.api.share(image);const check=assert.rejects(task,{code:'E_CANCELLED'})
  await f.api.cancelPendingShare();await check
  assert.equal(f.calls.at(-1)[0],'cancel')
  const next=f.api.share(image);f.complete({status:'success'});await next
})
test('late completion cannot settle a newer request',async()=>{
  const f=fixture(false);await f.api.configure({clientKey:'k'})
  const first=f.api.share(image);const late=f.capture()
  const check=assert.rejects(first,{code:'E_CANCELLED'});await f.api.cancelPendingShare();await check
  const next=f.api.share(image);late({status:'failed'});await Promise.resolve()
  await assert.rejects(f.api.share(image),{code:'E_BUSY'})
  f.complete({status:'success'});assert.equal((await next).status,'success')
  // Native request IDs are unique and old JS promise handlers are gated.
  assert.notEqual(f.calls[1][2],f.calls[3][2])
})
test('timeout keeps its own error code despite native cancellation',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const f=fixture();await f.api.configure({clientKey:'k'})
  const task=f.api.share(image,{timeoutMs:1000});const check=assert.rejects(task,{code:'E_TIMEOUT'})
  t.mock.timers.tick(1000);await check
})
test('native errors release pending state',async()=>{
  const f=fixture();await f.api.configure({clientKey:'k'})
  const first=f.api.share(image);const check=assert.rejects(first,{code:'E_RESOURCE'})
  f.fail(Object.assign(new Error('bad resource'),{code:'E_RESOURCE'}));await check
  const next=f.api.share(image);f.complete({status:'unknown'});await next
})
test('resource preparation validates explicit write option',async()=>{
  const {api}=fixture();await api.configure({clientKey:'k'})
  assert.deepEqual(await api.prepareResources(image.resources,{mediaType:'image',allowPhotoLibraryWrite:true}),image.resources)
  await assert.rejects(api.prepareResources(image.resources,{mediaType:'image',allowPhotoLibraryWrite:'yes'}),{code:'E_INVALID_ARGUMENT'})
})

test('daily uses the daily bridge and rejects multiple items and work fields', async () => {
  const f = fixture()
  await f.api.configure({ clientKey: 'k' })
  for (const invalid of [{ ...image, resources: [...image.resources, ...image.resources] }, { ...image, targetPage: 'publish' }]) {
    await assert.rejects(f.api.forwardToDaily(invalid), { code: 'E_INVALID_ARGUMENT' })
  }
  const task = f.api.forwardToDaily(image)
  await assert.rejects(f.api.share(image), { code: 'E_BUSY' })
  f.complete({ status: 'cancelled' })
  assert.equal((await task).status, 'cancelled')
  assert.deepEqual(f.calls.slice(1).map(([method, request]) => [method, request]), [['daily', image]])
})
