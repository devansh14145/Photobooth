// ---- State ----
const state = {
  images: [], // Array of Image objects or dataURLs (length up to 4)
  cameraStream: null,
  capturedCount: 0,
  stickers: [] // DOM elements for stickers
};

// ---- Page refs ----
const startPage = document.getElementById('startPage');
const choicePage = document.getElementById('choicePage');
const cameraPage = document.getElementById('cameraPage');
const uploadPage = document.getElementById('uploadPage');
const editorPage = document.getElementById('editorPage');

function showPage(page){
  [startPage, choicePage, cameraPage, uploadPage, editorPage].forEach(p=>p.classList.remove('active'));
  page.classList.add('active');
}

// ---- Start flow ----
document.getElementById('startBtn').addEventListener('click',()=> showPage(choicePage));
document.getElementById('choiceBack').addEventListener('click',()=> showPage(startPage));

// ---- Camera flow ----
const video = document.getElementById('cameraPreview');
const captureBtn = document.getElementById('captureBtn');
const captureStatus = document.getElementById('captureStatus');

document.getElementById('clickPhotoBtn').addEventListener('click', async ()=>{
  showPage(cameraPage);
  // request camera
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    state.cameraStream = stream;
    video.srcObject = stream;
    state.images = [];
    state.capturedCount = 0;
    captureStatus.textContent = `Total Capture: ${state.capturedCount}/4`;
  }catch(err){
    alert('NO Camera Acces ludo: '+err.message);
    showPage(choicePage);
  }
});

document.getElementById('cameraBack').addEventListener('click',()=>{
  stopCamera();
  showPage(choicePage);
});

function stopCamera(){
  if(state.cameraStream){
    state.cameraStream.getTracks().forEach(t=>t.stop());
    state.cameraStream = null;
  }
}

captureBtn.addEventListener('click',()=>{
  if(!video.srcObject) return;
  const w = video.videoWidth; const h = video.videoHeight;
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const ctx = c.getContext('2d'); ctx.drawImage(video,0,0,w,h);
  const data = c.toDataURL('image/png');
  state.images.push(data);
  state.capturedCount++;
  captureStatus.textContent = `Total Capture: ${state.capturedCount}/4`;
  if(state.capturedCount>=4){
    stopCamera();
    goToEditor();
  }
});

// ---- Upload flow ----
document.getElementById('uploadPhotoBtn').addEventListener('click',()=>{
  showPage(uploadPage);
  state.images = [];
  document.getElementById('fileInput').value = null;
});
document.getElementById('uploadBack').addEventListener('click',()=> showPage(choicePage));

document.getElementById('uploadNext').addEventListener('click', ()=>{
  const files = Array.from(document.getElementById('fileInput').files || []);
  if(files.length < 4){ alert('Choose 4 photos'); return; }
  const chosen = files.slice(0,4);
  Promise.all(chosen.map(f=>readFileAsDataURL(f))).then(arr=>{
    state.images = arr;
    goToEditor();
  }).catch(err=>alert('Cant Read File: '+err.message));
});

function readFileAsDataURL(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ---- Editor / Collage ----
const canvas = document.getElementById('collageCanvas');
const stickerLayer = document.getElementById('stickerLayer');
const ctx = canvas.getContext('2d');

function goToEditor(){
  showPage(editorPage);
  while(state.images.length < 4) state.images.push(blankDataURL(600,600,'#ccc'));
  renderCollage();
  renderStickerPalette();
}

function blankDataURL(w,h,fill){
  const c = document.createElement('canvas'); c.width=w; c.height=h; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0,0,w,h); return c.toDataURL();
}

// Handle canvas size responsively based on preview-box size
function resizeCanvasToContainer(){
  const box = document.querySelector('.preview-box');
  const rect = box.getBoundingClientRect();
  const size = Math.floor(rect.width);
  canvas.width = size; canvas.height = size;
}

window.addEventListener('resize', ()=>{ resizeCanvasToContainer(); renderCollage(); positionStickers(); });

document.getElementById('frameSelect').addEventListener('change', renderCollage);
document.getElementById('setBg').addEventListener('click', ()=>{ document.querySelector('.preview-box').style.backgroundImage = `url(${document.getElementById('bgUrl').value})`; });

