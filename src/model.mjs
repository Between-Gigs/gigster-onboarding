export const blankProfile = { name:'', craft:'', photo:'', cover:'', credits:[''], imdb:'', about:'', services:[{id:'first',title:'',description:'',image:'',rate:''}], rate:'', location:'', availability:true, skills:[] };
export const fieldDefinitions = [
  {id:'name',label:'Your name',required:true,locked:true},
  {id:'craft',label:'Your on-set craft',required:true,locked:true},
  {id:'photo',label:'Profile photo',required:false},
  {id:'credits',label:'A credit you’re proud of',required:true,locked:true},
  {id:'imdb',label:'IMDb profile',required:false},
  {id:'services',label:'Your services beyond the set',required:true,locked:true},
  {id:'rate',label:'Starting hourly rate',required:false},
  {id:'location',label:'Where you’ll work',required:false},
  {id:'about',label:'A little about you',required:false},
];
export function validateProfile(p,fields=fieldDefinitions){
 const e={};
 for(const f of fields){ if(!f.required)continue;
 const v=p[f.id]; const valid=f.id==='credits'?Array.isArray(v)&&v.some(c=>c.trim()):f.id==='services'?Array.isArray(v)&&v.some(s=>s.title.trim()):String(v||'').trim();
 if(!valid)e[f.id]=`Add ${f.label.toLowerCase()}.`;
 }
 if(p.rate!==''&&(!Number.isFinite(Number(p.rate))||Number(p.rate)<0))e.rate='Enter a starting rate of zero or more.';
 if(p.imdb&&!/^https:\/\/(www\.)?imdb\.com\/name\/nm\d+\/?$/.test(p.imdb.trim()))e.imdb='Use an IMDb name link, such as https://www.imdb.com/name/nm1234567/.';
 for(const s of p.services||[])if(s.rate!==''&&s.rate!=null&&(!Number.isFinite(Number(s.rate))||Number(s.rate)<0))e.services='Service rates must be zero or more.';
 return e;
}
export const samples=[
 {id:'maya',name:'Maya Chen',craft:'Costume & wardrobe',photo:'maya.jpg',cover:'maya-workspace.png',location:'Silver Lake, Los Angeles',rate:'45',about:'A costume-minded eye for the clothes you already love. I bring the care, resourcefulness, and attention to detail of a wardrobe department to everyday life. Let’s make something feel like you.',credits:['The Last Light · Costume supervisor','Sunday Morning · Wardrobe assistant'],imdb:'',availability:true,skills:['Alterations','Personal styling','Garment care'],services:[{id:'m1',title:'The perfect fit',description:'Thoughtful alterations, from a much-loved jacket to something for a special occasion.',image:'maya-workspace.png',rate:'45'},{id:'m2',title:'A wardrobe that works',description:'A fresh eye on your closet. Keep what you love, discover new combinations.',image:'maya-3.jpg',rate:'55'}]},
 {id:'jordan',name:'Jordan Ellis',craft:'Props & custom builds',photo:'jordan-candid.png',cover:'jordan-1.jpg',location:'Echo Park, Los Angeles',rate:'55',about:'My workshop is where second chances happen. A wobbly chair, a custom shelf, an idea sketched on a napkin — I like figuring out how to make it work. Twenty years of building for the camera, now building for your home.',credits:['North of Sunset · Prop maker'],availability:true,skills:['Furniture repair','Custom builds','Woodworking'],services:[{id:'j1',title:'Furniture with a second act',description:'Practical repairs for the pieces you’d rather keep.',image:'jordan-3.jpg',rate:'55'},{id:'j2',title:'Made for your space',description:'Shelving, small builds, and one-of-a-kind details.',image:'jordan-1.jpg',rate:'65'}]},
 {id:'alex',name:'Alex Rivera',craft:'Decor & event styling',photo:'alex.jpg',cover:'alex-2.jpg',location:'Los Feliz, Los Angeles',rate:'60',about:'I love the small details that make people feel welcome. From intimate dinners to a living room that needs a little love, I bring a set decorator’s eye and a very practical approach.',credits:['A Place for Us · Set decorator'],availability:false,skills:['Event styling','Home refresh','Sourcing'],services:[{id:'a1',title:'A table worth gathering around',description:'Considered styling for your next celebration.',image:'alex-3.jpg',rate:'60'}]},
 {id:'priya',name:'Priya Shah',craft:'Lighting & atmosphere',photo:'priya.jpg',cover:'priya-4.jpg',location:'Burbank, Los Angeles',rate:'60',about:'Good light changes everything. I help make spaces warmer, portraits more natural, and gatherings a little more magical, with lighting plans that make sense for your space.',credits:['After Hours · Lighting technician'],availability:true,skills:['Event lighting','Home lighting','Portrait lighting'],services:[{id:'p1',title:'Set the mood',description:'Warm, thoughtful light for your gathering.',image:'priya-4.jpg',rate:'60'}]},
 {id:'sam',name:'Sam Brooks',craft:'Photography & portraits',photo:'sam.jpg',cover:'sam-1.jpg',location:'Pasadena, Los Angeles',rate:'75',about:'Relaxed portraits and honest moments. My favorite photographs feel like the person in front of the camera, not a pose. Available for portraits, products, and the occasional small wedding.',credits:['Ordinary Days · Still photographer'],availability:true,skills:['Portraits','Product photography','Events'],services:[{id:'s1',title:'Portraits that feel like you',description:'A relaxed session, natural light, and photos you’ll actually want to use.',image:'sam-2.jpg',rate:'75'}]},
 {id:'morgan',name:'Morgan Lee',craft:'Set design & spaces',photo:'morgan.jpg',cover:'morgan-1.jpg',location:'Highland Park, Los Angeles',rate:'65',about:'A space can tell your story. I help turn a tricky corner, a spare room, or a whole new home into somewhere that feels considered and completely yours.',credits:['Open House · Production designer'],availability:false,skills:['Space planning','Home styling','Creative direction'],services:[{id:'ml1',title:'A fresh perspective on your space',description:'Practical layout ideas and styling, without starting from scratch.',image:'morgan-2.jpg',rate:'65'},{id:'ml2',title:'Let’s talk ideas',description:'A creative consultation to get your project moving.',image:'',rate:'65'}]},
];
export function sampleProfile(id='maya'){return {...blankProfile,...samples.find(p=>p.id===id)||samples[0]};}
