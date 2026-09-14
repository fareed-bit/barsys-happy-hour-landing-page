// Connect only to a caller-created isolated Chrome, never a personal browser profile.
export async function connectCDP(port) {
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Explicit isolated Chrome port required.');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  if(!target)throw Error('Expected a fresh about:blank tab in isolated Chrome.');
  const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[];
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let sequence=0;
  ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text+': '+(data.params.exceptionDetails.exception?.description||''));
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);
    if(data.error)request.reject(Error(data.error.message));else request.resolve(data.result);
  });
  function call(method,params={}){return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
    pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
  });}
  async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('DOM condition not met: '+expression);}
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  return {call,evaluate,wait,errors,close:()=>ws.close()};
}
