import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowDownLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, Download, ExternalLink, GitBranch, LayoutGrid, LockKeyhole, Maximize2, Monitor, Moon, PanelRightClose, PanelRightOpen, RotateCcw, Settings2, Smartphone, Sun, X} from 'lucide-react';
import {Logo, asset} from './App.jsx';
import {Modal} from './Media.jsx';
import {fieldDefinitions} from './model.mjs';
import './studio.css';

const steps = [
  {id:'email', number:'01', label:'The invitation', kind:'Email', route:'email', description:'Your craft. More possibilities.', note:'The visual anchor for the entire journey.', color:'sand'},
  {id:'welcome', number:'02', label:'A warm welcome', kind:'Landing page', route:'welcome', description:'Your next gig starts here.', note:'The invitation’s tactile, editorial style.', color:'sage'},
  {id:'auth', number:'03', label:'Create account · popup', kind:'Secure account popup', route:'auth', description:'Sign in. Settle in.', note:'Create your profile opens Clerk over the public welcome page.', color:'sand'},
  {id:'profile', number:'04', label:'Make it yours', kind:'Profile editor', route:'profile', description:'Your profile is the form.', note:'Type in place, add images, and tell your story.', color:'sage'},
  {id:'submitted', number:'05', label:'Ready for review', kind:'Confirmation', route:'submitted', description:'A good first introduction.', note:'A clear next step, with room to keep editing.', color:'sand'},
  {id:'discover', number:'06', label:'Meet the community', kind:'Sample directory', route:'discover', description:'Extraordinary talent. Everyday help.', note:'Explore six sample profiles and their services.', color:'sage'},
];
const alternate = {id:'welcome-green', number:'02B', label:'The original direction', kind:'Alternate landing', route:'welcome-green', description:'The Los Angeles call sheet.', note:'Compare the green direction with the invitation style.', color:'green'};
const defaultBlocks = ['about', 'services', 'credits', 'reviews'];
const blockLabels = {about:'About you', services:'Your services', credits:'Selected credits', reviews:'Future reviews'};

function readFields(){
  try {
    const saved = JSON.parse(localStorage.getItem('bg-fields'));
    return fieldDefinitions.map(field => ({...field, ...saved?.find(item => item.id === field.id), locked:field.locked, required:field.locked ? true : saved?.find(item => item.id === field.id)?.required ?? field.required}));
  } catch { return fieldDefinitions.map(field => ({...field})); }
}
function readOrder(){
  try {
    const saved = JSON.parse(localStorage.getItem('bg-block-order'));
    return Array.isArray(saved) ? [...new Set([...saved.filter(id => defaultBlocks.includes(id)), ...defaultBlocks])] : defaultBlocks;
  } catch { return defaultBlocks; }
}
const previewUrl = (route, theme) => `${location.pathname}?preview=1&embed=1&theme=${theme}#/${route}`;

function DeviceButtons({value, onChange, small=false}){
  return <div className={`studio-segmented ${small ? 'small' : ''}`} aria-label="Preview device">
    <button className={value==='desktop'?'selected':''} onClick={()=>onChange('desktop')} aria-label="Desktop preview" aria-pressed={value==='desktop'}><Monitor size={small?13:15}/>{!small&&'Desktop'}</button>
    <button className={value==='mobile'?'selected':''} onClick={()=>onChange('mobile')} aria-label="Mobile preview" aria-pressed={value==='mobile'}><Smartphone size={small?13:15}/>{!small&&'Mobile'}</button>
  </div>;
}

function Thumbnail({step, device, full, theme, version}){
  const wrap=useRef(null), frame=useRef(null);
  const [width,setWidth]=useState(240), [contentHeight,setContentHeight]=useState(720);
  const viewport=device==='mobile'?390:1280, scale=width/viewport;
  const measure=useCallback(()=>{
    const body=frame.current?.contentDocument?.body;
    if(body)setContentHeight(Math.max(680,body.scrollHeight));
  },[]);
  useEffect(()=>{
    if(!wrap.current)return;
    const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));
    observer.observe(wrap.current);return()=>observer.disconnect();
  },[]);
  const visibleHeight=full?contentHeight*scale:device==='mobile'?216:172;
  return <div className={`studio-thumbnail ${device==='mobile'?'is-mobile':''} ${full?'is-full':''}`} ref={wrap} style={{height:visibleHeight}}>
    <iframe key={`${theme}-${device}-${version}`} ref={frame} src={previewUrl(step.route,theme)} title={`${step.label}, ${device} thumbnail`} tabIndex={-1} aria-hidden="true" onLoad={measure} style={{width:viewport,height:Math.max(contentHeight,720),transform:`scale(${scale})`}}/>
    <span className="thumbnail-open"><Maximize2 size={17}/> Open interactive preview</span>
  </div>;
}

