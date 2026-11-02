// ===== ตั้งค่า =====
const firebaseConfig = {
  apiKey: "AIzaSyAVd4FanRvcHwPnQIhNm-EtmhgXw5jCwbU",
  authDomain: "free-days-cc74e.firebaseapp.com",
  projectId: "free-days-cc74e",
  storageBucket: "free-days-cc74e.firebasestorage.app",
  messagingSenderId: "689418453976",
  appId: "1:689418453976:web:52a953794da20b8127e8ad",
  measurementId: "G-77NLJNECPN"
};
// App Check (กันบอต): ใส่ reCAPTCHA v3 site key ตรงนี้เมื่อตั้งค่าใน Firebase แล้ว (ดู SETUP.md)
const APPCHECK_SITE_KEY = "";
// SHA-256 ของอีเมลเจ้าของเว็บ (ไม่เก็บอีเมลตรงๆ)
const OWNER_HASH = "1675e5cce02c5a97bebc836cba92ea1fa9b2e10bcdd50bb8f2e6e87a2710dc31";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, query, where, collection, doc, onSnapshot, setDoc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch, Bytes, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===== ค่าคงที่และตัวช่วย =====
const TH_MONTH=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_MON_S=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const TH_DOW=["อา","จ","อ","พ","พฤ","ศ","ส"];
const TH_DOW_L=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสฯ","ศุกร์","เสาร์"];
const SLOT_NAME={m:"เช้า",a:"บ่าย",e:"เย็น"};
// วันหยุดราชการไทย (อาจเปลี่ยนตามประกาศ ครม.)
const HOLIDAYS={
  "2026-01-01":"วันขึ้นปีใหม่","2026-01-02":"วันหยุดพิเศษ","2026-03-03":"วันมาฆบูชา","2026-04-06":"วันจักรี",
  "2026-04-13":"วันสงกรานต์","2026-04-14":"วันสงกรานต์","2026-04-15":"วันสงกรานต์","2026-05-01":"วันแรงงาน",
  "2026-05-04":"วันฉัตรมงคล","2026-05-31":"วันวิสาขบูชา","2026-06-01":"ชดเชยวันวิสาขบูชา","2026-06-03":"วันเฉลิมฯ พระราชินี",
  "2026-07-28":"วันเฉลิมฯ ร.10","2026-07-29":"วันอาสาฬหบูชา","2026-07-30":"วันเข้าพรรษา","2026-08-12":"วันแม่",
  "2026-10-13":"วันนวมินทรมหาราช","2026-10-23":"วันปิยมหาราช","2026-12-05":"วันพ่อ","2026-12-07":"ชดเชยวันพ่อ",
  "2026-12-10":"วันรัฐธรรมนูญ","2026-12-31":"วันสิ้นปี",
  "2027-01-01":"วันขึ้นปีใหม่","2027-02-21":"วันมาฆบูชา","2027-02-22":"ชดเชยวันมาฆบูชา","2027-04-06":"วันจักรี",
  "2027-04-13":"วันสงกรานต์","2027-04-14":"วันสงกรานต์","2027-04-15":"วันสงกรานต์","2027-05-01":"วันแรงงาน",
  "2027-05-03":"ชดเชยวันแรงงาน","2027-05-04":"วันฉัตรมงคล","2027-05-20":"วันวิสาขบูชา","2027-06-03":"วันเฉลิมฯ พระราชินี",
  "2027-07-18":"วันอาสาฬหบูชา","2027-07-19":"วันเข้าพรรษา","2027-07-28":"วันเฉลิมฯ ร.10","2027-08-12":"วันแม่",
  "2027-10-13":"วันนวมินทรมหาราช","2027-10-23":"วันปิยมหาราช","2027-10-25":"ชดเชยวันปิยมหาราช","2027-12-05":"วันพ่อ",
  "2027-12-06":"ชดเชยวันพ่อ","2027-12-10":"วันรัฐธรรมนูญ","2027-12-31":"วันสิ้นปี"
};
const pad=n=>String(n).padStart(2,"0");
const key=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fromKey=k=>{const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)};
const today=new Date();today.setHours(0,0,0,0);
const todayKey=key(today);
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const enc=new TextEncoder();
async function sha256bytes(t){return new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(t)))}
async function sha256hex(t){return [...await sha256bytes(t)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function twoTap(btn,label,confirmLabel,fn){
  btn.onclick=async()=>{
    if(!btn.classList.contains("confirm")){btn.classList.add("confirm");btn.textContent=confirmLabel;setTimeout(()=>{btn.classList.remove("confirm");btn.textContent=label},3000);return}
    btn.classList.remove("confirm");btn.textContent=label;await fn();
  };
}

// ===== ธีม =====
const themeNow=()=>document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
function paintTheme(){const d=themeNow()==="dark",l=d?"สลับโหมดสว่าง":"สลับโหมดมืด";$("themeicon").textContent=d?"☀":"☾";$("themebtn").title=l;$("themebtn").setAttribute("aria-label",l)}
$("themebtn").onclick=()=>{const t=themeNow()==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("ffd-theme",t)}catch(e){}paintTheme()};
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",paintTheme);
paintTheme();

// ===== นัด / ลิงก์ =====
const cleanEvent=v=>(v||"").normalize("NFC").trim().replace(/[\/?#&%\u0000-\u001f]/g,"").replace(/\s+/g,"-").replace(/^\.+|\.+$/g,"").replace(/^__|__$/g,"").slice(0,60);
const params=new URLSearchParams(location.search);
const eventId=cleanEvent(params.get("event"))||"";
const home=!eventId;
const baseUrl=location.origin+location.pathname;
const linkFor=ev=>baseUrl+"?event="+encodeURIComponent(ev);
const lineUrl=(title,url)=>"https://line.me/R/msg/text/?"+encodeURIComponent(title+"\nแตะวันที่ว่างได้ที่นี่ "+url);
const niceName=id=>id.replace(/-/g," ");

// ===== สถานะ =====
let view=new Date(today.getFullYear(),today.getMonth(),1);
let people={};                 // uid -> {name, note, map:{date:{s,slots}}, hasPin}
let ev={};                     // ข้อมูลนัด
let myId=null, myName="", myNote="", my={};    // my: date -> {s:"y"|"m", slots:""}
let ready=false, loaded=false, eventExists=false, isEventOwner=false, isCodeAdmin=false, isAdmin=false, ownerOk=false, hasCode=false;
let confirmed=[], planMode=false, plan=new Set();
let rangeMode=false, anchor=null, selDay=null, drag=null, ignoreClick=false;
let presence={}, fs=null, auth=null;
let saveTimer=null, saving=false, pending=false;
const flashUntil={};

try{myName=localStorage.getItem("ffd-name")||""}catch(e){}
$("myname").value=myName;

function setStatus(t,err){const s=$("status");s.textContent=t;s.classList.toggle("err",!!err)}
const isEvAdmin=()=>eventExists&&(isEventOwner||isCodeAdmin||isAdmin);
const closed=()=>!!ev.deadline&&todayKey>ev.deadline;
const canEdit=()=>ready&&(!closed()||isEvAdmin());
const inRange=k=>k>=todayKey&&(!ev.rangeStart||k>=ev.rangeStart)&&(!ev.rangeEnd||k<=ev.rangeEnd);

// ===== แปลงข้อมูลคน =====
// days: "2026-11-10,2026-11-12@e" (ว่าง; @ = ช่วงเวลา m/a/e)  maybe: "2026-11-14" (อาจจะ)
function parsePerson(d){
  const map={};
  if(Array.isArray(d.dates))for(const k of d.dates)if(typeof k==="string")map[k]={s:"y",slots:""};
  for(const part of String(d.days||"").split(",").filter(Boolean)){const [k,sl]=part.split("@");map[k]={s:"y",slots:sl||""}}
  for(const k of String(d.maybe||"").split(",").filter(Boolean))map[k]={s:"m",slots:""};
  return {name:String(d.name||""),note:String(d.note||""),hasPin:d.hasPin===true,map};
}
function encodeMine(){
  const ks=Object.keys(my).filter(k=>k>=todayKey).sort();
  return {
    days:ks.filter(k=>my[k].s==="y").map(k=>k+(my[k].slots?"@"+my[k].slots:"")).join(","),
    maybe:ks.filter(k=>my[k].s==="m").join(",")
  };
}
function merged(){
  const all={...people};
  if(myId&&(Object.keys(my).length||all[myId]))all[myId]={...(all[myId]||{}),name:myName||"เรา",note:myNote,map:my};
  return all;
}

// ===== รูปแบบวันที่ =====
function fmtDates(list){
  const ds=[...list].sort().map(fromKey);
  if(!ds.length)return "";
  const runs=[];let cur=[ds[0],ds[0]];
  for(let i=1;i<ds.length;i++){const nxt=new Date(cur[1]);nxt.setDate(nxt.getDate()+1);if(ds[i].getTime()===nxt.getTime())cur[1]=ds[i];else{runs.push(cur);cur=[ds[i],ds[i]]}}
  runs.push(cur);
  const byMonth=[];
  for(const [a,b] of runs){
    const txt=a.getTime()===b.getTime()?String(a.getDate()):(a.getMonth()===b.getMonth()?a.getDate()+"–"+b.getDate():a.getDate()+" "+TH_MON_S[a.getMonth()]+" – "+b.getDate());
    const mk=b.getFullYear()+"-"+b.getMonth(),last=byMonth[byMonth.length-1];
    if(last&&last.mk===mk)last.parts.push(txt);else byMonth.push({mk,m:b.getMonth(),y:b.getFullYear(),parts:[txt]});
  }
  const yrs=new Set(byMonth.map(x=>x.y));
  return byMonth.map((x,i)=>x.parts.join(", ")+" "+TH_MON_S[x.m]+(i===byMonth.length-1||yrs.size>1?" "+(x.y+543):"")).join(" / ");
}
function runsOf(list){
  const ds=[...list].sort().map(fromKey),runs=[];
  for(const d of ds){const last=runs[runs.length-1];if(last){const n=new Date(last[1]);n.setDate(n.getDate()+1);if(n.getTime()===d.getTime()){last[1]=d;continue}}runs.push([d,d])}
  return runs;
}
const fmtDay=k=>{const d=fromKey(k);return TH_DOW_L[d.getDay()]+" "+d.getDate()+" "+TH_MON_S[d.getMonth()]};
const slotTxt=s=>s?s.split("").map(c=>SLOT_NAME[c]).join("/"):"";

// ===== หน้าหลัก vs หน้านัด =====
if(!home){
  $("sitefoot").hidden=false;
  $("title").textContent=niceName(eventId);document.title=niceName(eventId)+" · ว่างวันไหน";
  $("eventview").hidden=false;
}else{
  $("homeview").hidden=false;document.body.classList.add("is-home");
}

// ===== วาดหน้า =====
function counts(all){
  const yes={},mb={};
  for(const id of Object.keys(all))for(const [k,v] of Object.entries(all[id].map||{})){
    const nm=all[id].name||"ไม่ระบุชื่อ";
    if(v.s==="y")(yes[k]=yes[k]||[]).push({nm,slots:v.slots});else(mb[k]=mb[k]||[]).push({nm});
  }
  return {yes,mb};
}
function render(){
  if(home)return;
  const all=merged(),ids=Object.keys(all),tot=Math.max(ids.length,1),{yes,mb}=counts(all);
  // หัวเรื่อง/รายละเอียด
  const title=ev.title||niceName(eventId);$("title").textContent=title;document.title=title+" · ว่างวันไหน";
  const info=[];
  if(ev.place)info.push(`<span><b>สถานที่</b> ${esc(ev.place)}</span>`);
  if(ev.time)info.push(`<span><b>เวลา</b> ${esc(ev.time)}</span>`);
  if(ev.desc)info.push(`<span class="desc">${esc(ev.desc)}</span>`);
  if(ev.rangeStart||ev.rangeEnd)info.push(`<span><b>ช่วงที่เลือกได้</b> ${ev.rangeStart?fmtDay(ev.rangeStart):"วันนี้"} ถึง ${ev.rangeEnd?fmtDay(ev.rangeEnd):"ไม่จำกัด"}</span>`);
  $("evinfo").innerHTML=info.join("");$("evinfo").hidden=!info.length;
  const dl=$("deadline");
  if(ev.deadline){dl.hidden=false;dl.classList.toggle("closed",closed());dl.textContent=closed()?("ปิดรับแล้วเมื่อ "+fmtDay(ev.deadline)+(isEvAdmin()?" (แอดมินยังแก้ได้)":"")):("ลงได้ถึง "+fmtDay(ev.deadline))}else dl.hidden=true;

  // ปฏิทิน
  $("month").textContent=TH_MONTH[view.getMonth()]+" "+(view.getFullYear()+543);
  $("prev").disabled=view<=new Date(today.getFullYear(),today.getMonth(),1);
  const first=view.getDay(),days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  let h="";const holsHere=[];
  for(let i=0;i<first;i++)h+=`<div class="day blank"></div>`;
  for(let d=1;d<=days;d++){
    const dt=new Date(view.getFullYear(),view.getMonth(),d),k=key(dt),past=dt<today,out=!past&&!inRange(k);
    const c=(yes[k]||[]).length,q=(mb[k]||[]).length,lvl=c?Math.min(4,Math.ceil(c/tot*4)):0;
    const mine=my[k],hol=HOLIDAYS[k];if(hol)holsHere.push(d+" "+hol);
    const cls=["day",past?"past":"",out?"out":"",mine?.s==="y"?"mine":"",mine?.s==="m"?"maybe":"",k===todayKey?"today":"",plan.has(k)?"plan":"",confirmed.includes(k)?"conf":"",hol?"hol":"",anchor===k?"anchor":"",selDay===k?"sel":"",(flashUntil[k]||0)>Date.now()?"flash":""].filter(Boolean).join(" ");
    const lbl=`${d} ${TH_MONTH[view.getMonth()]}${hol?" "+hol:""} ว่าง ${c} คน${q?" อาจจะ "+q+" คน":""}${mine?(mine.s==="y"?" (เราว่าง)":" (เราอาจจะ)"):""}`;
    const slot=mine?.s==="y"&&mine.slots?`<span class="slot">${slotTxt(mine.slots)}</span>`:"";
    h+=`<button class="${cls}" data-k="${k}" data-l="${lvl}" ${past||out?"disabled":""} title="${esc(lbl)}" aria-label="${esc(lbl)}"><span class="n">${d}</span>${c||q?`<span class="c">${c?c+" คน":""}${q?` <span class="q">+${q}?</span>`:""}</span>`:""}${slot}</button>`;
  }
  for(let i=(first+days)%7;i&&i<7;i++)h+=`<div class="day blank"></div>`;
  $("grid").innerHTML=h;
  $("hols").hidden=!holsHere.length;$("hols").textContent="วันหยุด: "+holsHere.join(", ");
  renderSlotbar();
  $("qrange").classList.toggle("on",rangeMode);
  $("toolhint").textContent=rangeMode?(anchor?"แตะวันสุดท้ายของช่วง":"แตะวันแรกของช่วง"):planMode?"โหมดเลือกวันที่จะนัด: แตะเพื่อเลือก ไม่บันทึกวันว่างของเรา":"กดชื่อวัน (อา–ส) เลือกทั้งคอลัมน์ได้ ในคอมลากเมาส์เลือกหลายวันได้";
  $("tools").hidden=planMode||!canEdit();

  renderPlan(all);

  // วันที่ดีสุด
  const keysAll=new Set([...Object.keys(yes),...Object.keys(mb)]);
  const ranked=[...keysAll].filter(k=>k>=todayKey).map(k=>({k,y:(yes[k]||[]),m:(mb[k]||[])})).sort((a,b)=>b.y.length-a.y.length||b.m.length-a.m.length||a.k.localeCompare(b.k)).slice(0,6);
  const best=$("best");best.innerHTML="";
  if(!ranked.length)best.innerHTML=`<li class="empty">ยังไม่มีใครเลือกวัน ลองแตะวันในปฏิทินดู</li>`;
  for(const r of ranked){
    const li=document.createElement("li");
    li.innerHTML=`<span class="k"></span><span class="d"></span><span class="who"></span>`;
    li.querySelector(".k").textContent=r.y.length+"/"+tot;
    li.querySelector(".d").textContent=fmtDay(r.k)+(HOLIDAYS[r.k]?" ("+HOLIDAYS[r.k]+")":"");
    li.querySelector(".who").textContent=r.y.map(x=>x.nm+(x.slots?" ("+slotTxt(x.slots)+")":"")).join(", ")+(r.m.length?(r.y.length?" · ":"")+"อาจจะ: "+r.m.map(x=>x.nm).join(", "):"");
    best.appendChild(li);
  }

  // รายชื่อ
  const ul=$("people");ul.innerHTML="";
  $("pc").textContent=ids.length?`(${ids.length} คน)`:"";
  if(!ids.length)ul.innerHTML=`<li class="empty">${loaded?"ยังไม่มีใครลง ส่งลิงก์ให้เพื่อนได้เลย":"กำลังโหลด…"}</li>`;
  for(const id of ids){
    const p=all[id],li=document.createElement("li");
    const nm=document.createElement("span");nm.className="nm";nm.textContent=(p.name||"ไม่ระบุชื่อ")+(id===myId?" (เรา)":"");
    if(presence[id]&&isOnline(presence[id])){const o=document.createElement("span");o.className="online";o.title="ออนไลน์อยู่";o.textContent=" ●";nm.appendChild(o)}
    if(p.note){const n=document.createElement("span");n.className="note";n.textContent=p.note;nm.appendChild(n)}
    const vals=Object.entries(p.map||{}).filter(([k])=>k>=todayKey);
    const ct=document.createElement("span");ct.className="ct";
    const ny=vals.filter(([,v])=>v.s==="y").length,nq=vals.length-ny;ct.textContent=ny+" วัน"+(nq?" +"+nq+"?":"");
    const right=document.createElement("span");right.className="right";right.appendChild(ct);
    if(isEvAdmin()&&id!==myId&&people[id]){
      const b=document.createElement("button");b.className="rm";b.type="button";b.textContent="ลบ";
      twoTap(b,"ลบ","ยืนยันลบ",async()=>{
        b.disabled=true;
        try{const bt=writeBatch(fs);bt.delete(doc(fs,"events",eventId,"people",id));bt.delete(doc(fs,"events",eventId,"pins",id));await bt.commit();setStatus("ลบ "+(p.name||"ไม่ระบุชื่อ")+" แล้ว")}
        catch(e){console.error(e);b.disabled=false;setStatus("ลบไม่สำเร็จ ("+(e.code||"error")+")",true)}
      });
      right.appendChild(b);
    }
    li.append(nm,right);ul.appendChild(li);
  }
  // คนที่ควรมาแต่ยังไม่ลง
  const exp=Array.isArray(ev.expected)?ev.expected:[];
  const have=new Set(ids.map(id=>(all[id].name||"").trim().toLowerCase()));
  const miss=exp.filter(n=>!have.has(n.trim().toLowerCase()));
  $("missing").hidden=!exp.length;
  $("missing").innerHTML=exp.length?(miss.length?`<b>ยังไม่ได้ลง ${miss.length} คน:</b> ${esc(miss.join(", "))}`:"ลงครบทุกคนแล้ว"):"";

  // เครื่องมือของฉัน
  const rec=$("recname"),cur=rec.value;
  const opts=Object.entries(people).filter(([id,p])=>id!==myId&&p.hasPin);
  rec.innerHTML=opts.length?opts.map(([id,p])=>`<option value="${esc(id)}">${esc(p.name||"ไม่ระบุชื่อ")}</option>`).join(""):`<option value="">ไม่มีชื่อที่ตั้ง PIN ไว้</option>`;
  if(cur)rec.value=cur;
  $("recoverform").querySelector("button").disabled=!opts.length;
  $("removeme").hidden=!(myId&&people[myId]);
  renderAdmin();
  renderLive();
}

function renderSlotbar(){
  const bar=$("slotbar");
  if(!selDay||my[selDay]?.s!=="y"||planMode){bar.hidden=true;return}
  const sl=my[selDay].slots||"";
  bar.hidden=false;
  bar.innerHTML=`<b>${esc(fmtDay(selDay))}:</b>`+
    `<button type="button" class="pill${sl?"":" on"}" data-s="">ทั้งวัน</button>`+
    ["m","a","e"].map(s=>`<button type="button" class="pill${sl.includes(s)?" on":""}" data-s="${s}">${SLOT_NAME[s]}</button>`).join("");
}
$("slotbar").addEventListener("click",e=>{
  const b=e.target.closest(".pill");if(!b||!selDay||!my[selDay])return;
  const s=b.dataset.s;let sl=my[selDay].slots||"";
  if(!s)sl="";else sl=sl.includes(s)?sl.replace(s,""):sl+s;
  sl=["m","a","e"].filter(x=>sl.includes(x)).join("");if(sl.length===3)sl="";
  my[selDay].slots=sl;render();queueSave(0);
});

// ===== โต้ตอบปฏิทิน =====
const nextState=k=>!my[k]?"y":my[k].s==="y"?"m":null;
function setDay(k,s){if(!inRange(k))return;if(s)my[k]={s,slots:s==="y"?(my[k]?.slots||""):""};else delete my[k]}
function needEdit(){
  if(!ready){setStatus("ยังเชื่อมต่อไม่เสร็จ รอสักครู่",true);return false}
  if(!canEdit()){setStatus("นัดนี้ปิดรับแล้ว",true);return false}
  return true;
}
$("grid").addEventListener("click",e=>{
  if(ignoreClick){ignoreClick=false;return}
  const b=e.target.closest(".day");if(!b||b.disabled||!b.dataset.k)return;
  const k=b.dataset.k;
  if(planMode){plan.has(k)?plan.delete(k):plan.add(k);render();return}
  if(!needEdit())return;
  if(rangeMode){
    if(!anchor){anchor=k;render();return}
    const [a,z]=[anchor,k].sort();for(let d=fromKey(a);key(d)<=z;d.setDate(d.getDate()+1))setDay(key(d),"y");
    anchor=null;rangeMode=false;render();queueSave(0);return;
  }
  const s=nextState(k);setDay(k,s);selDay=s==="y"?k:null;render();queueSave(0);
});
// ลากเมาส์เลือกหลายวัน
$("grid").addEventListener("pointerdown",e=>{
  if(e.pointerType!=="mouse"||e.button!==0||planMode||rangeMode)return;
  const b=e.target.closest(".day");if(!b||b.disabled||!b.dataset.k||!canEdit())return;
  drag={s:nextState(b.dataset.k),moved:false,first:b.dataset.k};
});
$("grid").addEventListener("pointerover",e=>{
  if(!drag)return;const b=e.target.closest(".day");if(!b||b.disabled||!b.dataset.k)return;
  if(!drag.moved){drag.moved=true;setDay(drag.first,drag.s)}
  setDay(b.dataset.k,drag.s);
  for(const el of $("grid").querySelectorAll(".day")){const k=el.dataset.k;if(!k)continue;el.classList.toggle("mine",my[k]?.s==="y");el.classList.toggle("maybe",my[k]?.s==="m")}
});
addEventListener("pointerup",()=>{if(drag){if(drag.moved){ignoreClick=true;selDay=null;render();queueSave(0)}drag=null}});
// กดชื่อวันเพื่อเลือกทั้งคอลัมน์
$("dows").innerHTML=TH_DOW.map((d,i)=>`<button type="button" class="dow" data-w="${i}" title="เลือกทุกวัน${TH_DOW_L[i]}ในเดือนนี้">${d}</button>`).join("");
function toggleWeekdays(ws){
  if(!needEdit())return;
  const ks=[];const days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  for(let d=1;d<=days;d++){const dt=new Date(view.getFullYear(),view.getMonth(),d),k=key(dt);if(ws.includes(dt.getDay())&&inRange(k))ks.push(k)}
  if(!ks.length)return;
  const allOn=ks.every(k=>my[k]?.s==="y");
  for(const k of ks)setDay(k,allOn?null:"y");
  render();queueSave(0);
}
$("dows").addEventListener("click",e=>{const b=e.target.closest(".dow");if(b&&!planMode)toggleWeekdays([+b.dataset.w])});
$("qweekend").onclick=()=>toggleWeekdays([0,6]);
$("qrange").onclick=()=>{if(!needEdit())return;rangeMode=!rangeMode;anchor=null;render()};
twoTap($("qclear"),"ล้างเดือนนี้","กดอีกครั้งเพื่อล้าง",async()=>{
  if(!needEdit())return;
  for(const k of Object.keys(my)){const d=fromKey(k);if(d.getFullYear()===view.getFullYear()&&d.getMonth()===view.getMonth())delete my[k]}
  selDay=null;render();queueSave(0);
});
$("prev").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render()};
$("next").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render()};
$("myname").addEventListener("input",e=>{myName=e.target.value.trim();try{localStorage.setItem("ffd-name",myName)}catch(_){}render();queueSave(600);heartbeat()});
$("mynote").addEventListener("input",e=>{myNote=e.target.value.trim().slice(0,80);render();queueSave(800)});

// ===== แชร์ =====
async function copyText(t,btn,label){
  try{await navigator.clipboard.writeText(t);btn.textContent="คัดลอกแล้ว"}catch(e){window.prompt("คัดลอกลิงก์นี้",t)}
  setTimeout(()=>btn.textContent=label,2000);
}
if(!home){
  const url=linkFor(eventId);
  $("copy").onclick=()=>copyText(url,$("copy"),"คัดลอกลิงก์");
  $("lineshare").href=lineUrl(niceName(eventId),url);
  let qrMade=false;
  $("qrbtn").onclick=()=>{
    const box=$("qrbox");box.hidden=!box.hidden;
    if(!box.hidden&&!qrMade){
      if(window.QRCode){new QRCode($("qr"),{text:url,width:180,height:180,correctLevel:QRCode.CorrectLevel.M});qrMade=true}
      else $("qr").textContent="โหลดตัวสร้าง QR ไม่ได้";
    }
  };
}

// ===== บันทึก =====
function queueSave(delay){
  if(!ready||!myId||!canEdit())return;
  if(!myName){setStatus("ใส่ชื่อก่อน แล้วระบบจะบันทึกให้อัตโนมัติ",true);return}
  setStatus("กำลังบันทึก…");
  clearTimeout(saveTimer);saveTimer=setTimeout(save,delay);
}
async function save(){
  if(saving){pending=true;return}
  saving=true;
  const ref=doc(fs,"events",eventId,"people",myId),{days,maybe}=encodeMine();
  try{
    if(!days&&!maybe&&!people[myId])setStatus("แตะวันที่ว่างได้เลย");
    else{await setDoc(ref,{name:myName.slice(0,40),note:myNote,days,maybe,hasPin:people[myId]?.hasPin===true,updatedAt:serverTimestamp()});setStatus("บันทึกแล้ว เพื่อนเห็นทันที")}
  }catch(e){console.error(e);setStatus("บันทึกไม่สำเร็จ ("+(e.code||"error")+") ลองใหม่อีกครั้ง",true)}
  saving=false;if(pending){pending=false;save()}
}

// ===== ยืนยันวัน =====
function parseDays(txt){
  const out=new Set(),last=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  for(const part of txt.replace(/[–—~]/g,"-").split(/[,\s]+/)){
    const m=part.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);if(!m)continue;
    let a=+m[1],b=m[2]?+m[2]:a;if(a>b)[a,b]=[b,a];
    for(let d=Math.max(1,a);d<=Math.min(last,b);d++){const dt=new Date(view.getFullYear(),view.getMonth(),d);if(dt>=today)out.add(key(dt))}
  }
  return out;
}
function renderPlan(all){
  const cc=isEvAdmin();
  $("planpanel").hidden=!(cc||confirmed.length);
  $("plantoggle").hidden=!cc;
  if(!cc&&planMode)planMode=false;
  const showing=planMode&&plan.size?[...plan].sort():(!planMode&&confirmed.length?confirmed:[]);
  $("plantoggle").textContent=planMode?"เสร็จ":"เลือกวันที่จะนัด";
  document.body.classList.toggle("planning",planMode);
  $("plantools").hidden=!planMode;
  $("planhint").textContent=planMode?"แตะวันในปฏิทินเพื่อเลือก/เอาออก หรือพิมพ์วันของเดือนที่แสดงอยู่":(confirmed.length?"คนที่มาได้ในวันที่ยืนยันแล้ว":"กดปุ่มแล้วแตะวันในปฏิทิน ดูว่าใครมาได้ ใครไม่ว่างวันไหน");
  $("confbanner").hidden=!confirmed.length;
  $("sumwrap").hidden=!showing.length;
  const sum=$("summary");sum.innerHTML="";
  if(showing.length){
    $("plandates").textContent=fmtDates(showing)+" ("+showing.length+" วัน)";
    const full=[],part=[],none=[];
    for(const id of Object.keys(all)){
      const m=all[id].map||{},name=(all[id].name||"ไม่ระบุชื่อ")+(id===myId?" (เรา)":"");
      const miss=showing.filter(d=>m[d]?.s!=="y"),maybe=showing.filter(d=>m[d]?.s==="m");
      if(!miss.length)full.push({name});else if(miss.length===showing.length&&!maybe.length)none.push({name});else part.push({name,miss,maybe});
    }
    const block=(cls,title,list,withMiss)=>{
      const div=document.createElement("div");div.className=cls;
      const h=document.createElement("h3");h.innerHTML=`<span></span><span class="n"></span>`;
      h.children[0].textContent=title;h.children[1].textContent=list.length+" คน";
      const ul=document.createElement("ul");
      for(const p of list){
        const li=document.createElement("li");li.textContent=p.name;
        if(withMiss){
          const no=p.miss.filter(d=>!p.maybe.includes(d)),sp=document.createElement("span");sp.className="miss";
          sp.textContent=(no.length?" ไม่ว่าง "+fmtDates(no):"")+(p.maybe.length?" อาจจะ "+fmtDates(p.maybe):"");li.appendChild(sp);
        }
        ul.appendChild(li);
      }
      div.append(h,ul);sum.appendChild(div);
    };
    block("full","มาได้ทุกวัน",full,false);
    if(part.length)block("part","ว่างบางวัน / อาจจะ",part,true);
    if(none.length)block("none","ไม่ว่างเลย",none,false);
  }
  if(confirmed.length){
    $("confwhen").textContent=fmtDates(confirmed)+(ev.time?" เวลา "+ev.time:"");
    let n=0;for(const id of Object.keys(all)){const m=all[id].map||{};if(confirmed.every(d=>m[d]?.s==="y"))n++}
    $("confcount").textContent="มาได้ครบทุกวัน "+n+" จาก "+Object.keys(all).length+" คน"+(ev.place?" · "+ev.place:"");
    renderExport();
  }
  $("confactions").hidden=!(cc&&((planMode&&plan.size)||confirmed.length));
  $("confirmbtn").hidden=!(planMode&&plan.size);
  $("unconfirmbtn").hidden=!confirmed.length;
}
// ปุ่มเพิ่มลงปฏิทิน
let exportKey="";
function renderExport(){
  const k=confirmed.join()+"|"+(ev.title||"")+"|"+(ev.place||"")+"|"+(ev.desc||"");
  if(k===exportKey)return;exportKey=k;
  const box=$("calexport");box.innerHTML="";
  const title=ev.title||niceName(eventId),url=linkFor(eventId),runs=runsOf(confirmed);
  const ymd=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
  runs.forEach(([a,b],i)=>{
    const end=new Date(b);end.setDate(end.getDate()+1);
    const g="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(title)+"&dates="+ymd(a)+"/"+ymd(end)+"&details="+encodeURIComponent((ev.time?"เวลา "+ev.time+"\n":"")+(ev.desc?ev.desc+"\n":"")+url)+(ev.place?"&location="+encodeURIComponent(ev.place):"");
    const l=document.createElement("a");l.href=g;l.target="_blank";l.rel="noopener";l.textContent="เพิ่มลง Google Calendar"+(runs.length>1?" ("+fmtDates(confirmed.filter(x=>x>=key(a)&&x<=key(b)))+")":"");box.appendChild(l);
  });
  const ics=document.createElement("button");ics.type="button";ics.textContent="ดาวน์โหลด .ics (iPhone / Outlook)";
  ics.onclick=()=>{
    const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
    const escI=t=>String(t).replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//free-days//TH","CALSCALE:GREGORIAN"];
    runs.forEach(([a,b],i)=>{const end=new Date(b);end.setDate(end.getDate()+1);
      lines.push("BEGIN:VEVENT","UID:"+encodeURIComponent(eventId)+"-"+i+"@free-days","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:"+ymd(a),"DTEND;VALUE=DATE:"+ymd(end),"SUMMARY:"+escI(title),
        "DESCRIPTION:"+escI((ev.time?"เวลา "+ev.time+"\n":"")+(ev.desc?ev.desc+"\n":"")+url),...(ev.place?["LOCATION:"+escI(ev.place)]:[]),"END:VEVENT")});
    lines.push("END:VCALENDAR");
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=(eventId||"event")+".ics";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  };
  box.appendChild(ics);
}
$("plantoggle").onclick=()=>{planMode=!planMode;if(planMode&&!plan.size&&confirmed.length)plan=new Set(confirmed);rangeMode=false;anchor=null;$("confmsg").textContent="";render()};
$("planapply").onclick=()=>{const got=parseDays($("planinput").value);if(got.size){plan=got;render()}else $("planhint").textContent="อ่านวันที่ไม่ออก ลองพิมพ์แบบ 10-13 หรือ 10,12,15"};
$("planinput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("planapply").click()}});
$("planclear").onclick=()=>{plan.clear();$("planinput").value="";render()};
async function writeEvent(data,msgEl,okText){
  msgEl.textContent="กำลังบันทึก…";
  try{await updateDoc(doc(fs,"events",eventId),data);msgEl.textContent=okText;return true}
  catch(e){console.error(e);msgEl.textContent="บันทึกไม่สำเร็จ ("+(e.code||"error")+")";return false}
}
$("confirmbtn").onclick=async()=>{const list=[...plan].filter(d=>d>=todayKey).sort().slice(0,60);if(list.length&&await writeEvent({confirmed:list},$("confmsg"),"ยืนยันแล้ว ทุกคนเห็นทันที")){planMode=false;plan.clear();render()}};
twoTap($("unconfirmbtn"),"ยกเลิกการยืนยัน","กดอีกครั้งเพื่อยกเลิก",()=>writeEvent({confirmed:[]},$("confmsg"),"ยกเลิกการยืนยันแล้ว"));

// ===== แอดมินนัด =====
async function codeHash(evId,code){return Bytes.fromUint8Array(await sha256bytes(evId+":"+code))}
let infoFilled=false;
function renderAdmin(){
  if(home||!eventExists){$("adminbox").hidden=true;return}
  $("adminbox").hidden=false;
  const admin=isEvAdmin(),ownerNoCode=isEventOwner&&!hasCode;
  $("codeform").hidden=admin&&!ownerNoCode;
  $("infobox").hidden=!admin;
  if(admin&&!infoFilled){infoFilled=true;
    $("f-title").value=ev.title||niceName(eventId);$("f-place").value=ev.place||"";$("f-time").value=ev.time||"";$("f-desc").value=ev.desc||"";
    $("f-start").value=ev.rangeStart||"";$("f-end").value=ev.rangeEnd||"";$("f-deadline").value=ev.deadline||"";
    $("f-expected").value=(ev.expected||[]).join(", ");
  }
  if(ownerNoCode){$("codelabel").textContent="ตั้งรหัสแอดมิน";$("codebtn").textContent="ตั้งรหัส";$("adminstatus").textContent="นัดนี้ยังไม่มีรหัสแอดมิน ตั้งไว้หน่อย เผื่อเปลี่ยนเครื่อง"}
  else if(admin)$("adminstatus").textContent="เราเป็นแอดมินนัดนี้ ยืนยันวัน แก้รายละเอียด ลบชื่อได้";
  else{$("codelabel").textContent="รหัสแอดมิน";$("codebtn").textContent="เข้าโหมดแอดมิน";if(!$("adminstatus").classList.contains("err"))$("adminstatus").textContent="มีรหัสแอดมินก็ใส่ตรงนี้ จะยืนยันวันกับลบชื่อได้"}
  $("ownernote").hidden=!admin;$("ownernote").textContent="เราเป็นแอดมินนัดนี้";
}
$("codeform").addEventListener("submit",async e=>{
  e.preventDefault();
  const code=$("admincode").value,st=$("adminstatus");st.classList.remove("err");
  if(code.length<4){st.textContent="รหัสต้องมีอย่างน้อย 4 ตัว";st.classList.add("err");return}
  if(!ready){st.textContent="ยังเชื่อมต่อไม่เสร็จ รอสักครู่";st.classList.add("err");return}
  $("codebtn").disabled=true;
  try{
    if(isEventOwner&&!hasCode){
      const b=writeBatch(fs);
      b.set(doc(fs,"events",eventId,"secret","admin"),{hash:await codeHash(eventId,code),code});
      b.update(doc(fs,"events",eventId),{hasCode:true});
      await b.commit();st.textContent="ตั้งรหัสแล้ว";
    }else{await setDoc(doc(fs,"events",eventId,"admins",myId),{code,at:serverTimestamp()});st.textContent="เข้าโหมดแอดมินแล้ว"}
    $("admincode").value="";
  }catch(err){console.error(err);st.textContent=err.code==="permission-denied"?"รหัสไม่ถูกต้อง":"ทำไม่สำเร็จ ("+(err.code||"error")+")";st.classList.add("err")}
  $("codebtn").disabled=false;
});
const okDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:"";
$("infoform").addEventListener("submit",async e=>{
  e.preventDefault();
  const expected=[...new Set($("f-expected").value.split(/[,\n]/).map(s=>s.trim().slice(0,40)).filter(Boolean))].slice(0,100);
  let rs=okDate($("f-start").value),re=okDate($("f-end").value);if(rs&&re&&rs>re)[rs,re]=[re,rs];
  const data={title:$("f-title").value.trim().slice(0,60),place:$("f-place").value.trim().slice(0,80),time:$("f-time").value.trim().slice(0,40),
    desc:$("f-desc").value.trim().slice(0,300),rangeStart:rs,rangeEnd:re,deadline:okDate($("f-deadline").value),expected};
  if(await writeEvent(data,$("infomsg"),"บันทึกแล้ว")&&rs){const d=fromKey(rs);if(d>today)view=new Date(d.getFullYear(),d.getMonth(),1);render()}
});
async function deleteEvent(id){
  const refs=[];
  for(const sub of ["people","admins","presence"]){try{(await getDocs(collection(fs,"events",id,sub))).forEach(d=>{refs.push(d.ref);if(sub==="people")refs.push(doc(fs,"events",id,"pins",d.id))})}catch(e){console.warn(sub,e.code)}}
  refs.push(doc(fs,"events",id,"secret","admin"),doc(fs,"events",id));
  for(let i=0;i<refs.length;i+=450){const b=writeBatch(fs);refs.slice(i,i+450).forEach(r=>b.delete(r));await b.commit()}
}
twoTap($("delevent"),"ลบนัดนี้ทั้งนัด","กดอีกครั้งเพื่อลบถาวร",async()=>{
  $("infomsg").textContent="กำลังลบ…";
  try{await deleteEvent(eventId);location.href=baseUrl}catch(e){console.error(e);$("infomsg").textContent="ลบไม่สำเร็จ ("+(e.code||"error")+")"}
});

// ===== PIN / ใช้หลายเครื่อง =====
const pinHash=async(uid,pin)=>Bytes.fromUint8Array(await sha256bytes(eventId+":"+uid+":"+pin));
$("pinform").addEventListener("submit",async e=>{
  e.preventDefault();const pin=$("mypin").value,msg=$("pinmsg");
  if(!myName||!people[myId]){msg.textContent="ใส่ชื่อและเลือกวันอย่างน้อย 1 วันก่อน";return}
  if(pin.length<4){msg.textContent="PIN ต้องมีอย่างน้อย 4 ตัว";return}
  try{const b=writeBatch(fs);b.set(doc(fs,"events",eventId,"pins",myId),{hash:await pinHash(myId,pin)});b.update(doc(fs,"events",eventId,"people",myId),{hasPin:true});await b.commit();
    $("mypin").value="";msg.textContent="ตั้ง PIN แล้ว เครื่องอื่นเลือกชื่อนี้แล้วใส่ PIN ได้"}
  catch(err){console.error(err);msg.textContent="ตั้ง PIN ไม่สำเร็จ ("+(err.code||"error")+")"}
});
$("recoverform").addEventListener("submit",async e=>{
  e.preventDefault();const from=$("recname").value,pin=$("recpin").value,msg=$("pinmsg");
  if(!from||!pin){msg.textContent="เลือกชื่อและใส่ PIN";return}
  const old=people[from];if(!old)return;
  try{
    await setDoc(doc(fs,"events",eventId,"claims",myId),{from,pin});
    const src=await getDoc(doc(fs,"events",eventId,"people",from)),d=src.data()||{};
    const b=writeBatch(fs);
    b.set(doc(fs,"events",eventId,"people",myId),{name:String(d.name||old.name).slice(0,40),note:String(d.note||""),days:String(d.days||""),maybe:String(d.maybe||""),hasPin:true,updatedAt:serverTimestamp()});
    b.set(doc(fs,"events",eventId,"pins",myId),{hash:await pinHash(myId,pin)});
    b.delete(doc(fs,"events",eventId,"people",from));b.delete(doc(fs,"events",eventId,"pins",from));
    await b.commit();
    await deleteDoc(doc(fs,"events",eventId,"claims",myId));
    const p=parsePerson(d);my=p.map;myName=p.name;myNote=p.note;$("myname").value=myName;$("mynote").value=myNote;try{localStorage.setItem("ffd-name",myName)}catch(_){}
    $("recpin").value="";msg.textContent="กลับมาเป็น "+myName+" แล้ว";render();
  }catch(err){console.error(err);msg.textContent=err.code==="permission-denied"?"PIN ไม่ถูกต้อง":"ทำไม่สำเร็จ ("+(err.code||"error")+")";try{await deleteDoc(doc(fs,"events",eventId,"claims",myId))}catch(_){}}
});
twoTap($("removeme"),"ลบชื่อฉันออกจากนัดนี้","กดอีกครั้งเพื่อลบ",async()=>{
  try{const b=writeBatch(fs);b.delete(doc(fs,"events",eventId,"people",myId));b.delete(doc(fs,"events",eventId,"pins",myId));await b.commit();my={};selDay=null;$("pinmsg").textContent="ลบชื่อแล้ว";render()}
  catch(err){$("pinmsg").textContent="ลบไม่สำเร็จ ("+(err.code||"error")+")"}
});

// ===== ออนไลน์ (realtime) =====
const isOnline=p=>p&&p.at&&Date.now()-p.at<75000;
function renderLive(){
  const live=$("live");if(home){live.hidden=true;return}
  live.hidden=false;
  const on=Object.entries(presence).filter(([,p])=>isOnline(p));
  live.classList.toggle("off",!ready);
  $("livetext").textContent=!ready?"กำลังเชื่อมต่อ…":"อัปเดตสด · ออนไลน์ "+on.length+" คน"+(on.length?": "+on.map(([id,p])=>(id===myId?"เรา":p.name||"ไม่ระบุชื่อ")).join(", "):"");
}
let hbTimer=null;
async function heartbeat(){
  if(home||!ready||!myId||document.hidden)return;
  try{await setDoc(doc(fs,"events",eventId,"presence",myId),{name:(myName||"").slice(0,40),at:serverTimestamp()})}catch(e){}
}
setInterval(()=>{if(!home&&ready)renderLive()},15000);

// ===== เริ่ม Firebase =====
render();
const app=initializeApp(firebaseConfig);
if(APPCHECK_SITE_KEY){
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js").then(m=>m.initializeAppCheck(app,{provider:new m.ReCaptchaV3Provider(APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})).catch(e=>console.warn("App Check",e));
}
auth=getAuth(app);
fs=(()=>{try{return initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch(e){return initializeFirestore(app,{})}})();
const timer=setTimeout(()=>{if(!loaded){const n=$("notice");n.hidden=false;n.textContent="ยังเชื่อมต่อฐานข้อมูลไม่ได้ เช็กอินเทอร์เน็ต แล้วลองรีเฟรช"}},10000);
const checkOwner=async u=>{ownerOk=!!u&&!u.isAnonymous&&u.emailVerified&&(await sha256hex((u.email||"").toLowerCase()))===OWNER_HASH;return ownerOk};

// --- หน้าหลัก: สร้างนัด ---
function showLink(evId){const url=linkFor(evId);$("evlink").value=url;$("evopen").href=url;$("evline").href=lineUrl(niceName(evId),url);$("linkout").hidden=false}
$("evform").addEventListener("submit",async e=>{
  e.preventDefault();
  const evId=cleanEvent($("evname").value),code=$("evcode").value,msg=$("evmsg");msg.classList.remove("err");msg.textContent="";
  if(!evId){msg.textContent="ใส่ชื่อนัดก่อนนะ";msg.classList.add("err");$("evname").focus();return}
  if(!ready){msg.textContent="ยังเชื่อมต่อไม่เสร็จ รอสักครู่แล้วกดอีกครั้ง";msg.classList.add("err");return}
  $("evsubmit").disabled=true;
  try{
    const evRef=doc(fs,"events",evId),snap=await getDoc(evRef);
    if(snap.exists()&&snap.data().owner!==myId){msg.textContent="ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นดู (ลิงก์ข้างล่างคือนัดเดิม)";msg.classList.add("err")}
    else{
      if(!snap.exists()){
        if(code.length<4){msg.textContent="รหัสแอดมินต้องมีอย่างน้อย 4 ตัว";msg.classList.add("err");$("evcode").focus();$("evsubmit").disabled=false;return}
        const b=writeBatch(fs);
        b.set(evRef,{owner:myId,name:evId,hasCode:true,createdAt:serverTimestamp()});
        b.set(doc(fs,"events",evId,"secret","admin"),{hash:await codeHash(evId,code),code});
        await b.commit();$("evcode").value="";
      }
      msg.textContent="ได้ลิงก์แล้ว ส่งเข้ากลุ่มได้เลย";remember(evId,niceName(evId),true);
    }
    showLink(evId);
  }catch(err){console.error(err);msg.textContent="สร้างนัดไม่สำเร็จ ("+(err.code||"error")+") ลองใหม่อีกครั้ง";msg.classList.add("err")}
  $("evsubmit").disabled=false;
});
$("evcopy").onclick=()=>copyText($("evlink").value,$("evcopy"),"คัดลอกลิงก์");
$("evcode-toggle").onclick=()=>{const i=$("evcode"),b=$("evcode-toggle"),show=i.type==="password";i.type=show?"text":"password";b.textContent=show?"ซ่อน":"แสดง";b.setAttribute("aria-pressed",String(show));b.setAttribute("aria-label",show?"ซ่อนรหัส":"แสดงรหัส");i.focus()};
if(home&&(params.has("admin")))$("ownerloginrow").hidden=false;

// --- หน้าหลัก: เจ้าของเว็บ ---
$("ownerlogin").onclick=async()=>{
  const st=$("ownerstatus");st.textContent="";st.classList.remove("err");
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});
  try{
    const r=await signInWithPopup(auth,provider);
    if(!(await checkOwner(r.user))){await signOut(auth);st.textContent="บัญชีนี้ไม่ใช่เจ้าของเว็บ";st.classList.add("err");setTimeout(()=>location.reload(),1500);return}
    location.reload();
  }catch(e){
    if(e.code==="auth/operation-not-allowed")st.textContent="ยังไม่ได้เปิด Google sign-in ใน Firebase Authentication";
    else if(e.code!=="auth/popup-closed-by-user"&&e.code!=="auth/cancelled-popup-request")st.textContent="เข้าสู่ระบบไม่ได้ ("+e.code+")";
    st.classList.add("err");
  }
};
$("signout").onclick=async()=>{
  const b=$("signout");
  if(!b.classList.contains("confirm")){b.classList.add("confirm");b.textContent="ยืนยัน ล้างเลย";$("signouthelp").hidden=false;setTimeout(()=>{b.classList.remove("confirm");b.textContent="ล้างข้อมูลในเครื่องนี้";$("signouthelp").hidden=true},5000);return}
  try{for(const k of Object.keys(localStorage))if(k.startsWith("ffd-"))localStorage.removeItem(k)}catch(e){}
  try{await signOut(auth)}catch(e){}
  location.reload();
};
// นัดที่เคยเปิด/สร้างในเครื่องนี้
function localEvents(){try{return JSON.parse(localStorage.getItem("ffd-events")||"[]").filter(x=>x&&x.id)}catch(e){return []}}
function remember(id,title,mine){
  try{const l=localEvents().filter(x=>x.id!==id);l.unshift({id,title:title||niceName(id),mine:!!mine||!!localEvents().find(x=>x.id===id&&x.mine),at:Date.now()});localStorage.setItem("ffd-events",JSON.stringify(l.slice(0,30)))}catch(e){}
}
function forget(id){try{localStorage.setItem("ffd-events",JSON.stringify(localEvents().filter(x=>x.id!==id)))}catch(e){}}
// เจ้าของเว็บเห็นทุกนัด คนทั่วไปเห็นนัดที่ตัวเองสร้าง + เคยเปิดในเครื่องนี้
function loadMyEvents(){
  const owned={};let ownedReady=false;const details={};
  const draw=()=>{
    const ids=new Set([...Object.keys(owned),...localEvents().map(x=>x.id)]);
    const evs=[...ids].map(id=>{const loc=localEvents().find(x=>x.id===id)||{};const d=owned[id]||details[id];return d===null?null:{id,...(d||{}),_mine:!!owned[id]||loc.mine,_at:loc.at||0,_title:loc.title}}).filter(Boolean)
      .sort((a,b)=>((b.createdAt?.seconds||0)*1000||b._at)-((a.createdAt?.seconds||0)*1000||a._at));
    renderEventList(evs,false);
  };
  onSnapshot(query(collection(fs,"events"),where("owner","==",myId)),snap=>{
    for(const k of Object.keys(owned))delete owned[k];
    snap.forEach(d=>{owned[d.id]=d.data()});ownedReady=true;draw();
  },e=>{console.error(e);ownedReady=true;draw()});
  for(const x of localEvents())getDoc(doc(fs,"events",x.id)).then(s=>{if(s.exists())details[x.id]=s.data();else{details[x.id]=null;forget(x.id)}draw()}).catch(()=>{});
}
function loadEvents(){
  onSnapshot(collection(fs,"events"),snap=>{
    renderEventList(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)),true);
  },e=>{console.error(e)});
}
function renderEventList(evs,ownerMode){
  const ul=$("evlist");
  $("ownerview").hidden=!evs.length;
  $("mylist-h").firstChild.textContent=ownerMode?"นัดทั้งหมด ":"นัดของฉัน ";
  $("evcount").textContent="("+evs.length+")";
  ul.innerHTML="";
  for(const e of evs){
      const li=document.createElement("li"),left=document.createElement("span");left.className="nm";
      const a=document.createElement("a");a.href=linkFor(e.id);a.textContent=e.title||e._title||niceName(e.name||e.id);
      const meta=document.createElement("span");meta.className="meta";
      const created=e.createdAt?.toDate?e.createdAt.toDate():null;
      const seen=!created&&e._at?new Date(e._at):null;
      meta.textContent=(created?(ownerMode||!e._mine?"สร้าง ":"เราสร้าง ")+created.getDate()+" "+TH_MON_S[created.getMonth()]+" "+(created.getFullYear()+543):seen?"เปิดล่าสุด "+seen.getDate()+" "+TH_MON_S[seen.getMonth()]:"")+(ownerMode&&!e.hasCode?" (ไม่มีรหัสแอดมิน)":"")+(e.deadline?" · ปิดรับ "+fmtDay(e.deadline):"");
      left.append(a,meta);
      if(Array.isArray(e.confirmed)&&e.confirmed.length){const c=document.createElement("span");c.className="meta ok";c.textContent="ยืนยันแล้ว "+fmtDates(e.confirmed);left.appendChild(c)}
      const right=document.createElement("span");right.className="right";
      const ct=document.createElement("span");ct.className="ct";ct.textContent="… คน";right.appendChild(ct);
      getDocs(collection(fs,"events",e.id,"people")).then(ps=>{ct.textContent=ps.size+" คน"}).catch(()=>{ct.textContent=""});
      if(ownerMode){
      const del=document.createElement("button");del.className="rm";del.type="button";del.textContent="ลบนัด";
      twoTap(del,"ลบนัด","ยืนยันลบทั้งนัด",async()=>{del.disabled=true;del.textContent="กำลังลบ…";try{await deleteEvent(e.id)}catch(err){console.error(err);del.disabled=false;del.textContent="ลบไม่สำเร็จ"}});
      right.appendChild(del);
      // รหัสแอดมิน
      const codeRow=document.createElement("span");codeRow.className="meta coderow";
      const show=document.createElement("button");show.type="button";show.className="rm";show.textContent="ดูรหัส";
      const codeTxt=document.createElement("span");codeTxt.className="codetxt";
      const edit=document.createElement("button");edit.type="button";edit.className="rm";edit.textContent="ตั้งรหัสใหม่";
      const form=document.createElement("form");form.className="codeedit";form.hidden=true;
      form.innerHTML=`<input type="text" minlength="4" maxlength="64" placeholder="รหัสใหม่ อย่างน้อย 4 ตัว" aria-label="รหัสแอดมินใหม่"><button class="rm" type="submit">บันทึก</button>`;
      show.onclick=async()=>{
        if(codeTxt.textContent){codeTxt.textContent="";show.textContent="ดูรหัส";return}
        show.disabled=true;
        try{
          const sec=await getDoc(doc(fs,"events",e.id,"secret","admin"));let code=sec.exists()?sec.data().code:"";
          if(!code){const ad=await getDocs(collection(fs,"events",e.id,"admins"));ad.forEach(d=>{if(!code&&d.data().code)code=d.data().code})}
          codeTxt.textContent=code?("รหัส: "+code):"ยังไม่มีรหัสที่อ่านได้ กดตั้งรหัสใหม่";show.textContent="ซ่อน";
        }catch(err){console.error(err);codeTxt.textContent="อ่านรหัสไม่ได้ ("+(err.code||"error")+")"}
        show.disabled=false;
      };
      edit.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)form.querySelector("input").focus()};
      form.onsubmit=async x=>{
        x.preventDefault();const v=form.querySelector("input").value;
        if(v.length<4){codeTxt.textContent="รหัสต้องมีอย่างน้อย 4 ตัว";return}
        try{const b=writeBatch(fs);b.set(doc(fs,"events",e.id,"secret","admin"),{hash:await codeHash(e.id,v),code:v});if(!e.hasCode)b.update(doc(fs,"events",e.id),{hasCode:true});await b.commit();
          form.hidden=true;form.querySelector("input").value="";codeTxt.textContent="รหัส: "+v;show.textContent="ซ่อน"}
        catch(err){console.error(err);codeTxt.textContent="บันทึกไม่ได้ ("+(err.code||"error")+")"}
      };
      codeRow.append(show,edit,codeTxt);left.append(codeRow,form);
      }
      li.append(left,right);ul.appendChild(li);
  }
}

