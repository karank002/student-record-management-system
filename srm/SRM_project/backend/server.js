"use strict";
const http = require("http");
const PORT = 8080;

// --- Linked List (DSA #1) ---
class LinkedList {
  constructor() { this.head = null; }
  push(data) { this.head = { data, next: this.head }; }
  toArray() { const a=[]; let c=this.head; while(c){a.push(c.data);c=c.next;} return a; }
}

// --- Hash Map (DSA #2) ---
class HashMap {
  constructor() { this.m = Object.create(null); }
  set(k,v){ this.m[k]=v; } get(k){ return this.m[k]; }
  delete(k){ delete this.m[k]; } has(k){ return k in this.m; }
  values(){ return Object.values(this.m); }
}

// --- Stack (DSA #3) ---
class Stack {
  constructor(){ this.top=null; this.sz=0; }
  push(d){ this.top={data:d,next:this.top}; this.sz++; }
  pop(){ if(!this.top)return null; const d=this.top.data; this.top=this.top.next; this.sz--; return d; }
  isEmpty(){ return this.sz===0; }
}

// --- Queue (DSA #4) ---
class Queue {
  constructor(){ this.head=null; this.tail=null; this.sz=0; }
  enqueue(d){ const n={data:d,next:null}; if(this.tail)this.tail.next=n; else this.head=n; this.tail=n; this.sz++; }
  dequeue(){ if(!this.head)return null; const d=this.head.data; this.head=this.head.next; if(!this.head)this.tail=null; this.sz--; return d; }
  toArray(){ const a=[]; let c=this.head; while(c){a.push(c.data);c=c.next;} return a; }
}

// --- Max-Heap topN (DSA #5) ---
function topN(arr, n, key){
  const h=[...arr];
  const sift=(h,i)=>{ const l=2*i+1,r=2*i+2; let m=i; if(l<h.length&&key(h[l])>key(h[m]))m=l; if(r<h.length&&key(h[r])>key(h[m]))m=r; if(m!==i){[h[i],h[m]]=[h[m],h[i]];sift(h,m);} };
  for(let i=Math.floor(h.length/2)-1;i>=0;i--)sift(h,i);
  const res=[];
  for(let i=0;i<Math.min(n,arr.length);i++){ res.push(h[0]); h[0]=h.pop(); if(h.length)sift(h,0); }
  return res;
}

// --- Trie (DSA #6) ---
class Trie {
  constructor(){ this.root={}; }
  insert(word,id){ let n=this.root; for(const c of word.toLowerCase()){if(!n[c])n[c]={};n=n[c];} if(!n._ids)n._ids=[]; if(!n._ids.includes(id))n._ids.push(id); }
  search(prefix){ let n=this.root; for(const c of prefix.toLowerCase()){if(!n[c])return[];n=n[c];}
    const res=[]; const dfs=n=>{if(n._ids)res.push(...n._ids);for(const k of Object.keys(n)){if(k!=='_ids')dfs(n[k]);}}; dfs(n); return [...new Set(res)]; }
}

// --- Merge Sort (DSA #7) ---
function mergeSort(arr,cmp){ if(arr.length<=1)return arr; const m=arr.length>>1,L=mergeSort(arr.slice(0,m),cmp),R=mergeSort(arr.slice(m),cmp),o=[];let i=0,j=0; while(i<L.length&&j<R.length){if(cmp(L[i],R[j])<=0)o.push(L[i++]);else o.push(R[j++]);} return o.concat(L.slice(i)).concat(R.slice(j)); }

// --- GPA BST (DSA #8) ---
class GpaBST {
  constructor(){ this.root=null; }
  insert(s){ const node={gpa:s.gpa,ids:[s.id],l:null,r:null}; if(!this.root){this.root=node;return;} let c=this.root; while(true){if(s.gpa===c.gpa){c.ids.push(s.id);return;}if(s.gpa<c.gpa){if(!c.l){c.l=node;return;}c=c.l;}else{if(!c.r){c.r=node;return;}c=c.r;}} }
  range(lo,hi){ const res=[],dfs=n=>{if(!n)return;if(n.gpa>=lo)dfs(n.l);if(n.gpa>=lo&&n.gpa<=hi)res.push(...n.ids);if(n.gpa<=hi)dfs(n.r);}; dfs(this.root); return res; }
}