function renderCollage(){
  resizeCanvasToContainer();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const frame = document.getElementById('frameSelect').value;
  const pad = Math.floor(canvas.width * 0.03);
  const cellW = Math.floor((canvas.width - pad*3)/2);
  const cellH = cellW;
  const imgs = state.images;

  function drawCover(img, x,y,w,h,mask){
    const image = new Image(); image.src = img;
    image.onload = ()=>{
      const arSrc = image.width / image.height;
      const arDst = w / h;
      let sx=0, sy=0, sw=image.width, sh=image.height;
      if(arSrc > arDst){
        sh = image.height; sw = Math.round(sh * arDst); sx = Math.round((image.width - sw)/2);
      } else {
        sw = image.width; sh = Math.round(sw / arDst); sy = Math.round((image.height - sh)/2);
      }
      ctx.save();
      if(mask === 'circle'){
        ctx.beginPath(); ctx.arc(x+w/2,y+h/2, Math.min(w,h)/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
        ctx.drawImage(image, sx,sy,sw,sh, x,y,w,h);
      } else {
        ctx.drawImage(image, sx,sy,sw,sh, x,y,w,h);
      }
      ctx.restore();
      if(frame === 'frame1'){
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(6, canvas.width*0.01); ctx.strokeRect(x,y,w,h);
      }
    };
  }

  const positions = [
    {x:pad, y:pad},
    {x:pad*2+cellW, y:pad},
    {x:pad, y:pad*2+cellH},
    {x:pad*2+cellW, y:pad*2+cellH}
  ];

  for(let i=0;i<4;i++){
    const pos = positions[i];
    const mask = (frame === 'frame2') ? 'circle' : 'rect';
    drawCover(imgs[i], pos.x, pos.y, cellW, cellH, mask);
  }
}

// ---- Stickers ----
const stickerPalette = document.getElementById('stickerPalette');
const defaultStickers = ['🧡','😎','✨','🎉','🌸','⭐','📍','❤️'];

function renderStickerPalette(){
  stickerPalette.innerHTML = '';
  defaultStickers.forEach(s=>{
    const btn = document.createElement('button'); btn.className='sticker-btn'; btn.innerText = s;
    btn.addEventListener('click', ()=> addSticker(s));
    stickerPalette.appendChild(btn);
  });
}

function addSticker(content){
  const el = document.createElement('div'); el.className='sticker'; el.innerText = content;
  el.style.left = '50%'; el.style.top = '50%'; el.style.transform = 'translate(-50%,-50%)';
  el.style.fontSize = '38px'; el.style.userSelect='none'; el.setAttribute('role','button');
  stickerLayer.appendChild(el);
  makeDraggable(el);
  state.stickers.push(el);
}

function makeDraggable(el){
  let isDown=false, startX=0, startY=0, origX=0, origY=0;
  el.addEventListener('pointerdown', (e)=>{
    el.setPointerCapture(e.pointerId);
    isDown=true; el.style.cursor='grabbing';
    const r = el.getBoundingClientRect();
    const parentRect = stickerLayer.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    origX = r.left - parentRect.left; origY = r.top - parentRect.top;
  });
  el.addEventListener('pointermove', (e)=>{
    if(!isDown) return;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    const parentRect = stickerLayer.getBoundingClientRect();
    const nx = Math.max(0, Math.min(parentRect.width - el.offsetWidth, origX + dx));
    const ny = Math.max(0, Math.min(parentRect.height - el.offsetHeight, origY + dy));
    el.style.left = nx + 'px'; el.style.top = ny + 'px'; el.style.transform = '';
  });
  el.addEventListener('pointerup', (e)=>{ isDown=false; el.style.cursor='grab'; el.releasePointerCapture(e.pointerId); });
  el.addEventListener('dblclick', ()=>{ el.remove(); state.stickers = state.stickers.filter(s=>s!==el); });
}

function positionStickers(){
  // sticker positions are CSS-based; nothing required here for now
}

document.getElementById('resetStickers').addEventListener('click', ()=>{
  state.stickers.forEach(s=>s.remove()); state.stickers = [];
});

// ---- Download / Merge ----
document.getElementById('downloadBtn').addEventListener('click', async ()=>{
  const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height; const g = out.getContext('2d');
  const bgImg = document.querySelector('.preview-box').style.backgroundImage;
  if(bgImg && bgImg !== 'none'){
    const url = bgImg.replace(/^url\("?|'?/, '').replace(/\"?'?\)$/, '');
    try{
      const img = await loadImage(url);
      g.drawImage(img,0,0,out.width,out.height);
    }catch(err){ /* ignore */ }
  } else {
    g.fillStyle = '#ffffff'; g.fillRect(0,0,out.width,out.height);
  }

  g.drawImage(canvas,0,0);

  for(const st of state.stickers){
    const rect = st.getBoundingClientRect();
    const layerRect = stickerLayer.getBoundingClientRect();
    const x = (rect.left - layerRect.left) / layerRect.width * out.width;
    const y = (rect.top - layerRect.top) / layerRect.height * out.height;
    const w = rect.width / layerRect.width * out.width;
    const h = rect.height / layerRect.height * out.height;
    const txt = st.innerText || '';
    if(txt){
      g.font = Math.floor(h*0.9) + 'px serif';
      g.textBaseline = 'top';
      g.fillText(txt, x, y + h*0.05);
    }
  }

  const dataURL = out.toDataURL('image/png');
  triggerDownload(dataURL, 'collage.png');
});

function triggerDownload(dataURL, filename){
  const a = document.createElement('a'); a.href = dataURL; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}

function loadImage(src){
  return new Promise((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=(()=>res(i)); i.onerror=(()=>rej(new Error('Image load failed'))); i.src=src; });
}

// Back from editor
document.getElementById('editorBack').addEventListener('click', ()=>{
  state.images = [];
  state.stickers.forEach(s=>s.remove()); state.stickers = [];
  showPage(startPage);
});

document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') stopCamera(); });

document.getElementById('startBtn').addEventListener('keypress', (e)=>{ if(e.key==='Enter') showPage(choicePage); });
