const fs=require('fs'),zlib=require('zlib');
function loadPng(f){
  const b=fs.readFileSync(f);
  const w=b.readUInt32BE(16),h=b.readUInt32BE(20),ct=b[25];
  let off=8;const ch=[];
  while(off<b.length){const l=b.readUInt32BE(off);const t=b.slice(off+4,off+8).toString('ascii');const d=b.slice(off+8,off+8+l);ch.push({t,d:Buffer.from(d)});off+=12+l;if(t==='IEND')break;}
  const idat=ch.filter(c=>c.t==='IDAT');
  const bufs=idat.map(c=>c.d);
  const raw=zlib.inflateSync(Buffer.concat(bufs));
  const channels=ct===2?3:4;
  const stride=w*channels+1;
  const px=[];
  for(let y=0;y<h;y++){
    const rs=y*stride+1;const row=[];
    for(let x=0;x<w;x++){const p=rs+x*channels;row.push({r:raw[p],g:raw[p+1],b:raw[p+2],a:raw[p+3]||255});}
    px.push(row);
  }
  return{w,h,px};
}
function avg(p,sx,sy,sz){
  let r=0,g=0,b=0,c=0;
  for(let y=sy;y<sy+sz&&y<p.h;y++)
    for(let x=sx;x<sx+sz&&x<p.w;x++){
      if(p.px[y][x].a>128){r+=p.px[y][x].r;g+=p.px[y][x].g;b+=p.px[y][x].b;c++;}
    }
  return c?Math.round(r/c)+','+Math.round(g/c)+','+Math.round(b/c):'EMPTY';
}
function colorDiff(c1,c2){
  const a=c1.split(',').map(Number),b=c2.split(',').map(Number);
  return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
}

const S=17,T=16;
const bg=loadPng('assets/images/backgrounds.png');
const sp=loadPng('assets/images/sprites.png');

console.log('=== backgrounds.png ROW 0 positions 0-10 ===');
for(let i=0;i<=10;i++){console.log('  pos'+i+' (tile#'+(i+1)+'): rgb('+avg(bg,i*S,0,S)+')');}

console.log('\n=== sprites.png ROW 0 positions 0-10 ===');
for(let i=0;i<=10;i++){console.log('  pos'+i+' (tile#'+(i+1)+'): rgb('+avg(sp,i*S,0,S)+')');}

// What the code draws for each base tile
const BASE={WATER:54,GRASS:1,SAND:29,DIRT:38,STONE:33,LAVA:367};
console.log('\n=== Code draws (tileIndex-1): backgrounds.png ===');
for(const[n,i]of Object.entries(BASE)){const c=(i-1)%61,r=Math.floor((i-1)/61);console.log('  '+n.padEnd(8)+'#'+i+' -> pos('+c+','+r+') -> rgb('+avg(bg,c*S,r*S,S)+')');}
console.log('\n=== Code draws (tileIndex-1): sprites.png ===');
for(const[n,i]of Object.entries(BASE)){const c=(i-1)%61,r=Math.floor((i-1)/61);console.log('  '+n.padEnd(8)+'#'+i+' -> pos('+c+','+r+') -> rgb('+avg(sp,c*S,r*S,S)+')');}

// What if the code used raw index (no -1)?
console.log('\n=== Raw index (no -1): sprites.png ===');
for(const[n,i]of Object.entries(BASE)){const c=i%61,r=Math.floor(i/61);console.log('  '+n.padEnd(8)+'#'+i+' -> pos('+c+','+r+') -> rgb('+avg(sp,c*S,r*S,S)+')');}

// Check backgrounds.png at ALL tile indices in first 2 rows to find the grass tile
console.log('\n=== backgrounds.png: Find GREEN tiles in rows 0-2 ===');
for(let row=0;row<3;row++){
  for(let col=0;col<61;col++){
    const a=avg(bg,col*S,row*S,S);
    const parts=a.split(',').map(Number);
    if(parts[1]>parts[0]+10 && parts[1]>parts[2]+10){
      const idx=row*61+col+1;
      console.log('  GREEN at pos('+col+','+row+') tile#'+idx+' -> rgb('+a+')');
    }
  }
}

console.log('\n=== sprites.png: Find GREEN tiles in rows 0-2 ===');
for(let row=0;row<3;row++){
  for(let col=0;col<61;col++){
    const a=avg(sp,col*S,row*S,S);
    const parts=a.split(',').map(Number);
    if(parts[1]>parts[0]+10 && parts[1]>parts[2]+10){
      const idx=row*61+col+1;
      console.log('  GREEN at pos('+col+','+row+') tile#'+idx+' -> rgb('+a+')');
    }
  }
}

// Check backgrounds.png for ALL colored tiles in first 10 rows
console.log('\n=== backgrounds.png: Find distinctly colored tiles in rows 0-9 ===');
const found=new Set();
for(let row=0;row<10;row++){
  for(let col=0;col<61;col++){
    const a=avg(bg,col*S,row*S,S);
    if(a==='EMPTY')continue;
    const parts=a.split(',').map(Number);
    const brightness=(parts[0]+parts[1]+parts[2])/3;
    const saturation=Math.max(parts[0],parts[1],parts[2])-Math.min(parts[0],parts[1],parts[2]);
    if(saturation>30 || brightness>150){
      const idx=row*61+col+1;
      if(!found.has(idx)){
        found.add(idx);
        console.log('  #'+idx.toString().padEnd(5)+'pos('+col+','+row+') rgb('+a+') brightness='+Math.round(brightness)+' sat='+saturation);
      }
    }
  }
}
