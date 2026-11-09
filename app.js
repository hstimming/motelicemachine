/* Motel Ice Machine — GitHub Pages / Supabase site. No private keys in this file. */
(() => {
  'use strict';
  const cfg = window.MOTEL_CONFIG || {};
  const configured = /^https:\/\/[^ ]+\.supabase\.co\/?$/.test(cfg.supabaseUrl || '') &&
    typeof cfg.supabaseKey === 'string' && !cfg.supabaseKey.startsWith('PASTE_');
  const db = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
  const $ = id => document.getElementById(id);
  const state = { member: false, user: null, events: [], songs: [], votes: [], setlists: [], setlistSongs: [], tab: 'events', setId: null };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const validUrl = url => { try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; } };
  const linkForSong = s => validUrl(s.tab_url) || `https://www.ultimate-guitar.com/search.php?search=${encodeURIComponent(`${s.title} ${s.artist}`)}`;
  let timeout;
  const notify = (message, error=false) => {
    const toast=$('message'); toast.textContent=message; toast.className='toast'+(error?' is-error':'');toast.hidden=false;
    clearTimeout(timeout); timeout=setTimeout(()=>toast.hidden=true,5500);
  };
  const getPage = () => (location.hash || '#home').slice(1).split('?')[0];
  const today = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  function dateParts(date) { const d=new Date(`${date}T12:00:00`);return {month:d.toLocaleString('en-US',{month:'short'}).toUpperCase(),day:d.getDate()}; }
  function updateMenu() {
    $('band-menu-link').textContent = state.member ? '🔓 Band workspace' : '🔒 Band login';
  }
  function eventCards(manage=false) {
    const events = manage ? state.events : state.events.filter(e=>e.show_date >= today());
    if (!events.length) return `<div class="empty">${manage?'No shows yet. Use ADD SHOW to publish one.':'Next show to be announced. Check back soon.'}</div>`;
    return events.map(e=>{
      const date=dateParts(e.show_date);
      const link=validUrl(e.ticket_url);
      return `<article class="event-card"><div class="event-date"><small>${date.month}</small><b>${date.day}</b></div><div class="event-info"><h3>${escapeHTML(e.name)}</h3><p>${escapeHTML(e.venue)} · ${escapeHTML(e.city)}${e.show_time?' · '+escapeHTML(e.show_time):''}</p>${link?`<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">TICKETS / INFO ↗</a>`:''}</div>${manage?`<div class="event-actions"><button class="small-button" data-action="edit-event" data-id="${e.id}">EDIT</button><button class="small-button danger" data-action="delete-event" data-id="${e.id}">DELETE</button></div>`:''}</article>`;
    }).join('');
  }
  function homePage(){return `<section class="hero"><div class="neon-frame"><div class="neon-words"><span class="neon-first">Motel</span><span class="neon-second">Ice Machine</span></div></div><div class="hero-actions"><a class="button" href="#shows">UPCOMING SHOWS ↗</a></div></section><div class="ticker">✳ &nbsp; ST. LOUIS &nbsp; / &nbsp; LIVE MUSIC &nbsp; / &nbsp; MOTEL ICE MACHINE &nbsp; ✳</div><section class="section"><div class="section-eyebrow">01 / THE MARQUEE</div><h2>Upcoming shows.</h2><p>Dates, venues, and ticket information.</p>${eventCards(false)}<div class="section-link"><a class="button secondary" href="#shows">ALL SHOWS →</a></div></section><section class="paper"><div class="paper-inner"><div class="section-eyebrow">02 / THE BAND</div><h2>GOOD MUSIC.<br>QUESTIONABLE LODGING.</h2><p>Motel Ice Machine is a band from St. Louis, Missouri. Loud guitars, familiar songs, and a good night out.</p><a class="button" href="#about">THE BAND →</a></div></section>`;}
  function showsPage(){return `<section class="section"><div class="section-eyebrow">LIVE / THE MARQUEE</div><h1>Shows & tickets.</h1><p>Upcoming dates, venues, and ticket information.</p>${eventCards(false)}</section>`;}
  function aboutPage(){return `<section class="section"><div class="section-eyebrow">ROOM 101 / ABOUT</div><h1>Meet the Ice Machine.</h1><p>Motel Ice Machine is a St. Louis band playing live music around town.</p><div class="empty" style="text-align:left;max-width:590px"><h3>Booking & contact</h3><p>Add your band's email address, social handles, photographs, and official bio here in a future update.</p></div></section>`;}
  function loginPage(){return `<section class="section"><div class="login-card"><div class="section-eyebrow">MEMBERS ONLY</div><h1>Band check-in.</h1><p>Sign in using your band member email and password.</p>${!db?'<p class="form-error">Site not configured. Add your Supabase URL and publishable key to config.js first.</p>':''}<form id="login-form"><label class="form-field" for="login-email">EMAIL</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" required><label class="form-field" for="login-password">PASSWORD</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required><div id="login-error" class="form-error" role="alert" aria-live="polite"></div><button class="button" type="submit" ${!db?'disabled':''}>CHECK IN →</button></form></div></section>`;}
  function songsTab(){
    let rows = state.songs.map(song=>({song,votes:state.votes.filter(v=>v.song_id===song.id),voted:state.votes.some(v=>v.song_id===song.id&&v.user_id===state.user?.id)})).sort((a,b)=>b.votes.length-a.votes.length);
    return `<div class="workhead"><div><h2>THE SONG BOARD.</h2><p>One vote per member per song. Five votes automatically adds a song to the Main Setlist.</p></div><button class="button" data-action="new-song">+ SUGGEST SONG</button></div>${rows.length?rows.map(({song,votes,voted})=>`<div class="song-row"><div class="detail"><strong>${escapeHTML(song.title)}</strong><small>${escapeHTML(song.artist)}</small><p><a href="${escapeHTML(linkForSong(song))}" target="_blank" rel="noopener noreferrer">ULTIMATE GUITAR ↗</a></p>${votes.length>=5?'<div class="qualified">✓ SETLIST QUALIFIED</div>':''}</div><button class="vote-button" data-action="vote" data-id="${song.id}" ${voted?'disabled':''}>↑ ${votes.length}<br><small>${voted?'VOTED':'VOTE'}</small></button></div>`).join(''):'<div class="empty">No song suggestions yet.</div>'}`;
  }
  function setlistTab(){
    const selected = state.setlists.find(s=>s.id===state.setId) || state.setlists[0];
    if (!selected)return '<div class="empty">No setlists available.</div>';
    const entries = state.setlistSongs.filter(x=>x.setlist_id===selected.id).sort((a,b)=>a.position-b.position||a.song_id-b.song_id);
    return `<div class="workhead"><div><h2>SETLIST BUILDER.</h2><p>Manage songs and their playing order.</p></div><button class="button" data-action="new-setlist">+ NEW SETLIST</button></div><div class="set-tabs">${state.setlists.map(s=>`<button class="${s.id===selected.id?'active':''}" data-action="choose-setlist" data-id="${s.id}">${escapeHTML(s.name)}</button>`).join('')}</div><div class="workhead"><strong>${escapeHTML(selected.name)} · ${entries.length} SONGS</strong><button class="button secondary" data-action="add-to-setlist">+ ADD SONG</button></div>${entries.length?entries.map((entry,i)=>{const song=state.songs.find(s=>s.id===entry.song_id);if(!song)return '';return `<div class="set-row"><span class="position">${i+1}</span><div class="detail"><strong>${escapeHTML(song.title)}</strong><small>${escapeHTML(song.artist)}</small><a href="${escapeHTML(linkForSong(song))}" target="_blank" rel="noopener noreferrer">TABS ↗</a></div><button class="small-button" data-action="move-song" data-id="${song.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button class="small-button" data-action="move-song" data-id="${song.id}" data-dir="1" ${i===entries.length-1?'disabled':''}>↓</button><button class="small-button danger" data-action="remove-song" data-id="${song.id}">×</button></div>`}).join(''):'<div class="empty">This setlist is empty.</div>'}`;
  }
  function workspace(){return `<div class="workspace-bar"><div class="section-eyebrow" style="color:#604530">PRIVATE / BAND MEMBERS ONLY</div><h1>THE BACK OFFICE.</h1><p>Manage the live website and your band's songs.</p><button class="small-button" data-action="logout">LOG OUT</button></div><div class="workspace-tabs"><button data-action="tab" data-tab="events" class="${state.tab==='events'?'active':''}">▣ EVENTS</button><button data-action="tab" data-tab="songs" class="${state.tab==='songs'?'active':''}">♫ SONGS & VOTES</button><button data-action="tab" data-tab="setlists" class="${state.tab==='setlists'?'active':''}">☷ SETLISTS</button><button data-action="refresh">↻ REFRESH</button></div><section class="work-content">${state.tab==='events'?`<div class="workhead"><div><h2>EVENTS MANAGER.</h2><p>Changes here automatically update public show listings.</p></div><button class="button" data-action="new-event">+ ADD SHOW</button></div>${eventCards(true)}`:state.tab==='songs'?songsTab():setlistTab()}</section>`;}
  function render(){
    const page=getPage();$('view').innerHTML=page==='home'?homePage():page==='shows'?showsPage():page==='about'?aboutPage():page==='band'?(state.member?workspace():loginPage()):homePage();
    updateMenu();
  }
  async function loadEvents(){if(!db)return;const {data,error}=await db.from('events').select('*').order('show_date',{ascending:true});if(error){notify('Could not load shows: '+error.message,true);return;}state.events=data||[];render();}
  async function loadPrivate(){if(!db||!state.member)return;const [s,v,sl,ss]=await Promise.all([
    db.from('songs').select('*').order('created_at',{ascending:false}),
    db.from('votes').select('song_id,user_id'),
    db.from('setlists').select('*').order('id',{ascending:true}),
    db.from('setlist_songs').select('*').order('position',{ascending:true})
  ]);
    const failed=[s,v,sl,ss].find(r=>r.error);
    if(failed){notify('Could not load band data: '+failed.error.message,true);return;}
    state.songs=s.data||[];state.votes=v.data||[];state.setlists=sl.data||[];state.setlistSongs=ss.data||[];
    if(!state.setlists.some(x=>x.id===state.setId))state.setId=state.setlists[0]?.id??null;
    render();
  }
  async function verifyMember(){
    if(!db)return;
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session){state.member=false;state.user=null;render();return;}
    const {data, error:memberErr}=await db.from('band_members').select('user_id').eq('user_id',session.user.id).maybeSingle();
    state.user=session.user;state.member=!memberErr&&!!data;render();
    if(state.member)await loadPrivate();
  }
  async function login(event){
    event.preventDefault();if(!db)return;
    const submit=event.currentTarget.querySelector('[type="submit"]');submit.disabled=true;
    const errorElement=$('login-error');errorElement.textContent='';
    const form=new FormData(event.currentTarget);
    const {data,error}=await db.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});
    if(error){errorElement.textContent=/invalid login credentials|invalid credentials/i.test(error.message)?'Incorrect email or password. Please try again.':'Could not sign in: '+error.message;submit.disabled=false;return;}
    const {data:member,error:memberErr}=await db.from('band_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(memberErr||!member){await db.auth.signOut();errorElement.textContent='This account is not approved for band access.';submit.disabled=false;return;}
    state.user=data.user;state.member=true;state.tab='events';render();await loadPrivate();notify('Signed in to the band workspace.');
  }
  function modalForm({title,fields,submitLabel='SAVE',onSubmit}){
    document.querySelector('.modal-shade')?.remove();
    const shade=document.createElement('div');shade.className='modal-shade';
    shade.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="section-eyebrow">MOTEL ICE MACHINE / BACK OFFICE</div><h2>${escapeHTML(title)}</h2><form id="modal-form">${fields}<div class="form-error" id="modal-error" role="alert"></div><div class="form-actions"><button type="button" class="button secondary" data-close-modal>CANCEL</button><button type="submit" class="button">${escapeHTML(submitLabel)}</button></div></form></div>`;
    document.body.appendChild(shade);
    shade.addEventListener('click',e=>{if(e.target===shade||e.target.closest('[data-close-modal]'))shade.remove()});
    shade.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;
      try {const done=await onSubmit(new FormData(e.target));if(done!==false){shade.remove();await Promise.all([loadEvents(),loadPrivate()]);}}catch(err){shade.querySelector('#modal-error').textContent=err.message||String(err);}finally{btn.disabled=false;}
    });
  }
  const field=(label,name,value='',type='text',required=true)=>`<label class="form-field" for="field-${name}">${label}</label><input class="input" id="field-${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${required?'required':''} ${type==='text'?'maxlength="160"':''}>`;
  function editEvent(id){
    const e=id?state.events.find(x=>x.id===id):null;
    modalForm({title:e?'EDIT SHOW':'ADD SHOW',fields:field('EVENT NAME','name',e?.name||'')+field('DATE','show_date',e?.show_date||'','date')+field('VENUE','venue',e?.venue||'')+field('CITY','city',e?.city||'St. Louis, MO')+field('TIME (OPTIONAL)','show_time',e?.show_time||'','text',false)+field('TICKET URL (OPTIONAL)','ticket_url',e?.ticket_url||'','url',false),onSubmit:async data=>{
      const row={name:String(data.get('name')).trim(),show_date:String(data.get('show_date')),venue:String(data.get('venue')).trim(),city:String(data.get('city')).trim(),show_time:String(data.get('show_time')||'').trim()||null,ticket_url:String(data.get('ticket_url')||'').trim()||null};
      if(row.ticket_url&&!validUrl(row.ticket_url))throw Error('Provide a valid http(s) ticket URL.');
      const result=e?await db.from('events').update(row).eq('id',e.id):await db.from('events').insert(row);
      if(result.error)throw result.error;notify(e?'Show updated.':'Show published.');
    }});
  }
  function newSong(){modalForm({title:'SUGGEST A SONG',fields:field('SONG TITLE','title')+field('ARTIST','artist')+field('ULTIMATE GUITAR URL (OPTIONAL)','tab_url','','url',false),onSubmit:async form=>{
    const url=String(form.get('tab_url')||'').trim();if(url&&!validUrl(url))throw Error('Provide a valid http(s) link.');
    const {error}=await db.from('songs').insert({title:String(form.get('title')).trim(),artist:String(form.get('artist')).trim(),tab_url:url||null,created_by:state.user.id});if(error)throw error;notify('Song suggested.');
  }});}
  function newSetlist(){modalForm({title:'NEW SETLIST',fields:field('SETLIST NAME','name'),onSubmit:async form=>{
    const {data,error}=await db.from('setlists').insert({name:String(form.get('name')).trim()}).select('id').single();if(error)throw error;state.setId=data.id;notify('Setlist created.');
  }});}
  function addToSetlist(){
    const options=state.songs.filter(s=>!state.setlistSongs.some(ss=>ss.setlist_id===state.setId&&ss.song_id===s.id));
    if(!options.length){notify('All suggested songs are already in this setlist.',true);return;}
    modalForm({title:'ADD SONG TO SETLIST',fields:`<label class="form-field" for="select-song">SONG</label><select class="input" id="select-song" name="song_id">${options.map(s=>`<option value="${s.id}">${escapeHTML(s.title)} — ${escapeHTML(s.artist)}</option>`).join('')}</select>`,onSubmit:async form=>{
      const positions=state.setlistSongs.filter(x=>x.setlist_id===state.setId).map(x=>x.position);
      const {error}=await db.from('setlist_songs').insert({setlist_id:state.setId,song_id:Number(form.get('song_id')),position:Math.max(0,...positions)+1});if(error)throw error;notify('Song added to setlist.');
    }});
  }
  async function action(button){
    const kind=button.dataset.action,id=Number(button.dataset.id);
    if(!state.member&&kind!=='refresh')return;
    if(kind==='tab'){state.tab=button.dataset.tab;await loadPrivate();return;}
    if(kind==='refresh'){await Promise.all([loadEvents(),loadPrivate()]);notify('Data refreshed.');return;}
    if(kind==='logout'){await db.auth.signOut();state.member=false;state.user=null;location.hash='#home';notify('Signed out.');return;}
    if(kind==='new-event'){editEvent();return;}
    if(kind==='edit-event'){editEvent(id);return;}
    if(kind==='new-song'){newSong();return;}
    if(kind==='new-setlist'){newSetlist();return;}
    if(kind==='add-to-setlist'){addToSetlist();return;}
    if(kind==='choose-setlist'){state.setId=id;render();return;}
    button.disabled=true;
    try{
      if(kind==='delete-event'){
        if(!confirm('Delete this show from the public website?'))return;
        const {error}=await db.from('events').delete().eq('id',id);if(error)throw error;await loadEvents();notify('Show removed.');
      }else if(kind==='vote'){
        const {error}=await db.from('votes').insert({song_id:id,user_id:state.user.id});if(error)throw error;await loadPrivate();notify('Vote saved.');
      }else if(kind==='remove-song'){
        const {error}=await db.from('setlist_songs').delete().eq('setlist_id',state.setId).eq('song_id',id);if(error)throw error;await loadPrivate();
      }else if(kind==='move-song'){
        const sorted=state.setlistSongs.filter(x=>x.setlist_id===state.setId).sort((a,b)=>a.position-b.position||a.song_id-b.song_id);
        const index=sorted.findIndex(x=>x.song_id===id),next=index+Number(button.dataset.dir);
        if(index<0||next<0||next>=sorted.length)return;
        [sorted[index],sorted[next]]=[sorted[next],sorted[index]];
        // Rewrite all positions, allowing non-unique intermediate values.
        for(let i=0;i<sorted.length;i++){
          const {error}=await db.from('setlist_songs').update({position:i+1}).eq('setlist_id',state.setId).eq('song_id',sorted[i].song_id);
          if(error)throw error;
        }
        await loadPrivate();
      }
    }catch(error){notify(error.message||String(error),true)}finally{button.disabled=false;}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#menu-button')){const m=$('site-menu');m.hidden=!m.hidden;$('menu-button').setAttribute('aria-expanded',String(!m.hidden));return;}
    if(e.target.closest('.site-menu a')){$('site-menu').hidden=true;$('menu-button').setAttribute('aria-expanded','false');}
    const btn=e.target.closest('button[data-action]');if(btn)void action(btn);
  });
  document.addEventListener('submit',e=>{if(e.target.id==='login-form')void login(e);});
  window.addEventListener('hashchange',async()=>{render();if(getPage()==='band'&&state.member)await loadPrivate();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&db)void loadEvents();});
  $('year').textContent=new Date().getFullYear();
  render();
  if(db){
    void verifyMember();void loadEvents();
    db.channel('motel-public-events').on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>{void loadEvents();}).subscribe();
  }
})();
