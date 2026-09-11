import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';

const $=s=>document.querySelector(s),host=$('#viewer');
const state={backing:true,bleed:false,cut:false,holo:true,selected:null};
const WIDTH=.148,HEIGHT=.210,DEPTH=.00048;
const eyeOn='<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOff='<svg viewBox="0 0 24 24"><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 3.8M6.2 6.2A23 23 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.8-1.7"/></svg>';
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
catch{showError('Ton navigateur ne peut pas afficher la 3D. Essaie avec un navigateur récent.');}
function showError(message){$('#loading').textContent=message;$('#loading').setAttribute('role','alert');document.querySelectorAll('button').forEach(b=>b.disabled=true);}
if(renderer)start().catch(e=>{console.error(e);showError('Les visuels n’ont pas pu se charger. Recharge la page pour réessayer.');});

async function start(){
renderer.setClearColor(0x000000);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden','true');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.005,20);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=.075;controls.maxDistance=1.8;controls.rotateSpeed=.58;controls.zoomSpeed=.7;
const loader=new THREE.TextureLoader();
const [sheetTex,bleedTex,cutTex,data]=await Promise.all([
 loader.loadAsync('./assets/sheet.png'),loader.loadAsync('./assets/bleed.png'),loader.loadAsync('./assets/contour.png'),fetch('./assets/contours.json').then(r=>{if(!r.ok)throw Error('Contours indisponibles');return r.json()})
]);
for(const t of [sheetTex,bleedTex,cutTex]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
const light={value:new THREE.Vector3(-.15,.28,.42)},holo={value:1};
// Surface-bound diffraction: colour depends on viewing direction, a fixed studio
// light and local grating direction. The artwork never changes with the camera.
const vertexShader=`varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;
 void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;
const fragmentShader=`uniform sampler2D uMap;uniform float uHolo;uniform vec3 uLight;
 varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;
 vec3 spectrum(float phase){return .5+.5*cos(6.2831853*(phase+vec3(0.0,.333,.667)));}
 void main(){vec4 tex=texture2D(uMap,vUv);if(tex.a<.1)discard;
 vec3 N=normalize(vNormalWorld);vec3 V=normalize(cameraPosition-vWorld);vec3 L=normalize(uLight-vWorld);
 if(!gl_FrontFacing||N.z<0.){gl_FragColor=vec4(vec3(.67),tex.a);}
 else{vec3 T=normalize(vec3(1.,.18,0.));vec3 B=normalize(cross(N,T));
 float facing=max(dot(N,V),.0);float ndl=max(dot(N,L),.0);
 float grating=dot(V+L,T)*1.55+dot(V+L,B)*.22;
 float phase=grating+(vUv.x*1.35+vUv.y*.85)+.07*sin(vUv.y*13.0+vUv.x*4.0);
 vec3 rainbow=spectrum(phase)*.82+.13;
 vec3 H=normalize(V+L);float broad=pow(max(dot(N,H),0.),5.0);
 float strip=pow(max(dot(N,normalize(V+normalize(vec3(-.6,.5,1.)))) ,0.),90.);
 float film=(.13+.46*broad+.12*pow(1.-facing,2.))*(.75+.25*ndl);
 float luminous=dot(tex.rgb,vec3(.2126,.7152,.0722));
 // Opaque black ink stays dark; the laminate adds a restrained surface highlight.
 vec3 base=tex.rgb*(.92+.08*ndl);
 vec3 foil=base*(.74+.48*rainbow)+rainbow*film*(.025+.33*luminous);
 foil+=vec3(strip*.1)*(.12+.5*luminous);
 gl_FragColor=vec4(mix(base,foil,uHolo),tex.a);}
 #include <colorspace_fragment>
 }`;
function foilMaterial(map){return new THREE.ShaderMaterial({uniforms:{uMap:{value:map},uHolo:holo,uLight:light},vertexShader,fragmentShader,side:THREE.DoubleSide,transparent:false});}
const root=new THREE.Group();scene.add(root);
const board=new THREE.Group();root.add(board);
const edgeMat=new THREE.MeshBasicMaterial({color:0xbcb9b1});
const thickness=new THREE.Mesh(new THREE.BoxGeometry(WIDTH,HEIGHT,DEPTH),new THREE.MeshBasicMaterial({color:0xd1cdcd}));thickness.position.z=-DEPTH/2;board.add(thickness);
const frontMaterial=foilMaterial(sheetTex);
const front=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,HEIGHT),frontMaterial);front.position.z=.00001;board.add(front);
const worldPoint=([x,y])=>new THREE.Vector2((x/data.width-.5)*WIDTH,(.5-y/data.height)*HEIGHT);
const stickers=data.stickers.map((s,index)=>{
 const group=new THREE.Group();root.add(group);
 const points=s.points.map(worldPoint);const shape=new THREE.Shape(points);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.00019,bevelEnabled:false,curveSegments:1,UVGenerator:{
  generateTopUV:(g,v,a,b,c)=>[a,b,c].map(i=>new THREE.Vector2(v[i*3]/WIDTH+.5,v[i*3+1]/HEIGHT+.5)),
  generateSideWallUV:()=>[new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2()]
 }});
 const mesh=new THREE.Mesh(geometry,[foilMaterial(sheetTex),edgeMat]);mesh.position.z=.00004;mesh.userData.index=index;group.add(mesh);
 // Bleed is taken from the supplied bleed artwork, with a 2 mm display margin
 // outside each source cut path. It is a separate layer, not a colour effect.
 const canvas=document.createElement('canvas');canvas.width=data.width;canvas.height=data.height;
 const ctx=canvas.getContext('2d');ctx.beginPath();s.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=22;ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.stroke();ctx.globalCompositeOperation='source-in';ctx.drawImage(bleedTex.image,0,0);
 const extendedTexture=new THREE.CanvasTexture(canvas);extendedTexture.colorSpace=THREE.SRGBColorSpace;extendedTexture.anisotropy=sheetTex.anisotropy;
 const extended=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,HEIGHT),foilMaterial(extendedTexture));extended.position.z=.00025;group.add(extended);
 const contour=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({map:cutTex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 const uv=contour.geometry.getAttribute('uv'),pos=contour.geometry.getAttribute('position');for(let j=0;j<uv.count;j++)uv.setXY(j,pos.getX(j)/WIDTH+.5,pos.getY(j)/HEIGHT+.5);uv.needsUpdate=true;contour.position.z=.00036;contour.renderOrder=4;group.add(contour);
 const [x,y,w,h]=s.bounds;return {group,mesh,extended,contour,name:s.name,center:worldPoint([x+w/2,y+h/2]),width:w/data.width*WIDTH,height:h/data.height*HEIGHT};
});
// Whole-sheet contour keeps internal cut paths from the supplied file visible.
const fullCut=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,HEIGHT),new THREE.MeshBasicMaterial({map:cutTex,transparent:true,depthWrite:false,side:THREE.FrontSide}));fullCut.position.z=.0004;fullCut.renderOrder=5;root.add(fullCut);
let fitDistance=.5,transition=null;
function animateCamera(target,distance,frontView=false){
 const dir=frontView?new THREE.Vector3(.03,.04,1).normalize():camera.position.clone().sub(controls.target).normalize();
 transition={target:target.clone(),position:target.clone().addScaledVector(dir,Math.min(controls.maxDistance,Math.max(controls.minDistance,distance)))};
}
function fit(reset=false){
 const h=innerHeight,w=innerWidth,usable=Math.max(150,h-(w<700?285:240));
 fitDistance=Math.max(HEIGHT*h/usable,WIDTH/camera.aspect*1.25)/(2*Math.tan(THREE.MathUtils.degToRad(17.5)));
 if(reset){controls.target.set(0,0,0);camera.position.copy(new THREE.Vector3(.10,.09,1).normalize().multiplyScalar(fitDistance));controls.update();}
}
function setSelection(index){
 if(index!==null&&(!Number.isInteger(index)||index<0||index>=stickers.length))return;
 state.selected=index;if(index!==null){state.backing=false;const s=stickers[index];animateCamera(new THREE.Vector3(s.center.x,s.center.y,0),Math.max(s.height,s.width/camera.aspect)*2.65,true);}
 else animateCamera(new THREE.Vector3(),fitDistance,true);
 update();
}
function update(){
 for(const b of document.querySelectorAll('[data-layer]')){const active=state[b.dataset.layer];b.setAttribute('aria-pressed',active);b.querySelector('.eye').innerHTML=active?eyeOn:eyeOff;}
 board.visible=state.backing;frontMaterial.uniforms.uMap.value=state.bleed?bleedTex:sheetTex;holo.value=Number(state.holo);
 stickers.forEach((s,i)=>{s.group.visible=state.selected===null||state.selected===i;s.extended.visible=state.bleed&&!state.backing;s.mesh.visible=!s.extended.visible;s.contour.visible=state.cut&&state.selected!==null;});
 fullCut.visible=state.cut&&state.selected===null;
 $('#view-name').textContent=state.selected!==null?stickers[state.selected].name:state.backing?'La planche':'Les 11 adhésifs';
 $('.finish').style.opacity=state.holo?'1':'.35';$('#selection').hidden=state.selected===null;
 if(state.selected!==null)$('#selection-name').textContent=stickers[state.selected].name;
 const touch=matchMedia('(pointer:coarse)').matches;
 $('#hint').textContent=state.backing?(touch?'Glisse pour tourner · Pince pour zoomer':'Glisse pour tourner · Molette pour zoomer'):(state.selected!==null?'Échap pour tout afficher · ← → pour changer de sticker':(touch?'Touche un sticker pour l’isoler':'Clique un sticker pour l’isoler'));
 host.setAttribute('aria-label',`Visionneuse 3D : ${state.selected!==null?stickers[state.selected].name:state.backing?'planche A5':'11 adhésifs sans fond'}. Flèches pour tourner, plus et moins pour zoomer, Échap pour réinitialiser.`);
}
function toggleLayer(layer,visible){if(!(layer in state)||layer==='selected')return;state[layer]=visible??!state[layer];if(layer==='backing'&&state.backing){state.selected=null;animateCamera(new THREE.Vector3(),fitDistance,true);}update();}
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>toggleLayer(b.dataset.layer));
function zoom(factor){animateCamera(controls.target,camera.position.distanceTo(controls.target)*factor);}
$('#zoom-in').onclick=()=>zoom(.8);$('#zoom-out').onclick=()=>zoom(1.25);
$('#reset').onclick=()=>{state.selected=null;animateCamera(new THREE.Vector3(),fitDistance,true);update();};$('#unselect').onclick=()=>setSelection(null);
controls.addEventListener('start',()=>transition=null);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{
 if(state.backing||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}
 const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(stickers.filter(s=>s.group.visible).map(s=>s.mesh))[0];if(hit)setSelection(hit.object.userData.index);down=null;
});
addEventListener('keydown',e=>{
 if(e.target.matches('input,select,textarea'))return;
 if(e.key==='Escape'){setSelection(null);return;}
 if(e.target!==host)return;
 if(e.key==='Enter'&&!state.backing&&state.selected===null){setSelection(0);return;}
 if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
 if(e.key==='+'||e.key==='=')zoom(.85);if(e.key==='-')zoom(1.15);
 if(state.selected!==null&&['ArrowLeft','ArrowRight'].includes(e.key)){setSelection((state.selected+(e.key==='ArrowRight'?1:stickers.length-1))%stickers.length);return;}
 const axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
 if(e.key.startsWith('Arrow')){transition=null;const delta=e.key==='ArrowRight'||e.key==='ArrowDown'?-.12:.12;camera.position.sub(controls.target).applyAxisAngle(axis,delta).add(controls.target);controls.update();}
});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,0,w<700?75:20,w,h);camera.updateProjectionMatrix();fit(true);if(state.selected!==null){const i=state.selected;setSelection(i);}}
addEventListener('resize',resize);resize();update();$('#loading').remove();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();const status=document.createElement('div');status.id='loading';status.textContent='La 3D a été mise en pause. Recharge la page pour continuer.';host.appendChild(status);renderer.setAnimationLoop(null);});
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
renderer.setAnimationLoop(()=>{
 if(document.hidden)return;
 if(transition){const f=reduced?1:.13;camera.position.lerp(transition.position,f);controls.target.lerp(transition.target,f);if(camera.position.distanceTo(transition.position)<.00002&&controls.target.distanceTo(transition.target)<.00002)transition=null;}
 controls.update();renderer.render(scene,camera);
});
// Optional browser-native controls, progressively enhanced where supported.
const modelContext=document.modelContext??navigator.modelContext;
if(modelContext?.registerTool){
 const lifecycle=new AbortController();
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const register=tool=>{try{Promise.resolve(modelContext.registerTool({...tool,annotations:{readOnlyHint:false,untrustedContentHint:false}},{signal:lifecycle.signal})).catch(console.warn);}catch(e){console.warn(e);}};
 register({name:'set_sticker_layers',description:'Afficher ou masquer les calques de la visionneuse DBM.',inputSchema:{type:'object',properties:{backing:{type:'boolean'},bleed:{type:'boolean'},cut:{type:'boolean'},holo:{type:'boolean'}}},execute:async args=>{if(!args||Object.entries(args).some(([k,v])=>!['backing','bleed','cut','holo'].includes(k)||typeof v!=='boolean'))throw new Error('Calques invalides');for(const k of ['backing','bleed','cut','holo'])if(typeof args[k]==='boolean')toggleLayer(k,args[k]);return {content:[{type:'text',text:JSON.stringify(state)}]};}});
 register({name:'inspect_sticker',description:'Isoler un des 11 stickers (index de 0 à 10), ou tous les afficher avec -1.',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:-1,maximum:10}},required:['index']},execute:async({index})=>{if(!Number.isInteger(index)||index< -1||index>10)throw new Error('Index invalide');setSelection(index===-1?null:index);return {content:[{type:'text',text:JSON.stringify(state)}]};}});
}
}
