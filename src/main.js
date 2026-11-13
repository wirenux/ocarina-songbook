import './style.css';
import { inject } from '@vercel/analytics';

inject();

const NN=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const nm=p=>NN[p%12]+(Math.floor(p/12)-1);
const NB=[62,65,69,71,74];
const LAY={'sw2':['L','R','A','Y','X'],'3ds':['L','R','Y','X','A'],'sw2c':['R','B','A','Y','X']};
const POS={L:[48,22],R:[252,22],X:[225,62],Y:[190,100],A:[260,100],B:[225,138]};
const mk=(oct,dp)=>{const T={},md=[[0,0]];if(dp)md.push([1,0],[-1,0]);if(oct)md.push([0,12],[0,-12]);if(dp&&oct)md.push([1,12],[1,-12],[-1,12],[-1,-12]);
md.forEach(([m,o])=>NB.forEach((b,i)=>{const p=b+m+o;if(!T[p])T[p]={i,m,o:o/12}}));return T};
const P3=mk(false,true),PS=mk(true,true),P3n=mk(false,false),PSn=mk(true,false);
const nd=()=>$('nodp').checked;
const PM=()=>$('lay').value==='3ds'?(nd()?P3n:P3):(nd()?PSn:PS);
const rng=()=>$('lay').value==='3ds'?(nd()?[62,74]:[61,75]):(nd()?[50,86]:[49,87]);
const fold=p=>{const[l,h]=rng();while(p<l)p+=12;while(p>h)p-=12;return p};
const dist=(p,T)=>{for(let d=0;d<6;d++)if(T[p-d]||T[p+d])return d;return 6};
const snap=p=>{const T=PM();for(let d=0;d<6;d++){if(T[p-d])return p-d;if(T[p+d])return p+d}return p};
const LIB=[
['We Wish You a Merry Christmas','Traditional',120,'D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1 B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:2'],]

// Automatically discovered MIDI songs
const MIDI_LIB = [];

const TRACK_SETTINGS = {
  "Zelda's Lullaby.mid": 1,
  "Mario NES.mid": 0,
  "Borderline - Tame Impala.mid": 5,
  "Instant Crush - Daft Punk.mid": 1,
  "Young Girl A - siinamota.mid": 2,
  "The Amazing Digital Circus Theme.mid": 1,
};

const MIDI_CACHE_DB = 'ocarina-songbook';
const MIDI_CACHE_STORE = 'midi-files';

function openMidiCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MIDI_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(MIDI_CACHE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readMidiCache(db, filename) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(MIDI_CACHE_STORE, 'readonly')
      .objectStore(MIDI_CACHE_STORE)
      .get(filename);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeMidiCache(db, filename, tracks) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(MIDI_CACHE_STORE, 'readwrite')
      .objectStore(MIDI_CACHE_STORE)
      .put(tracks, filename);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

async function loadFolderSongs() {
  let cache;

  try {
    const response = await fetch('/songs/manifest.json');
    if (!response.ok) throw new Error('MIDI manifest not found');

    const files = await response.json();

    try {
      cache = await openMidiCache();
    } catch (err) {
      console.warn('Could not open MIDI cache; loading files normally:', err);
    }

    for (const file of files) {
      try {
        let parsed = cache && await readMidiCache(cache, file);

        if (!parsed) {
          const response = await fetch(
            '/songs/' + encodeURIComponent(file)
          );

          if (!response.ok) continue;

          const buffer = await response.arrayBuffer();
          parsed = parseMidi(buffer);
          if (cache) await writeMidiCache(cache, file, parsed);
        }

        if (!parsed.length) continue;

        const title = file.replace(/\.(mid|midi)$/i, '');

        MIDI_LIB.push({
          title,
          tracks: parsed,
          filename: file,
          defaultTrack: TRACK_SETTINGS[file] ?? 0,
        });

      } catch (err) {
        console.warn('Could not load MIDI:', file, err);
      }
    }

    list();

    console.log(`Loaded ${MIDI_LIB.length} MIDI songs`);

  } catch (err) {
    console.warn('Could not load MIDI library:', err);
  }
}
const BASE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function fromStr(s,bpm){let t=0;const out=[];s.split(' ').forEach(tok=>{const[n,b]=tok.split(':');const d=parseFloat(b)*60/bpm;if(n==='R'){t+=d;return}const m=n.match(/^([A-G])(#?)(\d)$/);out.push({t,d,p:(+m[3]+1)*12+BASE[m[1]]+(m[2]?1:0)});t+=d});return out}
function parseMidi(buf){
const v=new DataView(buf);let o=0;const str=n=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(v.getUint8(o+i));o+=n;return s};
if(str(4)!=='MThd')throw new Error('Not a MIDI file');
const hl=v.getUint32(o);o+=4;const nt=v.getUint16(o+2),div=v.getUint16(o+4);o+=hl;
if(div&0x8000)throw new Error('SMPTE timing is not supported');
const tempos=[{tick:0,us:500000}],tracks=[];
const vlq=()=>{let r=0,b;do{b=v.getUint8(o++);r=(r<<7)|(b&127)}while(b&128);return r};
for(let i=0;i<nt&&o<v.byteLength;i++){
if(str(4)!=='MTrk')break;const len=v.getUint32(o);o+=4;const end=o+len;
let tick=0,run=0,name='',act={},notes=[];
while(o<end){tick+=vlq();let s=v.getUint8(o);if(s<128)s=run;else{o++;if(s<0xF0)run=s}
if(s===0xFF){const ty=v.getUint8(o++),l=vlq();
if(ty===3)for(let j=0;j<l;j++)name+=String.fromCharCode(v.getUint8(o+j));
if(ty===0x51)tempos.push({tick,us:(v.getUint8(o)<<16)|(v.getUint8(o+1)<<8)|v.getUint8(o+2)});o+=l}
else if(s===0xF0||s===0xF7){o+=vlq()}
else{const ty=s>>4,ch=s&15;if(ty===0xC||ty===0xD){o++}else{const a=v.getUint8(o),c=v.getUint8(o+1);o+=2;const key=ch*128+a;
if(ty===9&&c>0)act[key]=tick;
else if(ty===8||(ty===9&&c===0)){if(act[key]!=null){notes.push({a:act[key],e:tick,p:a,ch});delete act[key]}}}}}
o=end;if(notes.length)tracks.push({name:name.trim()||'Track '+(i+1),notes,drum:notes.every(n=>n.ch===9)})}
tempos.sort((a,b)=>a.tick-b.tick);let sec=0;const seg=tempos.map((t,i)=>{if(i)sec+=(t.tick-tempos[i-1].tick)*tempos[i-1].us/1e6/div;return{tick:t.tick,sec,us:t.us}});
const ts=x=>{let s=seg[0];for(const g of seg)if(g.tick<=x)s=g;else break;return s.sec+(x-s.tick)*s.us/1e6/div};
tracks.forEach(t=>{t.notes=t.notes.filter(n=>n.ch!==9).map(n=>({t:ts(n.a),d:Math.max(.08,ts(n.e)-ts(n.a)),p:n.p}))});
return tracks.filter(t=>t.notes.length)}
function skyline(ns){const s=[...ns].sort((a,b)=>a.t-b.t||b.p-a.p),o=[];
for(const n of s){const l=o[o.length-1];if(l&&n.t-l.t<.04)continue;o.push({...n})}
o.forEach((n,i)=>{const x=o[i+1];if(x)n.d=Math.max(.08,Math.min(n.d,x.t-n.t))});return o}
function autoShift(m){const T=PM(),[lo,hi]=rng();let best=0,bs=-1;for(let s=-36;s<=36;s++){let sc=0;for(const n of m){const p=n.p+s;sc+=(p>=lo&&p<=hi&&T[p])?(T[p].o?.85:1):(.6-.12*dist(fold(p),T))}sc-=Math.abs(s)*.001;if(sc>bs){bs=sc;best=s}}return best}
const $=id=>document.getElementById(id);
let song=null,tracks=null,mel=[],shift=0,steps=[],ctx=null,osc=[],startT=0,playing=false,raf=0;
const lay=()=>LAY[$('lay').value];
const ICD=u=>`<path class="dc" d="M-2-7h4v5h5v4h-5v5h-4v-5h-5v-4h5z"/><path class="ar" d="${u?'M-2-7h4v5h-4z':'M-2 2h4v5h-4z'}"/>`;
const ICS=u=>`<circle class="sc" r="7"/><path class="ar" d="${u?'M0-4.5l3.5 5.5h-7z':'M0 4.5l3.5-5.5h-7z'}"/>`;
const svgI=g=>`<svg class="ic2" viewBox="-9 -9 18 18">${g}</svg>`;
const IC={up:'<svg class="ic" viewBox="0 0 16 16"><path d="M8 3l6 9H2z"/></svg>',dn:'<svg class="ic" viewBox="0 0 16 16"><path d="M8 13L2 4h12z"/></svg>',play:'<svg class="ic" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>',stop:'<svg class="ic" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>',dl:'<svg class="ic" viewBox="0 0 16 16"><path d="M7 1h2v7l2.5-2.5L13 7l-5 5-5-5 1.5-1.5L7 8zM2 12h12v3H2z"/></svg>',copy:'<svg class="ic" viewBox="0 0 16 16"><path d="M5 1h8v10H5zM3 4v11h8v-2H5V4z"/></svg>'};
function drawPad(){const bs=lay(),d3=$('lay').value==='3ds';
$('btns').innerHTML=Object.entries(POS).map(([k,[x,y]])=>{const u=bs.includes(k)?'c':'k';
return (k==='L'||k==='R')?`<rect id="p${k}" class="${u}" x="${x-34}" y="${y-13}" width="68" height="26" rx="10"/><text x="${x}" y="${y}">${k}</text>`:`<circle id="p${k}" class="${u}" cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y}">${k}</text>`}).join('')+
(nd()?'':`<rect class="k" x="33" y="85" width="24" height="60" rx="6"/><rect class="k" x="15" y="103" width="60" height="24" rx="6"/><path id="dU" class="k" d="M45 88l8 11H37z"/><path id="dD" class="k" d="M45 142l8-11H37z"/>`)+
(d3?'':`<circle class="k" cx="128" cy="128" r="28"/><path id="sU" class="k" d="M128 104l8 11h-16z"/><path id="sD" class="k" d="M128 152l8-11h-16z"/><circle class="nub" cx="128" cy="128" r="12"/>`)}
const sw=()=>Math.max(480,Math.min(960,Math.round($('seq').clientWidth-14)));
function score(W=480,raw){
const L=52,R=W-12,LS=24,T=28,H=T+4*LS+26,b=lay(),d3=$('lay').value==='3ds';
const sys=[];let cur=[],x=L,last=null;
steps.slice(0,1500).forEach((s,i)=>{if(last!==null&&s.t-last>.45)x+=20;
const w=s.d>=.9?70:s.d>=.45?58:52;
if(x+w>R&&cur.length){sys.push(cur);cur=[];x=L}
cur.push({s,i,x:x+w/2});x+=w;last=s.t+s.d});
if(cur.length)sys.push(cur);
const out=sys.map(r=>{let g='';
b.forEach((k,j)=>{const y=T+(4-j)*LS;g+=`<line x1="${L-10}" x2="${W-8}" y1="${y}" y2="${y}"/><text class="lb" x="20" y="${y}">${k}</text>`});
g+=`<line class="bar" x1="${L-10}" x2="${L-10}" y1="${T}" y2="${T+4*LS}"/><line class="bar" x1="${W-8}" x2="${W-8}" y1="${T}" y2="${T+4*LS}"/>`;
r.forEach(({s,i,x})=>{const y=T+(4-s.i)*LS,d=d3?0:s.o;
g+=`<g class="nt${s.exact?'':' sub'}" id="n${i}"><title>${nm(s.q)}</title><circle class="${s.d>=.9?'lo':'sh'}" cx="${x}" cy="${y}" r="10.5"/><text class="nl" x="${x}" y="${y}">${b[s.i]}</text>${s.m?`<g transform="translate(${x-20} ${y})">${ICD(s.m>0)}</g>`:''}${d?`<g transform="translate(${x+20} ${y})">${ICS(d>0)}</g>`:''}</g>`});
return raw?g:`<svg class="sys" viewBox="0 0 ${W} ${H}">${g}</svg>`});return raw?{parts:out,H}:out.join('')}
function lnote(){const d3=$('lay').value==='3ds',lg=(g,t)=>`<li><svg class="sys lg" viewBox="-16 -15 32 30">${g}</svg><span>${t}</span></li>`,nt=(c,x)=>`<g class="nt${x}"><circle class="${c}" r="10.5"/><text class="nl">A</text></g>`;
$('lnote').innerHTML=`<p style="margin:0">How to read the staff: each line is one button, lowest note at the bottom.</p><ul>`+lg(nt('sh',''),'Short note')+lg(nt('lo',''),'Long note, held for about a second or more')+lg(nt('sh',' sub'),'Dotted outline: moved to the nearest playable note, so it sounds slightly different')+lg(nt('sh',' cur'),'Red: the note playing right now')+(nd()?'':lg(`<g transform="scale(1.5)">${ICD(1)}</g>`,'D-pad up or down (the lit arm shows which)'))+(d3?'':lg(`<g transform="scale(1.5)">${ICS(1)}</g>`,'Stick up or down: octave up or down'))+`</ul>`+(d3&&nd()?`<p style="margin:8px 0 0">Stick only on 3DS leaves just the five buttons, so notes without a button are moved to the nearest one.</p>`:'')}
function build(){
if(!mel.length){steps=[];render();return}
const base=mel[0].t;
steps=mel.map(n=>{const q=snap(fold(n.p+shift)),pl=PM()[q];return{t:n.t-base,d:n.d,q,i:pl.i,m:pl.m,o:pl.o,exact:n.p+shift===q}});render()}
function render(){
const ex=steps.filter(s=>s.exact).length;
$('title').textContent=song?song.title:'Pick a song';
$('stats').innerHTML=steps.length?`<span><b>${steps.length}</b> notes</span><span><b>${Math.round(ex/steps.length*100)}%</b> played at original pitch</span>`:'';
$('shv').textContent=(shift>0?'+':'')+shift;
$('seq').innerHTML=score(sw());lnote()}
function loadNotes(n,title){song={title};mel=skyline(n);shift=autoShift(mel);build()}
function pick(i){stop();const [t,c,bpm,s]=LIB[i];tracks=null;$('track').innerHTML='<option>Built-in melody</option>';loadNotes(fromStr(s,bpm),t);
  document.querySelectorAll('.song').forEach(e =>
    e.classList.toggle(
      'sel',
      e.dataset.type === 'builtin' && +e.dataset.i === i
    )
  );}
document.querySelectorAll('.song').forEach(e =>
  e.classList.toggle(
    'sel',
    e.dataset.type === 'builtin' && +e.dataset.i === i
  )
);

function list() {
  const q = $('q').value.toLowerCase();

  const builtins = LIB.map((s, i) => ({
    title: s[0],
    subtitle: s[1],
    type: 'builtin',
    index: i
  }));

  const imported = MIDI_LIB.map((s, i) => ({
    title: s.title,
    subtitle: 'MIDI · Imported from songs folder',
    type: 'midi',
    index: i
  }));

  const songs = [...builtins, ...imported];

  $('list').innerHTML = songs
    .filter(s => (s.title + s.subtitle).toLowerCase().includes(q))
    .map(s => `
      <button class="song"
        data-type="${s.type}"
        data-i="${s.index}">
        ${s.title}
        <small>${s.subtitle}</small>
      </button>
    `).join('');
}


$('list').onclick = e => {
  const b = e.target.closest('.song');
  if (!b) return;

  if (b.dataset.type === 'builtin') {
    pick(+b.dataset.i);
  } else {
    const s = MIDI_LIB[+b.dataset.i];

    stop();

    tracks = s.tracks;

    $('track').innerHTML = tracks.map((x, i) =>
      `<option value="${i}">
        ${x.name} (${x.notes.length})
      </option>`
    ).join('');

    const best = Math.min(
        s.defaultTrack ?? 0,
        tracks.length - 1
    );

    $('track').value = best;

    song = { title: s.title };
    mel = skyline(tracks[best].notes);
    shift = autoShift(mel);
    build();

    document.querySelectorAll('.song')
      .forEach(x => x.classList.toggle('sel', x === b));
  }

  b.blur();
};

$('q').oninput=list;
async function imp(f){try{stop();const t=parseMidi(await f.arrayBuffer());if(!t.length)throw new Error('No notes found');tracks=t;
const all={name:'All tracks (melody guess)',notes:t.filter(x=>!x.drum).flatMap(x=>x.notes)};tracks.unshift(all);
$('track').innerHTML=tracks.map((x,i)=>`<option value="${i}">${x.name} (${x.notes.length})</option>`).join('');
let bi=1,bn=0;tracks.forEach((x,i)=>{if(i&&x.notes.length>bn){bn=x.notes.length;bi=i}});$('track').value=bi;
song={title:f.name.replace(/\.midi?$/i,'')};mel=skyline(tracks[bi].notes);shift=autoShift(mel);build()}catch(e){alert('Could not read that file: '+e.message)}}
$('track').onchange=()=>{if(!tracks)return;stop();mel=skyline(tracks[+$('track').value].notes);shift=autoShift(mel);build()};
$('drop').onclick=()=>$('file').click();
$('file').onchange=e=>e.target.files[0]&&imp(e.target.files[0]);
['dragover','dragleave','drop'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.toggle('over',ev==='dragover');if(ev==='drop'&&e.dataTransfer.files[0])imp(e.dataTransfer.files[0])}));
$('sm').onclick=()=>{shift--;build()};$('sp').onclick=()=>{shift++;build()};$('sa').onclick=()=>{shift=autoShift(mel);build()};
$('lay').onchange=$('nodp').onchange=()=>{stop();drawPad();shift=autoShift(mel);build()};
$('spd').oninput=()=>$('spv').textContent=(+$('spd').value).toFixed(1)+'×';
const cpL=()=>$('copy').innerHTML=IC.copy+' Copy cheat-sheet';
$('copy').onclick=async()=>{const tx=steps.map(s=>lay()[s.i]+(s.m?(s.m>0?'♯':'♭'):'')+(s.o?(s.o>0?'↑':'↓'):'')).join(' ');try{await navigator.clipboard.writeText(tx);$('copy').innerHTML=IC.copy+' Copied'}catch(e){$('copy').innerHTML=IC.copy+' Copy blocked'}setTimeout(cpL,1500)};
function stop(){osc.forEach(o=>{try{o.stop()}catch(e){}});osc=[];playing=false;cancelAnimationFrame(raf);$('play').innerHTML=IC.play+' Play';hl(-1)}
const rel=()=>document.querySelectorAll('.nt.cur,.pad-svg .on').forEach(e=>e.classList.remove('cur','on'));
function hl(i){document.querySelectorAll('.nt.cur,.pad-svg .on').forEach(e=>e.classList.remove('cur','on'));
if(i<0){$('now').textContent='–';$('nowi').textContent='';return}
const s=steps[i],b=lay()[s.i],c=$('n'+i);if(c){c.classList.add('cur');const q=$('seq'),r=c.getBoundingClientRect(),z=q.getBoundingClientRect();if(r.top<z.top+8||r.bottom>z.bottom-8)q.scrollTo({top:q.scrollTop+r.top-z.top-z.height/3,behavior:'smooth'})}
$('p'+b).classList.add('on');if(s.m)$(s.m>0?'dU':'dD').classList.add('on');if(s.o)$(s.o>0?'sU':'sD').classList.add('on');
const pt=[];if(s.m)pt.push(s.m>0?'Sharp (D-pad up)':'Flat (D-pad down)');if(s.o)pt.push('Stick '+(s.o>0?'up':'down')+' (octave)');
$('now').textContent=b;$('nowi').textContent=(pt.length?pt.join(' + ')+' · ':'')+nm(s.q)}
let mst=null,nz=null,wave=null;
function audioInit(){if(mst)return;mst=ctx.createGain();mst.gain.value=.9;const cv=ctx.createConvolver(),n=ctx.sampleRate*1.8,b=ctx.createBuffer(2,n,ctx.sampleRate);
for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.8)}
cv.buffer=b;const w=ctx.createGain();w.gain.value=.3;mst.connect(ctx.destination);mst.connect(cv);cv.connect(w);w.connect(ctx.destination);
nz=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=nz.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
wave=ctx.createPeriodicWave(new Float32Array([0,0,0,0,0]),new Float32Array([0,1,.06,.03,.012]))}
const EXS=`.s line{stroke:#8a6a3d;stroke-width:1.5}.s .bar{stroke:#6b5237;stroke-width:2}.s .lb{font:700 13px Georgia,serif;fill:#6b5237;text-anchor:middle;dominant-baseline:central}.s .sh{fill:#e6b422;stroke:#6d4a14;stroke-width:1.5}.s .lo{fill:#f7edd5;stroke:#3b2815;stroke-width:2.5}.s .nl{font:700 11px Georgia,serif;text-anchor:middle;dominant-baseline:central;fill:#2c1b06}.s .lo+.nl{fill:#3b2815}.s .sub circle{stroke-dasharray:3 2}.s .dc{fill:#6b5237;stroke:#3b2815;stroke-width:.7}.s .sc{fill:#f7edd5;stroke:#6b5237;stroke-width:1.5}.s .ar{fill:#c0392b}`;
async function exportPng(){
if(!steps.length)return;const btn=$('png');btn.innerHTML=IC.dl+' Exporting…';
try{const W=960,{parts,H}=score(W,true),top=140,tot=top+parts.length*(H+6)+30,esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;'),d3=$('lay').value==='3ds';
const ttl=song?song.title:'Ocarina song',lt=$('lay').selectedOptions[0].textContent;
const dpl=nd()?'':`<g class="s" transform="translate(48 114)">${ICD(1)}</g><text class="t2" x="64" y="114">D-pad up / down</text>`,sx=nd()?48:268;
const leg=dpl+(d3?'':`<g class="s" transform="translate(${sx} 114)">${ICS(1)}</g><text class="t2" x="${sx+16}" y="114">Stick up / down = octave</text>`);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${tot}" viewBox="0 0 ${W} ${tot}"><style>${EXS}.t1{font:700 34px Georgia,serif;fill:#3b2815}.t2{font:15px Georgia,serif;fill:#6b5237;dominant-baseline:central}</style><rect width="100%" height="100%" fill="#efe3c8"/><rect x="10" y="10" width="${W-20}" height="${tot-20}" rx="16" fill="none" stroke="#8a6a3d" stroke-width="2" stroke-dasharray="7 5"/><text class="t1" x="40" y="62">${esc(ttl)}</text><text class="t2" x="40" y="88">${esc(lt)} · ${steps.length} notes · Ocarina Songbook</text>${leg}${parts.map((g,k)=>`<g class="s" transform="translate(0 ${top+k*(H+6)})">${g}</g>`).join('')}</svg>`;
const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});
const cv=document.createElement('canvas');cv.width=W*2;cv.height=tot*2;const cx=cv.getContext('2d');cx.scale(2,2);cx.drawImage(img,0,0,W,tot);URL.revokeObjectURL(url);
const blob=await new Promise(r=>cv.toBlob(r,'image/png')),fn=ttl.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'.png';
let dl=null;try{dl=window.claude&&await window.claude.use('downloads')}catch(e){}
if(dl){await dl.save({filename:fn,data:blob})}
else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
}catch(e){if(!e||e.code!=='declined')console.error(e)}
btn.innerHTML=IC.dl+' Export PNG'}
$('png').onclick=exportPng;
addEventListener('resize',()=>{clearTimeout(window._rt);window._rt=setTimeout(()=>{if(!playing)render()},200)});
addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)){e.preventDefault();$('play').click()}});
$('play').onclick=()=>{if(playing){stop();return}if(!steps.length)return;
ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();ctx.resume();const sp=+$('spd').value,t0=ctx.currentTime+.15;
audioInit();
steps.forEach(s=>{const st=t0+s.t/sp,len=Math.max(.1,s.d/sp*.95),en=st+len,f=440*Math.pow(2,(s.q-69)/12);
const o=ctx.createOscillator(),g=ctx.createGain();o.setPeriodicWave(wave);
o.frequency.setValueAtTime(f*.975,st);o.frequency.exponentialRampToValueAtTime(f,st+.06);
g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(.3,st+.07);g.gain.linearRampToValueAtTime(.24,Math.max(st+.12,en-.1));g.gain.linearRampToValueAtTime(0,en+.12);
o.connect(g);g.connect(mst);o.start(st);o.stop(en+.15);osc.push(o);
if(len>.28){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=5.2;lg.gain.setValueAtTime(0,st);lg.gain.linearRampToValueAtTime(f*.004,st+.35);l.connect(lg);lg.connect(o.frequency);l.start(st);l.stop(en+.15);osc.push(l)}
const n=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),ng=ctx.createGain();n.buffer=nz;n.loop=true;bp.type='bandpass';bp.frequency.value=f*2;bp.Q.value=1.2;
ng.gain.setValueAtTime(0,st);ng.gain.linearRampToValueAtTime(.05,st+.03);ng.gain.linearRampToValueAtTime(.012,st+.18);ng.gain.linearRampToValueAtTime(0,en+.05);
n.connect(bp);bp.connect(ng);ng.connect(mst);n.start(st);n.stop(en+.15);osc.push(n)});
startT=t0;playing=true;$('play').innerHTML=IC.stop+' Stop';
const end=(steps[steps.length-1].t+steps[steps.length-1].d)/sp;let cur=-2;
const tick=()=>{const el=(ctx.currentTime-startT)*sp;let idx=-1;for(let i=0;i<steps.length;i++){if(steps[i].t<=el&&el<steps[i].t+steps[i].d)idx=i}
if(idx!==cur){cur=idx;if(idx<0)rel();else hl(idx)}
if(el/sp>end+.2){stop();return}raf=requestAnimationFrame(tick)};tick()};
$('png').innerHTML=IC.dl+' Export PNG';cpL();$('play').innerHTML=IC.play+' Play';drawPad();list();pick(0);loadFolderSongs();