// --- Graph + BFS (DSA #9) ---
class Graph {
  constructor(){ this.adj=new Map(); }
  build(students){ this.adj.clear(); for(const s of students)this.adj.set(s.id,[]); for(let i=0;i<students.length;i++)for(let j=i+1;j<students.length;j++){const a=students[i],b=students[j];if(a.subject===b.subject&&a.grade===b.grade){this.adj.get(a.id).push(b.id);this.adj.get(b.id).push(a.id);}} }
  bfs(start,depth){ const vis=new Set([start]),q=[{id:start,d:0}],res=[]; while(q.length){const{id,d}=q.shift();if(d>0)res.push(id);if(d<depth)for(const nb of(this.adj.get(id)||[])){if(!vis.has(nb)){vis.add(nb);q.push({id:nb,d:d+1});}}} return res; }
}

// --- LRU Cache (DSA #10) ---
class LRU { constructor(cap){this.cap=cap;this.m=new Map();} touch(id){this.m.delete(id);this.m.set(id,1);if(this.m.size>this.cap)this.m.delete(this.m.keys().next().value);} toArray(){return[...this.m.keys()].reverse();} }

// --- Binary Search (DSA #11) ---
function bsRoll(sorted,roll){ let lo=0,hi=sorted.length-1; while(lo<=hi){const m=(lo+hi)>>1;if(sorted[m].roll===roll)return sorted[m];if(sorted[m].roll<roll)lo=m+1;else hi=m-1;} return null; }

// --- Student Store ---
const store = {
  idx: new HashMap(), undoStack: new Stack(), admQ: new Queue(),
  trie: new Trie(), graph: new Graph(), lru: new LRU(5), nextId: 1,
  all(){ return this.idx.values(); },
  rebuildTrie(){ this.trie=new Trie(); for(const s of this.all())for(const w of s.name.split(/\s+/))this.trie.insert(w,s.id); },
  rebuildGraph(){ this.graph.build(this.all()); },
  add(data){ if(data.id&&Number(data.id)>=this.nextId)this.nextId=Number(data.id)+1; const id=data.id?Number(data.id):this.nextId++; const s={...data,id,gpa:Number(data.gpa)||0,attended:Number(data.attended)||0,totalClasses:Number(data.totalClasses)||0}; this.idx.set(id,s); this.rebuildTrie(); this.rebuildGraph(); return s; },
  update(id,data){ const s=this.idx.get(id); if(!s)return null; Object.assign(s,data,{id}); s.gpa=Number(s.gpa)||0; this.rebuildTrie(); this.rebuildGraph(); return s; },
  remove(id){ const s=this.idx.get(id); if(!s)return null; this.undoStack.push({...s}); this.idx.delete(id); this.rebuildTrie(); this.rebuildGraph(); return s; },
  undo(){ const s=this.undoStack.pop(); if(!s)return null; this.idx.set(s.id,s); if(Number(s.id)>=this.nextId)this.nextId=Number(s.id)+1; this.rebuildTrie(); this.rebuildGraph(); return s; },
  attendance(records){ for(const r of records){const s=this.idx.get(r.id);if(!s)continue;s.totalClasses=(s.totalClasses||0)+1;if(r.present)s.attended=(s.attended||0)+1;} }
};