// --- เข้าระบบ + subscribe ---
onAuthStateChanged(auth,async user=>{
  if(!user){signInAnonymously(auth).catch(e=>{console.error(e);setStatus("เข้าระบบไม่ได้ ("+e.code+")",true)});return}
  if(myId)return;
  myId=user.uid;
  if(await checkOwner(user))isAdmin=true;
  if(home){
    ready=true;loaded=true;clearTimeout(timer);
    if(ownerOk){loadEvents();$("ownerloginrow").hidden=true}else loadMyEvents();
    return;
  }
  onSnapshot(doc(fs,"events",eventId),s=>{
    eventExists=s.exists();ev=eventExists?s.data():{};
    isEventOwner=eventExists&&ev.owner===user.uid;hasCode=ev.hasCode===true;
    confirmed=Array.isArray(ev.confirmed)?ev.confirmed.filter(x=>typeof x==="string").sort():[];
    if(eventExists)remember(eventId,ev.title||niceName(eventId),isEventOwner);
    if(ev.rangeStart&&!render.jumped){render.jumped=true;const d=fromKey(ev.rangeStart);if(d>today)view=new Date(d.getFullYear(),d.getMonth(),1)}
    render();
  },()=>{});
  onSnapshot(doc(fs,"events",eventId,"admins",user.uid),a=>{isCodeAdmin=a.exists();render()},()=>{});
  onSnapshot(doc(fs,"admins",user.uid),a=>{isAdmin=a.exists()||ownerOk;render()},()=>{});
  onSnapshot(collection(fs,"events",eventId,"presence"),snap=>{
    const next={};snap.forEach(d=>{const x=d.data();next[d.id]={name:x.name||"",at:x.at?.toMillis?x.at.toMillis():Date.now()}});presence=next;renderLive();
  },()=>{});
  ready=true;
  setStatus(myName?"พร้อมแล้ว แตะวันที่ว่างได้เลย":"ใส่ชื่อ แล้วแตะวันที่ว่าง");
  heartbeat();hbTimer=setInterval(heartbeat,30000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)heartbeat()});
  let first=true;
  onSnapshot(collection(fs,"events",eventId,"people"),snap=>{
    const next={};snap.forEach(d=>{next[d.id]=parsePerson(d.data())});
    // ไฮไลต์วันที่คนอื่นเพิ่งเปลี่ยน
    if(!first)for(const ch of snap.docChanges()){
      if(ch.doc.id===myId||ch.doc.metadata.hasPendingWrites)continue;
      const before=people[ch.doc.id]?.map||{},after=next[ch.doc.id]?.map||{};
      for(const k of new Set([...Object.keys(before),...Object.keys(after)]))if(before[k]?.s!==after[k]?.s||before[k]?.slots!==after[k]?.slots)flashUntil[k]=Date.now()+1400;
    }
    people=next;
    if(first&&people[myId]){
      my={...people[myId].map};myNote=people[myId].note;$("mynote").value=myNote;
      if(!$("myname").value&&people[myId].name){myName=people[myId].name;$("myname").value=myName}
    }
    first=false;loaded=true;clearTimeout(timer);$("notice").hidden=true;render();
    setTimeout(()=>{if(Object.values(flashUntil).some(t=>t<=Date.now()))render()},1500);
  },err=>{console.error(err);loaded=true;clearTimeout(timer);const n=$("notice");n.hidden=false;n.textContent="โหลดข้อมูลไม่ได้ ("+err.code+")";render()});
});