function StepCard({step, device, onDevice, full, onFull, onOpen, theme, version, alternateCard=false}){
  return <article className={`studio-step ${alternateCard?'alternate-step':''}`}>
    <div className="step-card-top"><span className={`step-number ${step.color}`}>{step.number}</span><span>{step.kind}</span><button className="studio-icon" aria-label={`Open ${step.label}`} onClick={()=>onOpen(step)}><ArrowUpRight size={17}/></button></div>
    <button className="thumbnail-button" onClick={()=>onOpen(step)} aria-label={`Open interactive ${step.label} preview`}><Thumbnail step={step} device={device} full={full} theme={theme} version={version}/></button>
    <div className="step-card-copy"><h3>{step.label}</h3><p>{step.description}</p></div>
    <div className="step-card-controls"><DeviceButtons value={device} onChange={onDevice} small/><button className={`full-card-button ${full?'selected':''}`} onClick={()=>onFull(!full)} aria-pressed={full}><Maximize2 size={12}/>{full?'Full page':'First look'}</button></div>
  </article>;
}

export function Studio({theme,setTheme}){
  const [device,setDevice]=useState('desktop'), [devices,setDevices]=useState({}), [full,setFull]=useState(false), [fullCards,setFullCards]=useState({});
  const [selected,setSelected]=useState(null), [previewDevice,setPreviewDevice]=useState('desktop'), [previewFull,setPreviewFull]=useState(false), [previewTheme,setPreviewTheme]=useState(theme);
  const [inspector,setInspector]=useState(true), [fields,setFields]=useState(readFields), [order,setOrder]=useState(readOrder), [version,setVersion]=useState(0), [notice,setNotice]=useState('');
  const [activeTab,setActiveTab]=useState('fields');
  const previewFrame=useRef(null), [previewHeight,setPreviewHeight]=useState(900);
  const closePreview=useCallback(()=>setSelected(null),[]);
  const persist=(nextFields,nextOrder)=>{
    try {
      localStorage.setItem('bg-fields',JSON.stringify(nextFields));
      localStorage.setItem('bg-block-order',JSON.stringify(nextOrder));
      window.dispatchEvent(new Event('bg-schema'));
      setNotice('Preview settings saved in this browser.');
    } catch {setNotice('This browser could not save the settings. Export your schema to keep them.');}
  };
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3200);return()=>clearTimeout(timer);},[notice]);
  const updateField=(id,patch)=>{
    const next=fields.map(field=>field.id===id?{...field,...patch,required:field.locked?true:patch.required??field.required}:field);
    setFields(next);persist(next,order);
  };
  const moveBlock=(index,direction)=>{
    const next=[...order],target=index+direction;
    if(target<0||target>=next.length)return;
    [next[index],next[target]]=[next[target],next[index]];
    setOrder(next);persist(fields,next);
  };
  const refresh=()=>{setVersion(value=>value+1);setNotice('Previews refreshed.');};
  const exportSchema=()=>{
    const schema={schemaVersion:1,exportedAt:new Date().toISOString(),scope:'browser-preview',fields,profileBlockOrder:order,steps:[...steps,alternate].map(({id,label,route,kind})=>({id,label,route:`#/${route}`,kind})),notes:'Preview settings only. Apply required field rules on the server before production use.'};
    const blob=new Blob([JSON.stringify(schema,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='between-gigs-onboarding-schema.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Your onboarding schema has been exported.');
  };
  const reset=()=>{const next=fieldDefinitions.map(field=>({...field}));setFields(next);setOrder(defaultBlocks);persist(next,defaultBlocks);setVersion(value=>value+1);};
  const open=step=>{setSelected(step);setPreviewDevice(devices[step.id]||device);setPreviewFull(fullCards[step.id]??full);setPreviewTheme(theme);setPreviewHeight(900);};
  const setAllDevices=value=>{setDevice(value);setDevices({});};
  const setAllFull=value=>{setFull(value);setFullCards({});};
  const measurePreview=()=>{const body=previewFrame.current?.contentDocument?.body;if(body)setPreviewHeight(Math.max(900,body.scrollHeight));};
  const renderCard=step=><StepCard key={step.id} step={step} theme={theme} version={version} device={devices[step.id]||device} onDevice={value=>setDevices({...devices,[step.id]:value})} full={fullCards[step.id]??full} onFull={value=>setFullCards({...fullCards,[step.id]:value})} onOpen={open} alternateCard={step.id==='welcome-green'}/>;
  return <div className="funnel-studio">
    <header className="studio-header"><div className="studio-brand"><Logo dark={theme==='dark'}/><span className="studio-brand-divider"/><span className="studio-name"><GitBranch size={15}/> Funnel studio</span></div><div className="studio-header-actions"><a href="#/welcome" className="studio-exit"><ArrowUpRight size={15}/> Open the experience</a><button className="studio-icon" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={`Switch to ${theme==='light'?'dark':'light'} mode`}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button></div></header>
    <div className="studio-title-row"><div><div className="studio-eyebrow"><span/> THE GIGSTER JOURNEY</div><h1>Every step. <em>One story.</em></h1><p>From an invitation in their inbox to a profile that feels like them.</p></div><button className="button secondary studio-export" onClick={exportSchema}><Download size={16}/> Export flow</button></div>
    <div className="studio-toolbar"><div className="studio-view-label"><LayoutGrid size={16}/><span>Journey canvas</span><span className="studio-step-count">6 steps + 1 direction</span></div><div className="studio-view-tools"><DeviceButtons value={device} onChange={setAllDevices}/><label className="studio-height-select"><Maximize2 size={14}/><select aria-label="Canvas preview height" value={full?'full':'first'} onChange={e=>setAllFull(e.target.value==='full')}><option value="first">First look</option><option value="full">Full page</option></select><ChevronDown size={12}/></label><button className="studio-icon" onClick={refresh} aria-label="Refresh all previews"><RotateCcw size={16}/></button><span className="studio-tool-divider"/><button className={`inspector-toggle ${inspector?'selected':''}`} onClick={()=>setInspector(!inspector)} aria-pressed={inspector}>{inspector?<PanelRightClose size={16}/>:<PanelRightOpen size={16}/>}<span>Profile fields</span></button></div></div>
    <div className={`studio-workspace ${inspector?'with-inspector':''}`}>
      <main className="journey-canvas" aria-label="Onboarding journey canvas">
        <div className="canvas-intro"><span><span className="canvas-live-dot"/> LIVE PREVIEWS</span><p>Open any step to explore. Scroll across to follow the journey.</p><ArrowRight size={16}/></div>
        <div className="journey-flow">
          <div className="journey-step-column"><div className="journey-stage-label">THE FIRST HELLO</div>{renderCard(steps[0])}</div>
          <div className="journey-connector"><ArrowRight size={22}/></div>
          <div className="journey-step-column"><div className="journey-stage-label">THE INVITATION CONTINUES</div>{renderCard(steps[1])}<div className="alternate-branch"><GitBranch size={15}/><span>COMPARE A DIRECTION</span><ArrowDown size={15}/></div>{renderCard(alternate)}</div>
          <div className="journey-connector"><ArrowRight size={22}/></div>
          <div className="journey-step-column"><div className="journey-stage-label">A PLACE OF THEIR OWN</div>{renderCard(steps[2])}</div>
          <div className="journey-connector"><ArrowRight size={22}/></div>
          <div className="journey-step-column"><div className="journey-stage-label">THEIR CRAFT, THEIR WAY</div>{renderCard(steps[3])}</div>
          <div className="journey-connector"><ArrowRight size={22}/></div>
          <div className="journey-step-column"><div className="journey-stage-label">A HUMAN NEXT STEP</div>{renderCard(steps[4])}<div className="return-path"><ArrowDownLeft size={16}/><span>Return to edit anytime</span></div></div>
          <div className="journey-connector optional-connector"><ArrowRight size={22}/><span>EXPLORE</span></div>
          <div className="journey-step-column"><div className="journey-stage-label">THE POSSIBILITIES</div>{renderCard(steps[5])}</div>
        </div>
        <div className="canvas-anchor"><img src={asset('invitation-reference.png')} alt="The original Between Gigs invitation design"/><div><span>OUR VISUAL ANCHOR</span><p>Warmth, real craft, and a little possibility.</p><button onClick={()=>open(steps[0])}>Revisit the invitation <ArrowUpRight size={13}/></button></div></div>
      </main>
      {inspector&&<aside className="studio-inspector" aria-label="Profile configuration"><div className="inspector-heading"><div><Settings2 size={17}/><h2>Make the profile yours</h2></div><button className="studio-icon" aria-label="Close profile configuration" onClick={()=>setInspector(false)}><X size={17}/></button></div><p className="inspector-intro">Fine-tune the questions and the order of the story.</p><div className="inspector-tabs" role="tablist" aria-label="Profile settings"><button role="tab" aria-selected={activeTab==='fields'} className={activeTab==='fields'?'active':''} onClick={()=>setActiveTab('fields')}>Questions <span>{fields.length}</span></button><button role="tab" aria-selected={activeTab==='blocks'} className={activeTab==='blocks'?'active':''} onClick={()=>setActiveTab('blocks')}>Profile blocks <span>{order.length}</span></button></div>
        {activeTab==='fields'?<div className="inspector-fields"><div className="inspector-section-label">THE ESSENTIALS, IN YOUR WORDS</div>{fields.map(field=><div className="inspector-field" key={field.id}><label htmlFor={`schema-${field.id}`}>{field.id==='imdb'?'IMDb link':field.id.replace(/^./,letter=>letter.toUpperCase())}{field.locked&&<LockKeyhole size={11} aria-label="Minimum required question"/>}</label><input id={`schema-${field.id}`} value={field.label} maxLength={100} onChange={e=>updateField(field.id,{label:e.target.value})} onBlur={()=>setVersion(value=>value+1)}/><label className={`required-setting ${field.locked?'locked':''}`}><input type="checkbox" checked={field.required} disabled={field.locked} onChange={e=>updateField(field.id,{required:e.target.checked})}/><span>{field.locked?'Required · minimum question':'Required for review'}</span>{field.locked&&<LockKeyhole size={10}/>}</label></div>)}</div>:<div className="inspector-blocks"><div className="inspector-section-label">DRIVE THE STORY</div><p>Set the order of the main profile sections.</p>{order.map((id,index)=><div className="block-order-row" key={id}><span className="block-position">{String(index+1).padStart(2,'0')}</span><strong>{blockLabels[id]}</strong><div><button className="studio-icon" disabled={index===0} aria-label={`Move ${blockLabels[id]} up`} onClick={()=>moveBlock(index,-1)}><ArrowUp size={14}/></button><button className="studio-icon" disabled={index===order.length-1} aria-label={`Move ${blockLabels[id]} down`} onClick={()=>moveBlock(index,1)}><ArrowDown size={14}/></button></div></div>)}<button className="button secondary block-preview-link" onClick={()=>open(steps[3])}>Preview the profile <ArrowUpRight size={14}/></button></div>}
        <div className="inspector-footnote"><LockKeyhole size={14}/><div><strong>Preview settings, just for this browser.</strong><p>These edits update the previews here. Export the schema to bring your choices into the main product. Live submission rules are managed on the server.</p></div></div><button className="studio-reset" onClick={reset}><RotateCcw size={13}/> Restore original questions & order</button>
      </aside>}
    </div>
    <footer className="studio-footer"><span><Check size={13}/> One connected journey. Built around the person.</span><span>BETWEEN GIGS · ONBOARDING STUDIO</span></footer>
    {notice&&<div className="studio-toast" role="status"><Check size={15}/>{notice}</div>}
    {selected&&<Modal title={`${selected.number} / ${selected.label}`} onClose={closePreview} className="studio-preview-modal"><div className="studio-preview-toolbar"><DeviceButtons value={previewDevice} onChange={value=>{setPreviewDevice(value);setPreviewHeight(900);}}/><label className="studio-height-select"><Maximize2 size={14}/><select aria-label="Interactive preview height" value={previewFull?'full':'screen'} onChange={e=>setPreviewFull(e.target.value==='full')}><option value="screen">Screen height</option><option value="full">Full page</option></select><ChevronDown size={12}/></label><button className="studio-icon" onClick={()=>setPreviewTheme(previewTheme==='light'?'dark':'light')} aria-label={`Preview in ${previewTheme==='light'?'dark':'light'} mode`}>{previewTheme==='light'?<Moon size={16}/>:<Sun size={16}/>}</button><a href={previewUrl(selected.route,previewTheme)} target="_blank" rel="noreferrer" className="preview-new-tab">Open in new tab <ExternalLink size={14}/></a></div><div className={`studio-preview-stage ${previewDevice} ${previewFull?'full-page':''}`}><div className="studio-preview-device"><div className="preview-address"><span/><span/><span/><small>between gigs / {selected.route}</small></div><iframe key={`${selected.id}-${previewDevice}-${previewTheme}`} ref={previewFrame} title={`${selected.label} interactive ${previewDevice} preview`} src={previewUrl(selected.route,previewTheme)} onLoad={measurePreview} style={{height:previewFull?previewHeight:undefined}}/></div></div><div className="studio-preview-note"><span><span className="canvas-live-dot"/> INTERACTIVE PREVIEW</span><p>{selected.note}</p></div></Modal>}
  </div>;
}