// --- HTTP helpers ---
const cors = res => { res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS"); res.setHeader("Access-Control-Allow-Headers","Content-Type"); };
const send = (res,data,code=200) => { cors(res); res.writeHead(code,{"Content-Type":"application/json"}); res.end(JSON.stringify(data)); };
const no204 = res => { cors(res); res.writeHead(204); res.end(); };
const body = req => new Promise((ok,err)=>{ let b=""; req.on("data",c=>b+=c); req.on("end",()=>{try{ok(b?JSON.parse(b):{});}catch(e){err(e);}}); req.on("error",err); });

http.createServer(async(req,res)=>{
  const u=new URL(req.url,`http://localhost:${PORT}`),p=u.pathname,m=req.method;
  if(m==="OPTIONS"){cors(res);res.writeHead(204);res.end();return;}
  try{
    if(m==="GET"&&p==="/health") return send(res,{status:"ok"});
    if(m==="GET"&&p==="/students/recent"){ const ids=store.lru.toArray(); return send(res,ids.map(i=>store.idx.get(i)).filter(Boolean)); }
    if(m==="GET"&&p==="/students/top"){ const n=parseInt(u.searchParams.get("n")||"10"); return send(res,topN(store.all(),n,s=>Number(s.gpa))); }
    if(m==="GET"&&p==="/students/search"){ const pfx=u.searchParams.get("prefix")||""; return send(res,store.trie.search(pfx).map(id=>store.idx.get(id)).filter(Boolean).slice(0,10)); }
    if(m==="GET"&&p==="/students/sorted"){ const by=u.searchParams.get("by")||"name",ord=u.searchParams.get("order")||"asc",mul=ord==="desc"?-1:1; return send(res,mergeSort(store.all(),(a,b)=>{ if(by==="gpa")return(Number(a.gpa)-Number(b.gpa))*mul; if(by==="attendance"){const pa=a.totalClasses?a.attended/a.totalClasses:0,pb=b.totalClasses?b.attended/b.totalClasses:0;return(pa-pb)*mul;} return a.name.localeCompare(b.name)*mul; })); }
    if(m==="GET"&&p==="/students/gpa-range"){ const lo=parseFloat(u.searchParams.get("min")||"0"),hi=parseFloat(u.searchParams.get("max")||"10"); const bst=new GpaBST(); for(const s of store.all())bst.insert(s); return send(res,bst.range(lo,hi).map(id=>store.idx.get(id)).filter(Boolean)); }
    if(m==="GET"&&p==="/students/by-roll"){ const roll=u.searchParams.get("roll")||""; const sorted=mergeSort(store.all(),(a,b)=>a.roll<b.roll?-1:a.roll>b.roll?1:0); const found=bsRoll(sorted,roll); return found?send(res,found):send(res,{error:"not found"},404); }
    const bm=p.match(/^\/students\/(\d+)\/buddies$/);
    if(m==="GET"&&bm){ const id=parseInt(bm[1]),depth=parseInt(u.searchParams.get("depth")||"2"); store.rebuildGraph(); return send(res,store.graph.bfs(id,depth).map(i=>store.idx.get(i)).filter(Boolean)); }
    if(m==="GET"&&p==="/students") return send(res,store.all());
    if(m==="POST"&&p==="/students") return send(res,store.add(await body(req)),201);
    if(m==="POST"&&p==="/students/undo"){ const s=store.undo(); return s?send(res,s):send(res,{error:"nothing to undo"},404); }
    const im=p.match(/^\/students\/(\d+)$/);
    if(m==="GET"&&im){ const id=parseInt(im[1]),s=store.idx.get(id); if(!s)return send(res,{error:"not found"},404); store.lru.touch(id); return send(res,s); }
    if(m==="PUT"&&im){ const id=parseInt(im[1]),s=store.update(id,await body(req)); return s?send(res,s):send(res,{error:"not found"},404); }
    if(m==="DELETE"&&im){ const id=parseInt(im[1]),s=store.remove(id); return s?no204(res):send(res,{error:"not found"},404); }
    if(m==="POST"&&p==="/admissions"){ store.admQ.enqueue(await body(req)); return send(res,{ok:true},201); }
    if(m==="GET"&&p==="/admissions") return send(res,store.admQ.toArray());
    if(m==="POST"&&p==="/admissions/next"){ const r=store.admQ.dequeue(); return r?send(res,store.add({...r,attended:0,totalClasses:0,gpa:0,status:"Active"}),201):send(res,{error:"queue empty"},404); }
    if(m==="POST"&&p==="/attendance"){ const b2=await body(req); store.attendance(b2.records||[]); return send(res,{ok:true}); }
    send(res,{error:"not found"},404);
  }catch(e){ console.error(e); send(res,{error:e.message},500); }
}).listen(PORT,()=>{ console.log(`EduTrack backend running at http://localhost:${PORT}`); console.log("(Node.js — same API as the C++ backend, no compile needed)"); });
