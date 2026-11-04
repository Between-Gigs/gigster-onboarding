import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Camera,Check,CheckCircle2,Clock,Eye,Image as ImageIcon,MapPin,Plus,ShieldCheck,Star,Trash2,Upload,X} from 'lucide-react';
import {asset,go,useSession,routeGuard} from './App.jsx';
import {blankProfile,fieldDefinitions,sampleProfile,validateProfile} from './model.mjs';
import {MediaChooser,Modal} from './Media.jsx';
const apiBase=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
const defaultBlocks=['about','services','credits','reviews'];
const blankDemo=new URLSearchParams(location.search).get('blank')==='1';
const demoStorageKey=blankDemo?'bg-demo-profile-blank':'bg-demo-profile';
export const getFields=()=>{
 try{
  const saved=JSON.parse(localStorage.getItem('bg-fields'));
  return fieldDefinitions.map(field=>{
   const override=Array.isArray(saved)?saved.find(item=>item&&item.id===field.id):null;
   return {...field,label:typeof override?.label==='string'&&override.label.trim()?override.label.trim().slice(0,100):field.label,required:field.locked?true:typeof override?.required==='boolean'?override.required:field.required};
  });
 }catch{return fieldDefinitions.map(field=>({...field}));}
};
function getBlockOrder(){try{const saved=JSON.parse(localStorage.getItem('bg-block-order'));return Array.isArray(saved)?[...new Set([...saved.filter(id=>defaultBlocks.includes(id)),...defaultBlocks])]:defaultBlocks;}catch{return defaultBlocks;}}
function hydrateProfile(value,fallback=blankProfile){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
 const result={...structuredClone(blankProfile),...source};
 for(const key of ['name','craft','photo','cover','imdb','about','rate','location'])result[key]=typeof source[key]==='string'?source[key]:key==='rate'&&typeof source[key]==='number'?String(source[key]):'';
 result.credits=Array.isArray(source.credits)?source.credits.filter(item=>typeof item==='string'):[''];if(!result.credits.length)result.credits=[''];
 result.services=Array.isArray(source.services)?source.services.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map((item,index)=>({id:typeof item.id==='string'?item.id:`service-${index}`,title:typeof item.title==='string'?item.title:'',description:typeof item.description==='string'?item.description:'',image:typeof item.image==='string'?item.image:'',rate:typeof item.rate==='string'?item.rate:typeof item.rate==='number'?String(item.rate):''})):[];
 if(!result.services.length)result.services=structuredClone(blankProfile.services);
 result.skills=Array.isArray(source.skills)?source.skills.filter(item=>typeof item==='string'):[];
 result.availability=typeof source.availability==='boolean'?source.availability:true;
 return result;
}
function previewDraft(){try{return hydrateProfile(JSON.parse(localStorage.getItem(demoStorageKey)||'null'),blankDemo?blankProfile:sampleProfile());}catch{return hydrateProfile(blankDemo?blankProfile:sampleProfile());}}
function cancelled(){return new DOMException('This profile session has ended.','AbortError');}
function isCancelled(error){return error?.name==='AbortError';}
function OrderedSections({order,children}){return <div className="profile-main">{React.Children.toArray(children).sort((a,b)=>order.indexOf(a.props['data-block'])-order.indexOf(b.props['data-block']))}</div>;}
function ProfileImage({src,...props}){
 const session=useSession(),owner=session.userId||session.user?.id||'',sessionId=session.sessionId||'';
 const tokenGetter=useRef(session.getToken);tokenGetter.current=session.getToken;
 const [image,setImage]=useState({source:'',owner:'',url:''});
 useEffect(()=>{
  let alive=true,blob;const controller=new AbortController();setImage({source:src,owner,url:''});
  if(!src)return()=>controller.abort();
  if(!src.startsWith('/api/uploads/')){setImage({source:src,owner,url:src.startsWith('/')||src.startsWith('data:')||src.startsWith('http')?src:asset(src)});return()=>controller.abort();}
  tokenGetter.current().then(token=>{if(!alive||!token)throw cancelled();return fetch(apiBase+src,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});}).then(r=>{if(!r.ok)throw Error();return r.blob();}).then(b=>{blob=URL.createObjectURL(b);if(alive)setImage({source:src,owner,url:blob});else URL.revokeObjectURL(blob);}).catch(()=>{});
  return()=>{alive=false;controller.abort();if(blob)URL.revokeObjectURL(blob);};
 },[src,owner,sessionId]);
 return image.source===src&&image.owner===owner&&image.url?<img src={image.url} {...props}/>:null;
}
function Field({label,value,onChange,placeholder,multiline=false,className='',type='text',required=false,error,readOnly=false}){if(readOnly&&!String(value??'').trim())return null;return <label className={`inline-field ${className} ${readOnly?'is-readonly':''} ${error?'invalid':''}`}><span className="field-label">{readOnly?label.replace(/ · optional$/,''):label}{required&&<span className="required-dot" aria-hidden="true"> *</span>}</span>{readOnly?<span className="read-value">{type==='number'?`${value} / hr`:value}</span>:multiline?<textarea aria-label={label} aria-required={required} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} aria-invalid={!!error}/>:<input aria-label={label} aria-required={required} type={type} min={type==='number'?'0':undefined} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-invalid={!!error}/ >}{error&&<span role="alert" className="error-text">{error}</span>}</label>;}
export function Profile({preview=false,sampleId,embedded=false}){
 const session=useSession(),{signedIn,loaded,user}=session,readOnly=!!sampleId;
 const userId=session.userId||user?.id||'',sessionId=session.sessionId||'',owner=preview||sampleId?'preview':`${userId}:${sessionId}`;
 const sessionRef=useRef(session);sessionRef.current=session;
 const ownerRef=useRef(owner);ownerRef.current=owner;
 const [draft,setDraft]=useState(()=>sampleId?hydrateProfile(sampleProfile(sampleId)):preview?previewDraft():structuredClone(blankProfile));
 const [loading,setLoading]=useState(!preview&&!sampleId),[ready,setReady]=useState(preview||!!sampleId),[saveState,setSaveState]=useState('saved'),[loadError,setLoadError]=useState(''),[media,setMedia]=useState(null),[errors,setErrors]=useState({}),[review,setReview]=useState(false),[submitting,setSubmitting]=useState(false),[submission,setSubmission]=useState(null),[changesPending,setChangesPending]=useState(false),[view,setView]=useState(readOnly),[fields,setFields]=useState(()=>preview?getFields():fieldDefinitions),[blockOrder,setBlockOrder]=useState(()=>preview?getBlockOrder():defaultBlocks),[saveAttempt,setSaveAttempt]=useState(0);
 const revision=useRef(0),lastSaved=useRef(''),draftRef=useRef(draft),editVersion=useRef(0),writeQueue=useRef(Promise.resolve()),saveTimer=useRef(),submittingRef=useRef(false),submissionRef=useRef(null),lifecycle=useRef(null);draftRef.current=draft;submissionRef.current=submission;
 const active=useCallback(scope=>!!scope?.active&&lifecycle.current===scope&&ownerRef.current===scope.owner,[]);
 useEffect(()=>{
  const scope={owner,userId,sessionId,active:true,controller:new AbortController()};lifecycle.current=scope;writeQueue.current=Promise.resolve();submittingRef.current=false;
  return()=>{scope.active=false;scope.controller.abort();clearTimeout(saveTimer.current);};
 },[owner]);
 const update=useCallback((key,value)=>{if(submittingRef.current)return;editVersion.current++;setDraft(d=>({...d,[key]:value}));setSaveState('unsaved');if(submissionRef.current)setChangesPending(true);setErrors(e=>({...e,[key]:undefined}));},[]);
 const api=useCallback(async(path,options={},scope=lifecycle.current)=>{
  if(!active(scope))throw cancelled();
  const token=await sessionRef.current.getToken();
  if(!active(scope))throw cancelled();
  if(!token)throw Error('Please sign in again to save your profile.');
  // Bind queued writes to their original Clerk owner, even while accounts switch.
  let claims;try{const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(payload));}catch{throw Error('Please sign in again to save your profile.');}
  if(!scope.userId||claims.sub!==scope.userId||(scope.sessionId&&claims.sid!==scope.sessionId))throw cancelled();
  const r=await fetch(apiBase+'/api'+path,{...options,signal:scope.controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers}});
  let data;try{data=await r.json();}catch{throw Error('Profile storage is not connected yet. Your changes are still on this page.');}
  if(!active(scope))throw cancelled();
  if(!r.ok){const error=Error(data.error||'We couldn’t save this change. Try again.');error.status=r.status;error.fields=data.fields;throw error;}
  return data;
 },[active]);
 useEffect(()=>{
  const cb=()=>{setFields(preview?getFields():fieldDefinitions);setBlockOrder(preview?getBlockOrder():defaultBlocks);};cb();
  window.addEventListener('storage',cb);window.addEventListener('bg-schema',cb);return()=>{window.removeEventListener('storage',cb);window.removeEventListener('bg-schema',cb);};
 },[preview]);
 useEffect(()=>{
  if(preview||sampleId)return;if(!loaded)return;
  setReady(false);setLoading(!!signedIn);setLoadError('');setSubmission(null);setChangesPending(false);revision.current=0;lastSaved.current='';
  if(!signedIn)return;
  const scope=lifecycle.current;
  api('/profile',{},scope).then(d=>{
   if(!active(scope))return;const initial=hydrateProfile(d.profile||{...structuredClone(blankProfile),name:sessionRef.current.user?.fullName||''});
   lastSaved.current=JSON.stringify(initial);setDraft(initial);revision.current=d.revision||0;setSubmission(d.submission);setChangesPending(!!d.changesPending);setSaveState('saved');setReady(true);setLoading(false);
  }).catch(error=>{if(active(scope)&&!isCancelled(error)){setLoadError(error.message);setLoading(false);}});
 },[signedIn,loaded,owner,preview,sampleId,api,active]);
 const save=useCallback(profile=>{
  if(submittingRef.current)return Promise.resolve();
  const scope=lifecycle.current,snapshot=structuredClone(profile),serialized=JSON.stringify(snapshot),version=editVersion.current;
  const job=writeQueue.current.catch(()=>{}).then(async()=>{
   if(!active(scope))throw cancelled();setSaveState('saving');
   if(preview){try{localStorage.setItem(demoStorageKey,serialized);}catch{throw Error('This browser is out of storage. Remove a photo and try again.');}}
   else{const d=await api('/profile',{method:'PUT',body:JSON.stringify({profile:snapshot,revision:revision.current})},scope);revision.current=d.revision;setSubmission(d.submission);setChangesPending(!!d.changesPending);}
   if(!active(scope))throw cancelled();lastSaved.current=serialized;setSaveState(editVersion.current===version?'saved':'unsaved');setLoadError('');
  });writeQueue.current=job;return job;
 },[api,preview,active]);
 useEffect(()=>{
  if(!ready||readOnly)return;
  const guard=async()=>{
   const scope=lifecycle.current;clearTimeout(saveTimer.current);
   try{if(submittingRef.current)await writeQueue.current;else if(JSON.stringify(draftRef.current)!==lastSaved.current)await save(draftRef.current);return active(scope);}
   catch(error){if(active(scope)&&!isCancelled(error)){setSaveState('error');setLoadError(error.message);}return false;}
  };
  routeGuard.current=guard;return()=>{if(routeGuard.current===guard)routeGuard.current=null;};
 },[ready,readOnly,save,active]);
 useEffect(()=>{
  clearTimeout(saveTimer.current);if(!ready||readOnly||submitting||submittingRef.current)return;
  if(JSON.stringify(draft)===lastSaved.current)return;
  const scope=lifecycle.current;saveTimer.current=setTimeout(()=>save(draft).catch(error=>{if(active(scope)&&!isCancelled(error)){setSaveState('error');setLoadError(error.message);if(error.fields)setErrors(error.fields);}}),850);
  return()=>clearTimeout(saveTimer.current);
 },[draft,ready,readOnly,save,submitting,saveAttempt,active]);
 useEffect(()=>{
  if(!ready||readOnly)return;
  const navigate=event=>{
   const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
   const target=new URL(link.href,location.href);if(target.origin!==location.origin||target.pathname!==location.pathname||target.search!==location.search||!target.hash.startsWith('#/')||target.hash===location.hash)return;
   if(saveState==='saved'&&!submittingRef.current)return;
   event.preventDefault();if(submittingRef.current)return;
   const scope=lifecycle.current;clearTimeout(saveTimer.current);
   save(draftRef.current).then(()=>{if(active(scope))location.hash=target.hash;}).catch(error=>{if(active(scope)&&!isCancelled(error)){setSaveState('error');setLoadError(error.message);}});
  };
  document.addEventListener('click',navigate,true);return()=>document.removeEventListener('click',navigate,true);
 },[ready,readOnly,saveState,save,active]);
 useEffect(()=>{const cb=e=>{if((saveState!=='saved'||submitting)&&!readOnly){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',cb);return()=>window.removeEventListener('beforeunload',cb);},[saveState,submitting,readOnly]);
 const field=id=>fields.find(f=>f.id===id)||fieldDefinitions.find(f=>f.id===id),editable=!readOnly&&!view&&!submitting;
 const missing=Object.keys(validateProfile(draft,fields)),completion=Math.round((4-Object.keys(validateProfile(draft)).filter(k=>['name','craft','credits','services'].includes(k)).length)/4*100);
 function startReview(){if(submittingRef.current)return;const found=validateProfile(draftRef.current,fields);setErrors(found);if(Object.keys(found).length){document.getElementById('profile-top')?.scrollIntoView({behavior:'smooth'});return;}setLoadError('');setReview(true);}
 async function submit(){
  if(submittingRef.current)return;
  const snapshot=structuredClone(draftRef.current),found=validateProfile(snapshot,fields);if(Object.keys(found).length){setErrors(found);setReview(false);return;}
  const scope=lifecycle.current;submittingRef.current=true;clearTimeout(saveTimer.current);setSubmitting(true);setLoadError('');
  const job=writeQueue.current.catch(()=>{}).then(async()=>{
   if(!active(scope))throw cancelled();setSaveState('saving');
   if(preview){try{localStorage.setItem(demoStorageKey,JSON.stringify(snapshot));}catch{throw Error('This browser is out of storage. Remove a photo and try again.');}lastSaved.current=JSON.stringify(snapshot);}
   else{const result=await api('/submit',{method:'POST',body:JSON.stringify({profile:snapshot,revision:revision.current})},scope);revision.current=result.revision;setSubmission(result.submission);setChangesPending(!!result.changesPending);const saved=hydrateProfile(result.profile);lastSaved.current=JSON.stringify(saved);setDraft(saved);}
   if(!active(scope))throw cancelled();setSaveState('saved');
  });writeQueue.current=job;
  try{await job;if(active(scope))go('submitted');}
  catch(error){if(active(scope)&&!isCancelled(error)){setLoadError(error.message);setSaveState('error');if(error.fields)setErrors(error.fields);}}
  finally{if(active(scope)){submittingRef.current=false;setSubmitting(false);}}
 }
 async function chooseImage(value){
  if(submittingRef.current)throw Error('Your profile is being sent. Wait a moment.');
  const scope=lifecycle.current,target=media;let result=value;
  if(value?.startsWith('data:')&&!preview){const upload=await api('/uploads',{method:'POST',body:JSON.stringify({dataUrl:value})},scope);result=upload.url;}
  else if(value&&!value.startsWith('data:')&&!value.startsWith('/api/uploads/'))result=new URL(value,location.origin).href;
  if(!active(scope))throw cancelled();
  if(target==='photo'||target==='cover')update(target,result);else update('services',draftRef.current.services.map(s=>s.id===target?{...s,image:result}:s));
 }
 if(!preview&&!sampleId&&!loaded)return <main className="account-needed" role="status"><Clock/><h2>Preparing your account…</h2></main>;
 if(!preview&&!sampleId&&!signedIn)return <main className="account-needed"><ShieldCheck size={32}/><h1>Your profile starts with you.</h1><p>Sign in to save your work and come back anytime.</p><a className="button primary" href="#/auth">Sign in or register <ArrowRight size={17}/></a></main>;
 if(loading)return <main className="account-needed" role="status"><Clock/><h2>Bringing your profile into focus…</h2></main>;
 if(!ready)return <main className="account-needed"><ShieldCheck size={32}/><h1>Your account is ready.</h1><p>{loadError||'Profile storage is being prepared.'}</p><a className="button secondary" href={`${location.pathname}?preview=1#/profile`}>Explore the editor preview <ArrowRight size={16}/></a></main>;
 return <main className="profile-page" id="profile-top">
 {!readOnly&&<div className="editor-toolbar"><div><span className="draft-badge">{submission?(changesPending?'Edits not sent yet':'Needs review'):'Your profile · Draft'}</span><span className="save-status" role="status">{saveState==='saved'?<Check size={14}/>:<Clock size={14}/>} {saveState==='saved'?(preview?'Saved in this browser':'All changes saved'):saveState==='saving'?'Saving changes…':saveState==='error'?'Couldn’t save · retry':'Unsaved changes'}</span>{saveState==='error'&&<button className="text-link" onClick={()=>setSaveAttempt(x=>x+1)}>Retry</button>}</div><div><button className="button secondary compact" disabled={submitting} onClick={()=>setView(!view)}><Eye size={15}/>{view?'Keep editing':'Preview'}</button><button className="button primary compact" disabled={submitting} onClick={startReview}>{submission?'Send updated profile':'Submit for review'}<ArrowRight size={15}/></button></div></div>}
 {loadError&&<div className="error-banner" role="alert">{loadError}<button className="icon-button" aria-label="Dismiss message" onClick={()=>setLoadError('')}><X size={16}/></button></div>}
 <div className="profile-cover">{draft.cover?<ProfileImage src={draft.cover} alt="Profile cover"/>:<div className="cover-wordmark">A little of your world.</div>}{editable&&<button className="image-control" onClick={()=>setMedia('cover')}><Camera size={16}/>{draft.cover?'Change cover':'Add a cover image'}</button>}</div>
 <div className="profile-wrap">{preview&&!readOnly&&!embedded&&<div className="preview-start-options"><span>{blankDemo?'A fresh start · your preview draft saves separately.':'Explore the sample, or try it from the beginning.'}</span><a className="text-link" href={location.pathname+'?preview=1'+(blankDemo?'':'&blank=1')+'#/profile'}>{blankDemo?'Return to sample':'Start a blank profile'}<ArrowUpRight size={13}/></a></div>}<section className="profile-intro"><div className="identity"><button className={`profile-avatar ${!editable?'static':''}`} disabled={!editable} onClick={()=>setMedia('photo')} aria-label="Change profile photo">{draft.photo?<ProfileImage src={draft.photo} alt={draft.name||'Your profile photo'}/>:<Camera size={30}/ >}{editable&&<span><Camera size={15}/></span>}</button><div className="identity-copy"><div className="eyebrow">Meet your Gigster</div>{errors.photo&&<p className="error-text" role="alert">{errors.photo}</p>}<Field label={field('name').label} value={draft.name} onChange={v=>update('name',v)} className="name-field" placeholder="Your name" readOnly={!editable} required error={errors.name}/><Field label={field('craft').label} value={draft.craft} onChange={v=>update('craft',v)} className="craft-field" placeholder="e.g. Costume designer & wardrobe stylist" readOnly={!editable} required error={errors.craft}/><div className="profile-meta"><span><MapPin size={14}/>{draft.location||'Your neighborhood, your community'}</span><span className={`availability ${draft.availability?'available':''}`}>{draft.availability?'Open to opportunities':'Not available right now'}</span></div></div></div>{!readOnly&&<div className="profile-tip"><ShieldCheck size={19}/><div><strong>{editable?'This is your profile. Make it yours.':'A little preview of your next act.'}</strong><p>{editable?'Click any field to start typing. Your work saves as you go.':'This is how your profile will read. Keep editing whenever you’re ready.'}</p></div></div>}</section>
 <nav className="profile-tabs" aria-label="Profile sections">{blockOrder.map(id=>id[0].toUpperCase()+id.slice(1)).map(x=><button key={x} onClick={()=>document.getElementById('section-'+x)?.scrollIntoView({behavior:'smooth',block:'start'})}>{x}</button>)}</nav>
 <div className="profile-columns"><OrderedSections order={blockOrder}><section className="profile-section" data-block="about" id="section-About"><div className="section-heading"><h2>A little about {readOnly?draft.name.split(' ')[0]:'you'}.</h2>{editable&&<span className="optional">{field('about').required?'Required':'Optional'}</span>}</div><Field label={field('about').label} value={draft.about} onChange={v=>update('about',v)} placeholder="What do you love doing? What’s your approach? Tell people a little about the person behind the craft." multiline required={field('about').required} error={errors.about} readOnly={!editable}/></section>
 <section className="profile-section" data-block="services" id="section-Services"><div className="section-heading"><div><div className="eyebrow">Your skills, beyond the set</div><h2>What can you help with?</h2></div>{editable&&<button className="button secondary compact" onClick={()=>update('services',[...draft.services,{id:crypto.randomUUID(),title:'',description:'',image:'',rate:''}])}><Plus size={15}/> Add service</button>}</div><p className="section-description">{editable?'Turn what you do into something someone needs. Start with one, or add a few.':'A little experience can make a big difference.'}</p>{errors.services&&<p className="error-text" role="alert">{errors.services}</p>}<div className="service-grid">{draft.services.map((s,i)=><article className={`service-card ${!s.image?'no-image':''}`} key={s.id}>{s.image?<div className="service-image"><ProfileImage src={s.image} alt={s.title||'Service example'}/>{editable&&<button className="image-control" onClick={()=>setMedia(s.id)}><Camera size={15}/> Change</button>}</div>:editable?<button className="service-image-empty" onClick={()=>setMedia(s.id)}><ImageIcon size={23}/><span>Add a photo <small>or browse inspiration</small></span><Plus size={17}/></button>:null}<div className="service-details"><Field label={`Service ${i+1}`} value={s.title} onChange={v=>update('services',draft.services.map(a=>a.id===s.id?{...a,title:v}:a))} className="service-title" placeholder="e.g. Tailoring & alterations" required={i===0} readOnly={!editable}/><Field label="What’s included" value={s.description} onChange={v=>update('services',draft.services.map(a=>a.id===s.id?{...a,description:v}:a))} placeholder="A few words about what you can do…" multiline readOnly={!editable}/><div className="service-footer">{editable?<label>From $<input type="number" min="0" aria-label={`Hourly rate for service ${i+1}`} placeholder={draft.rate||'0'} value={s.rate} onChange={e=>update('services',draft.services.map(a=>a.id===s.id?{...a,rate:e.target.value}:a))}/><span>/ hr</span></label>:<span>{s.rate?`From $${s.rate} / hr`:'Let’s discuss your project'}</span>}{editable&&draft.services.length>1&&<button className="icon-button" aria-label={`Remove service ${i+1}`} onClick={()=>update('services',draft.services.filter(a=>a.id!==s.id))}><Trash2 size={15}/></button>}</div></div></article>)}</div></section>
 <section className="profile-section" data-block="credits" id="section-Credits"><div className="section-heading"><div><div className="eyebrow">A little of your story</div><h2>Work you’re proud of.</h2></div>{editable&&<button className="text-link" onClick={()=>update('credits',[...draft.credits,''])}><Plus size={16}/> Add credit</button>}</div><p className="section-description">Every production has a story. Share a credit or two from yours.</p>{draft.credits.map((c,i)=><div className="credit-row" key={i}><span className="credit-number">{String(i+1).padStart(2,'0')}</span><Field label={i===0?field('credits').label:`Credit ${i+1}`} value={c} onChange={v=>update('credits',draft.credits.map((a,n)=>n===i?v:a))} placeholder="Production name · Your role" readOnly={!editable} required={i===0} error={i===0?errors.credits:undefined}/>{editable&&draft.credits.length>1&&<button className="icon-button" aria-label={`Remove credit ${i+1}`} onClick={()=>update('credits',draft.credits.filter((_,n)=>n!==i))}><X size={16}/></button>}</div>)}<Field label={field('imdb').label+(field('imdb').required?'':' · optional')} required={field('imdb').required} value={draft.imdb} onChange={v=>update('imdb',v)} placeholder="https://www.imdb.com/name/…" readOnly={!editable} error={errors.imdb}/></section>
 <section className="profile-section" data-block="reviews" id="section-Reviews"><h2>Good work gets people talking.</h2><div className="reviews-empty"><Star size={25}/><div><h3>Your reviews will live here.</h3><p>Once you start taking on projects, your clients’ experiences will become part of your story.</p></div></div></section></OrderedSections>
 <aside className="profile-aside"><section className="details-card"><div className="eyebrow">The practical things</div><h2>Let’s make it work.</h2><Field label={field('rate').label+(field('rate').required?'':' · optional')} required={field('rate').required} value={draft.rate} onChange={v=>update('rate',v)} type="number" placeholder="Your starting rate ($ / hr)" readOnly={!editable} error={errors.rate}/><p className="fine-print">A starting point. Agree the final rate and scope with each client.</p><Field label={field('location').label+(field('location').required?'':' · optional')} required={field('location').required} error={errors.location} value={draft.location} onChange={v=>update('location',v)} placeholder="e.g. Silver Lake, Los Angeles" readOnly={!editable}/><div className="availability-toggle"><div><strong>Ready for new opportunities?</strong><small>{draft.availability?'Let people know you’re open to work.':'You can change this anytime.'}</small></div><button role="switch" aria-checked={draft.availability} aria-label="Ready for new opportunities" disabled={!editable} className={`switch ${draft.availability?'on':''}`} onClick={()=>update('availability',!draft.availability)}><span/></button></div></section>{!readOnly&&<section className="checklist-card"><div className="section-heading"><strong>A good introduction.</strong><span>{completion}%</span></div><div className="progress-track"><span style={{width:completion+'%'}}/></div>{['name','craft','credits','services'].map(k=><div className={`checklist-row ${!missing.includes(k)?'complete':''}`} key={k}><CheckCircle2 size={16}/>{field(k).label}</div>)}<p>Just the essentials to start. The rest can grow with you.</p><button className="button primary" disabled={submitting} onClick={startReview}>Review my profile <ArrowRight size={16}/></button><small><ShieldCheck size={13}/> Private until reviewed</small></section>}</aside></div>
 {!readOnly&&<div className="profile-end"><h2>Your craft is only the beginning.</h2><p>You can keep adding to your story, even after sending it for review.</p><button className="button primary" disabled={submitting} onClick={startReview}>Review & submit <ArrowRight size={17}/></button></div>}
 </div>{media&&<MediaChooser kind={media==='photo'?'avatar':media==='cover'?'cover':'service'} onClose={()=>setMedia(null)} onChoose={chooseImage}/>}{review&&<Modal title="Ready for your next act?" onClose={()=>{if(!submittingRef.current)setReview(false);}}><div className="review-summary"><CheckCircle2 size={32}/><h3>A good introduction, {draft.name.split(' ')[0]}.</h3><p>{preview?'You’re trying a preview. This won’t send your profile to the team.':'We’ll review your profile before it becomes public. You can keep editing while we take a look.'}</p><dl><div><dt>Your craft</dt><dd>{draft.craft}</dd></div><div><dt>Services</dt><dd>{draft.services.filter(s=>s.title.trim()).length}</dd></div><div><dt>Credits</dt><dd>{draft.credits.filter(c=>c.trim()).length}</dd></div></dl>{loadError&&<p role="alert" className="error-text">{loadError}</p>}</div><div className="modal-actions"><button className="button secondary" disabled={submitting} onClick={()=>setReview(false)}>Keep editing</button><button className="button primary" disabled={submitting} onClick={submit}>{submitting?'Sending…':preview?'Preview confirmation':'Submit for review'}<ArrowRight size={16}/></button></div></Modal>}
 </main>;
}
