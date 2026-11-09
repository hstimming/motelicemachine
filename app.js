/* Motel Ice Machine — GitHub Pages / Supabase site. No private keys in this file. */
(() => {
  'use strict';
  const cfg = window.MOTEL_CONFIG || {};
  const configured = /^https:\/\/[^ ]+\.supabase\.co\/?$/.test(cfg.supabaseUrl || '') &&
    typeof cfg.supabaseKey === 'string' && !cfg.supabaseKey.startsWith('PASTE_');
  const db = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
  const showHistory = window.MOTEL_SHOW_SETLISTS || [];
  const $ = id => document.getElementById(id);
  const state = { member: false, user: null, events: [], songs: [], votes: [], setlists: [], setlistSongs: [], eventsLoaded: false, eventsError: false, tab: 'events', setId: null, about: null };
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
  function eventCards(manage=false, past=false) {
    if (state.eventsError && !state.eventsLoaded) return '<div class="empty" role="status">Shows are temporarily unavailable. Please try again shortly.</div>';
    if (!state.eventsLoaded && !showHistory.length) return '<div class="empty" role="status">Loading shows…</div>';
    const available = manage ? state.events : publicEvents();
    const events = manage ? available : available.filter(e=>e.show_date && (past ? e.show_date < today() : e.show_date >= today()));
    if (past) events.sort((a,b)=>b.show_date.localeCompare(a.show_date));
    if (!events.length) return `<div class="empty">${manage?'No shows yet. Use ADD SHOW to publish one.':past?'No past shows listed yet.':'Next show to be announced. Check back soon.'}</div>`;
    return events.map(e=>{
      const date=e.show_date ? dateParts(e.show_date) : null;
      const isPast=!!e.show_date && e.show_date < today();
      const link=validUrl(e.ticket_url);
      const snapshot=historyForEvent(e);
      const details=[e.venue,e.city,e.show_time].filter(Boolean).map(escapeHTML).join(' · ');
      return `<article class="event-card${isPast?' past-event':''}"><div class="event-date">${date?`<small>${date.month}</small><b>${date.day}</b><small>${escapeHTML(e.show_date.slice(0,4))}</small>`:'<small>DATE<br>TBA</small>'}</div><div class="event-info">${isPast?'<span class="event-status">PAST SHOW</span>':''}<h3>${escapeHTML(e.name)}</h3>${snapshot?.firstShow?'<p>Our first show.</p>':''}${details?`<p>${details}</p>`:''}${!manage && snapshot && isPast ? publicSetlist(snapshot) : ''}${link?`<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${isPast?'EVENT DETAILS':'TICKETS / INFO'} ↗</a>`:''}</div>${manage?`<div class="event-actions"><button class="small-button" data-action="edit-event" data-id="${e.id}">EDIT</button><button class="small-button danger" data-action="delete-event" data-id="${e.id}">DELETE</button></div>`:''}</article>`;
    }).join('');
  }
  const normalizeName = value => String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function historyForEvent(event) {
    return showHistory.find(show=>show.date===event.show_date &&
      (normalizeName(event.name).includes(show.key.startsWith('philo')?'philo':'trifrat')));
  }
  function publicEvents() {
    const events=[...state.events];
    for(const show of showHistory)if(!events.some(e=>historyForEvent(e)?.key===show.key))
      events.push({id:show.key,name:show.name,show_date:show.date});
    return events.sort((a,b)=>String(a.show_date||'9999').localeCompare(String(b.show_date||'9999')));
  }
  function publicSetlist(show) {
    return `<details class="show-setlist"><summary>VIEW SETLIST · ${show.titles.length} SONGS</summary><ol>${show.titles.map(title=>`<li>${escapeHTML(title)}</li>`).join('')}</ol></details>`;
  }
  function historyImportButton(){
    return '<button class="button secondary" data-action="import-show-history">IMPORT PHILO + TRIFRAT SHOWS & SETLISTS</button><p class="editor-help">Save the supplied 2026 shows, songs, setlists, and booking email to Supabase. Existing show details and songs are preserved.</p>';
  }
  let historyImportRunning=false;
  async function importShowHistory(button){
    if(!db||!state.member||historyImportRunning)return;
    historyImportRunning=true;
    button.disabled=true;
    try {
      // Re-read before importing so repeated imports reuse the same records.
      const loaded=await Promise.all([loadEvents(),loadPrivate()]);
      if(loaded.some(result=>result===false))throw Error('Could not read existing records');
      for(const show of showHistory){
        if(!state.events.some(e=>historyForEvent(e)?.key===show.key)){
          const {data,error}=await db.from('events').insert({name:show.name,show_date:show.date,venue:'',city:'',show_time:null,ticket_url:null}).select('*').single();
          if(error)throw error;state.events.push(data);
        }
        const name=`${show.name} — ${show.date}`;
        let setlist=state.setlists.find(x=>x.name===name);
        if(!setlist){const {data,error}=await db.from('setlists').insert({name}).select('*').single();if(error)throw error;setlist=data;state.setlists.push(data);}
        for(let index=0;index<show.titles.length;index++){
          const title=show.titles[index];
          const aliases={valerie:['valarie'],santeria:['santaria','sanataria']};
          const accepted=[normalizeName(title),...(aliases[normalizeName(title)]||[])];
          let song=state.songs.find(x=>accepted.includes(normalizeName(x.title)));
          if(!song){const {data,error}=await db.from('songs').insert({title,artist:'',tab_url:null,created_by:state.user.id}).select('*').single();if(error)throw error;song=data;state.songs.push(data);}
          const existing=state.setlistSongs.find(x=>x.setlist_id===setlist.id&&x.song_id===song.id);
          if(!existing){const row={setlist_id:setlist.id,song_id:song.id,position:index+1};const {error}=await db.from('setlist_songs').insert(row);if(error)throw error;state.setlistSongs.push(row);}
        }
      }
      const {error}=await db.from('site_content').update({booking_email:'willaitchison2@gmail.com'}).eq('id',1);
      if(error)throw error;
      await Promise.all([loadEvents(),loadPrivate(),loadAbout()]);
      notify('Shows, setlists, and booking email imported.');
    }catch(error){notify('Import stopped: '+(error.message||String(error))+'. You can retry to complete missing records.',true);}
    finally{historyImportRunning=false;if(button.isConnected)button.disabled=false;}
  }
  const aboutDefaults = {
    about_title: 'Meet the Ice Machine.',
    about_bio: 'Motel Ice Machine is a St. Louis band playing live music around town.',
    home_heading: 'GOOD MUSIC. QUESTIONABLE LODGING.',
    home_blurb: 'Motel Ice Machine is a band from St. Louis, Missouri. Loud guitars, familiar songs, and a good night out.',
    booking_email: 'willaitchison2@gmail.com', instagram_url: '', spotify_url: '', band_photo_path: '', members: []
  };
  const aboutContent = () => {
    const content={...aboutDefaults,...(state.about||{})};
    if(!content.booking_email || content.booking_email.toLowerCase()==='aitchison@wustl.edu')content.booking_email='willaitchison2@gmail.com';
    return content;
  };
  const safeText = value => escapeHTML(value).replace(/\n/g, '<br>');
  function publicPhoto(path) {
    if (!db || !path || !/^about\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(path)) return '';
    return db.storage.from('band-photos').getPublicUrl(path).data.publicUrl;
  }
  function socialLink(url, title) {
    const href=validUrl(url);
    return href?`<a class="button secondary" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`:'';
  }
  function homePage(){
    const a=aboutContent();
    return `<section class="hero"><p class="hero-location">ST. LOUIS, MISSOURI · LIVE MUSIC</p><div class="neon-frame"><i class="sign-bolt bolt-top" aria-hidden="true"></i><i class="sign-bolt bolt-bottom" aria-hidden="true"></i><h1 class="neon-words" aria-label="Motel Ice Machine"><span class="neon-first">Motel</span><span class="neon-second">Ice Machine</span></h1></div><p class="hero-caption">Good tunes. Stay a while.</p><div class="hero-actions"><a class="button" href="#shows">UPCOMING SHOWS ↗</a></div></section><div class="ticker">✳ &nbsp; ST. LOUIS &nbsp; / &nbsp; LIVE MUSIC &nbsp; / &nbsp; MOTEL ICE MACHINE &nbsp; ✳</div><section class="section"><div class="section-eyebrow">01 / THE MARQUEE</div><h2>Upcoming shows.</h2><p>Dates, venues, and ticket information.</p>${eventCards(false)}<div class="section-link"><a class="button secondary" href="#shows">ALL SHOWS →</a></div></section><section class="paper"><div class="paper-inner"><div class="section-eyebrow">02 / THE BAND</div><h2>${escapeHTML(a.home_heading)}</h2><p>${safeText(a.home_blurb)}</p><a class="button" href="#about">THE BAND →</a></div></section>`;
  }
  function showsPage(){return `<section class="section"><div class="section-eyebrow">LIVE / THE MARQUEE</div><h1>Shows & tickets.</h1><p>Upcoming dates, venues, and ticket information.</p>${eventCards(false)}<div class="past-shows"><div class="section-eyebrow">THE GUEST BOOK / PREVIOUS DATES</div><h2>Past shows.</h2><p>A look back at where we’ve played.</p>${eventCards(false,true)}</div></section>`;}
  function aboutPage(){
    const a=aboutContent();const photo=publicPhoto(a.band_photo_path);
    const members=Array.isArray(a.members)?a.members:[];
    return `<section class="section about-page"><div class="section-eyebrow">ROOM 101 / ABOUT</div><h1>${escapeHTML(a.about_title)}</h1>${photo?`<img class="about-hero-photo" src="${escapeHTML(photo)}" alt="Motel Ice Machine band photograph" loading="lazy">`:''}<div class="about-bio">${safeText(a.about_bio)}</div>${members.length?`<div class="members-heading"><h2>THE BAND.</h2></div><div class="member-grid">${members.map(m=>`<article class="member-card">${m.photo_url&&validUrl(m.photo_url)?`<img src="${escapeHTML(validUrl(m.photo_url))}" loading="lazy" alt="${escapeHTML(m.name||'Band member')}">`:''}<h3>${escapeHTML(m.name||'')}</h3><strong>${escapeHTML(m.instrument||'')}</strong><p>${safeText(m.bio||'')}</p></article>`).join('')}</div>`:''}<div class="about-contact"><h2>BOOKING & CONTACT</h2>${a.booking_email?`<p><a href="mailto:${escapeHTML(a.booking_email)}">${escapeHTML(a.booking_email)}</a></p>`:'<p>Contact information coming soon.</p>'}<div class="about-socials">${socialLink(a.instagram_url,'INSTAGRAM')}${socialLink(a.spotify_url,'SPOTIFY')}</div></div></section>`;
  }
  function loginPage(){return `<section class="section"><div class="login-card"><div class="section-eyebrow">MEMBERS ONLY</div><h1>Band check-in.</h1><p>Sign in using your band member email and password.</p>${!db?'<p class="form-error">Site not configured. Add your Supabase URL and publishable key to config.js first.</p>':''}<form id="login-form"><label class="form-field" for="login-email">EMAIL</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" required><label class="form-field" for="login-password">PASSWORD</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required><div id="login-error" class="form-error" role="alert" aria-live="polite"></div><button class="button" type="submit" ${!db?'disabled':''}>CHECK IN →</button></form></div></section>`;}
  function songsTab(){
    let rows = state.songs.map(song=>({song,votes:state.votes.filter(v=>v.song_id===song.id),voted:state.votes.some(v=>v.song_id===song.id&&v.user_id===state.user?.id)})).sort((a,b)=>b.votes.length-a.votes.length);
    return `<div class="workhead"><div><h2>THE SONG BOARD.</h2><p>One vote per member per song. Five votes automatically adds a song to the Main Setlist.</p></div><button class="button" data-action="new-song">+ SUGGEST SONG</button></div>${rows.length?rows.map(({song,votes,voted})=>`<div class="song-row"><div class="detail"><strong>${escapeHTML(song.title)}</strong><small>${escapeHTML(song.artist)}</small><p><a href="${escapeHTML(linkForSong(song))}" target="_blank" rel="noopener noreferrer">ULTIMATE GUITAR ↗</a></p>${votes.length>=5?'<div class="qualified">✓ SETLIST QUALIFIED</div>':''}</div><button class="vote-button" data-action="vote" data-id="${song.id}" ${voted?'disabled':''}>↑ ${votes.length}<br><small>${voted?'VOTED':'VOTE'}</small></button></div>`).join(''):'<div class="empty">No song suggestions yet.</div>'}`;
  }
  function setlistTab(){
    const selected = state.setlists.find(s=>s.id===state.setId) || state.setlists[0];
    if (!selected)return historyImportButton()+'<div class="empty">No setlists available.</div>';
    const entries = state.setlistSongs.filter(x=>x.setlist_id===selected.id).sort((a,b)=>a.position-b.position||a.song_id-b.song_id);
    return `${historyImportButton()}<div class="workhead"><div><h2>SETLIST BUILDER.</h2><p>Manage songs and their playing order.</p></div><button class="button" data-action="new-setlist">+ NEW SETLIST</button></div><div class="set-tabs">${state.setlists.map(s=>`<button class="${s.id===selected.id?'active':''}" data-action="choose-setlist" data-id="${s.id}">${escapeHTML(s.name)}</button>`).join('')}</div><div class="workhead"><strong>${escapeHTML(selected.name)} · ${entries.length} SONGS</strong><button class="button secondary" data-action="add-to-setlist">+ ADD SONG</button></div>${entries.length?entries.map((entry,i)=>{const song=state.songs.find(s=>s.id===entry.song_id);if(!song)return '';return `<div class="set-row"><span class="position">${i+1}</span><div class="detail"><strong>${escapeHTML(song.title)}</strong><small>${escapeHTML(song.artist)}</small><a href="${escapeHTML(linkForSong(song))}" target="_blank" rel="noopener noreferrer">TABS ↗</a></div><button class="small-button" data-action="move-song" data-id="${song.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button class="small-button" data-action="move-song" data-id="${song.id}" data-dir="1" ${i===entries.length-1?'disabled':''}>↓</button><button class="small-button danger" data-action="remove-song" data-id="${song.id}">×</button></div>`}).join(''):'<div class="empty">This setlist is empty.</div>'}`;
  }
  function websiteTab(){
    const a=aboutContent();
    const photo=publicPhoto(a.band_photo_path);
    return `<div class="workhead"><div><h2>WEBSITE EDITOR.</h2><p>Edit the public homepage and Meet the Band page. Changes appear on the live site.</p></div></div><form id="about-form" class="about-editor"><div class="editor-grid"><div><label class="form-field" for="about-title">ABOUT PAGE HEADING</label><input class="input" id="about-title" name="about_title" maxlength="120" value="${escapeHTML(a.about_title)}"></div><div><label class="form-field" for="about-email">BOOKING EMAIL</label><input class="input" id="about-email" name="booking_email" type="email" value="${escapeHTML(a.booking_email)}"></div></div><label class="form-field" for="about-bio">ABOUT / BAND BIO</label><textarea class="input editor-textarea" id="about-bio" name="about_bio" rows="6" maxlength="10000">${escapeHTML(a.about_bio)}</textarea><div class="editor-grid"><div><label class="form-field" for="about-home-heading">HOMEPAGE ABOUT HEADING</label><input class="input" id="about-home-heading" name="home_heading" maxlength="160" value="${escapeHTML(a.home_heading)}"></div><div><label class="form-field" for="about-home-blurb">HOMEPAGE SHORT BIO</label><textarea class="input editor-textarea" id="about-home-blurb" name="home_blurb" rows="3" maxlength="1000">${escapeHTML(a.home_blurb)}</textarea></div></div><div class="editor-grid"><div><label class="form-field" for="about-instagram">INSTAGRAM URL</label><input class="input" id="about-instagram" name="instagram_url" type="url" placeholder="https://instagram.com/..." value="${escapeHTML(a.instagram_url)}"></div><div><label class="form-field" for="about-spotify">SPOTIFY URL</label><input class="input" id="about-spotify" name="spotify_url" type="url" placeholder="https://open.spotify.com/..." value="${escapeHTML(a.spotify_url)}"></div></div><label class="form-field" for="about-photo">BAND PHOTO (JPG, PNG OR WEBP; MAX 5 MB)</label>${photo?`<img class="editor-photo" src="${escapeHTML(photo)}" alt="Current band photo">`:''}<input class="input" type="file" id="about-photo" name="photo" accept="image/jpeg,image/png,image/webp"><label class="editor-check"><input type="checkbox" name="remove_photo" value="yes"> Remove current band photo</label><label class="form-field" for="about-members">BAND MEMBER PROFILES — ONE PER LINE</label><p class="editor-help">Format: Name | Instrument | Short bio | Optional image URL. Leave the image URL blank if you don't have one.</p><textarea class="input editor-textarea" id="about-members" name="members_text" rows="6" maxlength="14000" placeholder="Sam | Guitar | Loves loud amplifiers | https://example.com/photo.jpg">${escapeHTML((Array.isArray(a.members)?a.members:[]).map(m=>[m.name||'',m.instrument||'',m.bio||'',m.photo_url||''].join(' | ')).join('\n'))}</textarea><div id="about-error" class="form-error" role="alert" aria-live="polite"></div><div class="editor-actions"><button class="button" type="submit">PUBLISH CHANGES →</button><a class="button secondary" href="#about">VIEW PUBLIC PAGE ↗</a></div></form>`;
  }
  async function saveAbout(formElement){
    if(!db||!state.member)return;
    const submit=formElement.querySelector('button[type="submit"]');
    const errorElement=formElement.querySelector('#about-error');
    submit.disabled=true;submit.textContent='PUBLISHING…';errorElement.textContent='';
    try{
      const f=new FormData(formElement);
      const members=String(f.get('members_text')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{
        const p=line.split('|').map(x=>x.trim());
        if(p.length>4||!p[0])throw Error('Check member profile line '+(i+1)+'. Use: Name | Instrument | Bio | Optional URL');
        if(p[3]&&!validUrl(p[3]))throw Error('Invalid member photo URL on line '+(i+1));
        return {name:p[0],instrument:p[1]||'',bio:p[2]||'',photo_url:p[3]||''};
      });
      const row={id:1,about_title:String(f.get('about_title')||'').trim(),about_bio:String(f.get('about_bio')||'').trim(),home_heading:String(f.get('home_heading')||'').trim(),home_blurb:String(f.get('home_blurb')||'').trim(),booking_email:String(f.get('booking_email')||'').trim(),instagram_url:String(f.get('instagram_url')||'').trim(),spotify_url:String(f.get('spotify_url')||'').trim(),members,band_photo_path:aboutContent().band_photo_path||''};
      for(const key of ['instagram_url','spotify_url'])if(row[key]&&!validUrl(row[key]))throw Error('Please enter a valid http(s) URL for '+key+'.');
      if(f.get('remove_photo'))row.band_photo_path='';
      const photo=f.get('photo');
      if(photo instanceof File&&photo.size>0){
        if(photo.size>5*1024*1024)throw Error('Photo must be smaller than 5 MB.');
        const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
        const ext=extensions[photo.type];if(!ext)throw Error('Upload a JPG, PNG, or WebP photo.');
        const path='about/'+crypto.randomUUID()+'.'+ext;
        const upload=await db.storage.from('band-photos').upload(path,photo,{contentType:photo.type,upsert:false});
        if(upload.error)throw Error('Photo upload failed: '+upload.error.message);
        row.band_photo_path=path;
      }
      const {error}=await db.from('site_content').upsert(row,{onConflict:'id'});
      if(error)throw error;
      state.about=row;render();notify('About page published successfully.');
    }catch(error){errorElement.textContent=error.message||String(error);notify(error.message||String(error),true)}finally{
      if(submit.isConnected){submit.disabled=false;submit.textContent='PUBLISH CHANGES →';}
    }
  }
  function workspace(){return `<div class="workspace-bar"><div class="section-eyebrow" style="color:#604530">PRIVATE / BAND MEMBERS ONLY</div><h1>THE BACK OFFICE.</h1><p>Manage the live website and your band's songs.</p><button class="small-button" data-action="logout">LOG OUT</button></div><div class="workspace-tabs"><button data-action="tab" data-tab="events" class="${state.tab==='events'?'active':''}">▣ EVENTS</button><button data-action="tab" data-tab="songs" class="${state.tab==='songs'?'active':''}">♫ SONGS & VOTES</button><button data-action="tab" data-tab="setlists" class="${state.tab==='setlists'?'active':''}">☷ SETLISTS</button><button data-action="tab" data-tab="website" class="${state.tab==='website'?'active':''}">✎ WEBSITE EDITOR</button><button data-action="refresh">↻ REFRESH</button></div><section class="work-content">${state.tab==='events'?`<div class="workhead"><div><h2>EVENTS MANAGER.</h2><p>Changes here automatically update public show listings.</p></div><button class="button" data-action="new-event">+ ADD SHOW</button></div>${eventCards(true)}`:state.tab==='songs'?songsTab():state.tab==='website'?websiteTab():setlistTab()}</section>`;}
  function render(){
    const page=getPage();$('view').innerHTML=page==='home'?homePage():page==='shows'?showsPage():page==='about'?aboutPage():page==='band'?(state.member?workspace():loginPage()):homePage();
    updateMenu();
    document.querySelectorAll('.desktop-nav a, .site-menu a').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }
  async function loadAbout(){
    if(!db)return;
    const {data,error}=await db.from('site_content').select('*').eq('id',1).maybeSingle();
    if(error){notify('Could not load About content: '+error.message,true);return;}
    state.about=data||null;render();
  }
  async function loadEvents(){if(!db){state.eventsLoaded=true;render();return;}const {data,error}=await db.from('events').select('*').order('show_date',{ascending:true});if(error){state.eventsError=true;render();notify('Could not load shows: '+error.message,true);return false;}state.eventsError=false;state.events=data||[];state.eventsLoaded=true;render();return true;}
  async function loadPrivate(){if(!db||!state.member)return;const [s,v,sl,ss]=await Promise.all([
    db.from('songs').select('*').order('created_at',{ascending:false}),
    db.from('votes').select('song_id,user_id'),
    db.from('setlists').select('*').order('id',{ascending:true}),
    db.from('setlist_songs').select('*').order('position',{ascending:true})
  ]);
    const failed=[s,v,sl,ss].find(r=>r.error);
    if(failed){notify('Could not load band data: '+failed.error.message,true);return false;}
    state.songs=s.data||[];state.votes=v.data||[];state.setlists=sl.data||[];state.setlistSongs=ss.data||[];
    if(!state.setlists.some(x=>x.id===state.setId))state.setId=state.setlists[0]?.id??null;
    render();
    return true;
  }
  async function verifyMember(){
    if(!db)return;
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session){state.member=false;state.user=null;return;}
    const {data, error:memberErr}=await db.from('band_members').select('user_id').eq('user_id',session.user.id).maybeSingle();
    state.user=session.user;state.member=!memberErr&&!!data;render();
    if(state.member)await loadPrivate();
  }
  async function login(event){
    event.preventDefault();
    const formElement=event.target;
    const submit=formElement.querySelector('[type="submit"]');
    const errorElement=formElement.querySelector('#login-error');
    if(!db){
      if(errorElement)errorElement.textContent='Supabase is not configured. Check config.js for the project URL and publishable key.';
      return;
    }
    const form=new FormData(formElement);
    const email=String(form.get('email')||'').trim();
    const password=String(form.get('password')||'');
    submit.disabled=true;
    submit.textContent='CHECKING…';
    if(errorElement)errorElement.textContent='';
    try{
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error){
        throw new Error(/invalid login credentials|invalid credentials/i.test(error.message)
          ? 'Incorrect email or password. Please try again.'
          : 'Could not sign in: '+error.message);
      }
      if(!data?.user)throw new Error('No account information was returned. Please try again.');
      const {data:member,error:memberErr}=await db.from('band_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
      if(memberErr)throw new Error('Could not verify band access: '+memberErr.message);
      if(!member){
        await db.auth.signOut();
        throw new Error('This account is not approved for band access. Add its user ID to band_members in Supabase.');
      }
      state.user=data.user;
      state.member=true;
      state.tab='events';
      render();
      await loadPrivate();
      notify('Signed in to the band workspace.');
    }catch(err){
      const message=err?.message||'Login failed. Check your connection and try again.';
      const visibleError=document.getElementById('login-error');
      if(visibleError)visibleError.textContent=message;
      else notify(message,true);
    }finally{
      if(submit.isConnected){submit.disabled=false;submit.textContent='CHECK IN →';}
    }
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
  const field=(label,name,value='',type='text',required=(name==='name'||name==='title'))=>`<label class="form-field" for="field-${name}">${label}</label><input class="input" id="field-${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${required?'required':''} ${type==='text'?'maxlength="160"':''}>`;
  function editEvent(id){
    const e=id?state.events.find(x=>x.id===id):null;
    modalForm({title:e?'EDIT SHOW':'ADD SHOW',fields:field('EVENT NAME','name',e?.name||'')+field('DATE','show_date',e?.show_date||'','date')+field('VENUE','venue',e?.venue||'')+field('CITY','city',e?.city||'St. Louis, MO')+field('TIME (OPTIONAL)','show_time',e?.show_time||'','text',false)+field('TICKET URL (OPTIONAL)','ticket_url',e?.ticket_url||'','url',false),onSubmit:async data=>{
      const row={name:String(data.get('name')).trim(),show_date:String(data.get('show_date')||'')||null,venue:String(data.get('venue')).trim(),city:String(data.get('city')).trim(),show_time:String(data.get('show_time')||'').trim()||null,ticket_url:String(data.get('ticket_url')||'').trim()||null};
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
    if(kind==='import-show-history'){await importShowHistory(button);return;}
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
  document.addEventListener('submit',e=>{if(e.target.id==='login-form'){void login(e);}else if(e.target.id==='about-form'){e.preventDefault();void saveAbout(e.target);}});
  window.addEventListener('hashchange',async()=>{render();if(getPage()==='band'&&state.member)await loadPrivate();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&db)void loadEvents();});
  $('year').textContent=new Date().getFullYear();
  if(!db)state.eventsLoaded=true;
  render();
  if(db){
    void verifyMember();void loadEvents();void loadAbout();
    db.channel('motel-public-events').on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>{void loadEvents();}).subscribe();
    db.channel('motel-public-about').on('postgres_changes',{event:'*',schema:'public',table:'site_content'},()=>{void loadAbout();}).subscribe();
  }
})();
