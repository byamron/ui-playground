/**
 * Generates a self-contained HTML file with the bouncing logo animation.
 * The output has zero external dependencies — SVG is inlined, animation is vanilla JS.
 */

interface ExportOptions {
  svgDataUrl: string;
  config: {
    speed: number;
    size: number;
    bounce: number;
    shake: number;
    trail: number;
    cornerSeek: number;
  };
  aspectRatio: number;
  showCornerText: boolean;
  showCounter: boolean;
  bgColor: string;
}

export function generateExportHtml(opts: ExportOptions): string {
  const { svgDataUrl, config, aspectRatio, showCornerText, showCounter, bgColor } = opts;
  const logoW = Math.round(80 * aspectRatio);
  const safeSrc = svgDataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `<!DOCTYPE html>
<!-- Bouncing logo loading screen. Drop this file in your project or embed in an iframe. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Loading</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:${bgColor}}
canvas{display:block;width:100%;height:100%}
#stats{position:fixed;bottom:20px;left:20px;font-family:"SF Mono","Fira Code",monospace;font-size:11px;color:rgba(255,255,255,0.3);display:${showCounter ? "flex" : "none"};gap:20px;align-items:baseline}
#stats .sep{width:1px;height:10px;background:rgba(255,255,255,0.1);display:inline-block}
#stats span{font-variant-numeric:tabular-nums}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="stats"><span>bounces <span id="b">0</span></span><span class="sep"></span><span>corners <span id="k">0</span></span></div>
<script>
(function(){
var COLORS=["#e24a4a","#4a9ee2","#e2c84a","#4ae270","#c84ae2","#e2824a","#4ae2d4"];
var CFG={speed:${config.speed},size:${config.size},bounce:${config.bounce},shake:${config.shake},trail:${config.trail},cornerSeek:${config.cornerSeek}};
var elasticity=CFG.bounce*0.85;
var deformAmt=CFG.bounce*0.75;
var LOGO_W=${logoW}*CFG.size,LOGO_H=80*CFG.size;
var SHOW_CORNER_TEXT=${showCornerText};
var SHOW_COUNTER=${showCounter};

var canvas=document.getElementById("c");
var ctx=canvas.getContext("2d");
var tintCanvas=document.createElement("canvas");
var img=new Image();
var bEl=document.getElementById("b");
var kEl=document.getElementById("k");

function resize(){
  var dpr=window.devicePixelRatio||1;
  canvas.width=window.innerWidth*dpr;
  canvas.height=window.innerHeight*dpr;
  canvas.style.width=window.innerWidth+"px";
  canvas.style.height=window.innerHeight+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener("resize",resize);

var s={
  x:80,y:60,
  vx:CFG.speed,vy:CFG.speed,
  colorIndex:0,
  deformX:{value:1,velocity:0},
  deformY:{value:1,velocity:0},
  particles:[],
  celebrating:false,celebrateTimer:0,
  bounceCount:0,cornerCount:0,
  cornerCooldown:0,
  consecutiveCornerHits:0,
  burstScale:{value:1,velocity:0},
  shakeX:{value:0,velocity:0},
  shakeY:{value:0,velocity:0},
  trailPositions:[]
};

function stepSpring(sp,target,stiffness,damping){
  var force=-stiffness*(sp.value-target);
  var drag=-damping*sp.velocity;
  sp.velocity+=(force+drag)/60;
  sp.value+=sp.velocity/60;
}

function spawnConfetti(cx,cy){
  for(var i=0;i<80;i++){
    var angle=Math.random()*Math.PI*2;
    var spd=3+Math.random()*8;
    s.particles.push({
      x:cx+(Math.random()-0.5)*40,
      y:cy+(Math.random()-0.5)*30,
      vx:Math.cos(angle)*spd,
      vy:Math.sin(angle)*spd-2,
      life:1,maxLife:50+Math.random()*50,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      size:3+Math.random()*5,
      rotation:Math.random()*Math.PI*2,
      rotationSpeed:(Math.random()-0.5)*0.3,
      shape:Math.random()>0.4?"rect":"circle"
    });
  }
  for(var i=0;i<16;i++){
    var angle=(Math.PI*2*i)/16;
    var spd=1.5+Math.random()*3;
    s.particles.push({
      x:cx,y:cy,
      vx:Math.cos(angle)*spd,
      vy:Math.sin(angle)*spd,
      life:1,maxLife:70+Math.random()*40,
      color:COLORS[s.colorIndex],
      size:8+Math.random()*8,
      rotation:0,rotationSpeed:0,
      shape:"circle"
    });
  }
}

function drawLogo(x,y,w,h,color,scaleX,scaleY){
  if(!img.complete)return;
  var dw=Math.ceil(w+4);
  var dh=Math.ceil(h+4);
  tintCanvas.width=dw;
  tintCanvas.height=dh;
  var tc=tintCanvas.getContext("2d");
  tc.clearRect(0,0,dw,dh);
  tc.drawImage(img,2,2,w,h);
  tc.globalCompositeOperation="source-in";
  tc.fillStyle=color;
  tc.fillRect(0,0,dw,dh);
  tc.globalCompositeOperation="source-over";
  ctx.save();
  ctx.translate(x+w/2,y+h/2);
  ctx.scale(scaleX,scaleY);
  ctx.shadowColor=color;
  ctx.shadowBlur=25;
  ctx.globalAlpha=0.3;
  ctx.drawImage(tintCanvas,-dw/2,-dh/2,dw,dh);
  ctx.shadowBlur=0;
  ctx.globalAlpha=1;
  ctx.drawImage(tintCanvas,-dw/2,-dh/2,dw,dh);
  ctx.restore();
}

function frame(){
  var W=window.innerWidth;
  var H=window.innerHeight;

  // Mid-flight steering toward nearest corner
  if(CFG.cornerSeek>0.3){
    var bounceW=W-LOGO_W,bounceH=H-LOGO_H;
    if(bounceW>0&&bounceH>0){
      var corners=[[0,0],[bounceW,0],[0,bounceH],[bounceW,bounceH]];
      var minDist=1e9,ncx=0,ncy=0;
      for(var ci=0;ci<4;ci++){
        var d=Math.sqrt(Math.pow(s.x-corners[ci][0],2)+Math.pow(s.y-corners[ci][1],2));
        if(d<minDist){minDist=d;ncx=corners[ci][0];ncy=corners[ci][1];}
      }
      if(minDist>1){
        var ta=Math.atan2(ncy-s.y,ncx-s.x);
        var ca=Math.atan2(s.vy,s.vx);
        var diff=ta-ca;
        while(diff>Math.PI)diff-=2*Math.PI;
        while(diff<-Math.PI)diff+=2*Math.PI;
        var prox=1-Math.min(1,minDist/Math.max(bounceW,bounceH));
        var ms=CFG.cornerSeek*0.008*(1+prox*3);
        var st=(diff>0?1:-1)*Math.min(ms,Math.abs(diff)*0.05);
        var co=Math.cos(st),si=Math.sin(st);
        var nvx=s.vx*co-s.vy*si;
        var nvy=s.vx*si+s.vy*co;
        s.vx=nvx;s.vy=nvy;
      }
    }
  }

  // Speed normalization
  var speed=Math.sqrt(s.vx*s.vx+s.vy*s.vy);
  if(speed>0.1){
    var targetSpeed=speed+(CFG.speed-speed)*0.005;
    var sc=targetSpeed/speed;
    s.vx*=sc;
    s.vy*=sc;
  }

  s.x+=s.vx;
  s.y+=s.vy;

  var hitX=false,hitY=false;
  if(s.x<=0){s.x=0;s.vx=Math.abs(s.vx);hitX=true;}
  else if(s.x+LOGO_W>=W){s.x=W-LOGO_W;s.vx=-Math.abs(s.vx);hitX=true;}
  if(s.y<=0){s.y=0;s.vy=Math.abs(s.vy);hitY=true;}
  else if(s.y+LOGO_H>=H){s.y=H-LOGO_H;s.vy=-Math.abs(s.vy);hitY=true;}

  // Corner snap
  if(CFG.cornerSeek>0&&((hitX&&!hitY)||(!hitX&&hitY))){
    var snapDist=CFG.speed*3+CFG.cornerSeek*20;
    if(hitX&&!hitY){
      if(s.y<snapDist){s.y=0;s.vy=Math.abs(s.vy);hitY=true;}
      else if(s.y+LOGO_H>H-snapDist){s.y=H-LOGO_H;s.vy=-Math.abs(s.vy);hitY=true;}
    }else{
      if(s.x<snapDist){s.x=0;s.vx=Math.abs(s.vx);hitX=true;}
      else if(s.x+LOGO_W>W-snapDist){s.x=W-LOGO_W;s.vx=-Math.abs(s.vx);hitX=true;}
    }
  }

  if(s.cornerCooldown>0)s.cornerCooldown--;

  if(hitX||hitY){
    s.colorIndex=(s.colorIndex+1)%COLORS.length;
    s.bounceCount++;
    var impactSpeed=Math.sqrt(s.vx*s.vx+s.vy*s.vy);
    var impactStrength=Math.min(1,impactSpeed/(CFG.speed*2));
    var squashAmount=impactStrength*(0.3+elasticity*0.4);
    var deformScale=deformAmt*2;

    if(hitX&&hitY&&s.cornerCooldown<=0){
      s.deformX.velocity=-squashAmount*80*deformScale;
      s.deformY.velocity=-squashAmount*80*deformScale;
      s.celebrating=true;
      s.celebrateTimer=150;
      s.cornerCount++;
      s.cornerCooldown=10;
      s.consecutiveCornerHits++;
      s.burstScale.value=1.2;
      s.burstScale.velocity=0;
      if(CFG.cornerSeek>0&&s.consecutiveCornerHits>=2){
        var pa=(0.15+Math.random()*0.25)*(Math.random()<0.5?1:-1);
        var co=Math.cos(pa),si=Math.sin(pa);
        var pvx=s.vx*co-s.vy*si;
        var pvy=s.vx*si+s.vy*co;
        s.vx=pvx;s.vy=pvy;
        s.consecutiveCornerHits=0;
      }
      if(SHOW_CORNER_TEXT&&s.particles.length<300)spawnConfetti(s.x+LOGO_W/2,s.y+LOGO_H/2);
      if(CFG.shake>0){
        var shakeStr=CFG.shake*25;
        s.shakeX.velocity+=(Math.random()*2-1)*shakeStr;
        s.shakeY.velocity+=(Math.random()*2-1)*shakeStr;
      }
    }else{
      if(hitX){
        s.deformX.velocity=-squashAmount*60*deformScale;
        s.deformY.velocity=squashAmount*30*deformScale;
      }else{
        s.deformY.velocity=-squashAmount*60*deformScale;
        s.deformX.velocity=squashAmount*30*deformScale;
      }
      // Corner seek: nudge velocity to hit nearest corner
      if(CFG.cornerSeek>0){
        var bW=W-LOGO_W,bH=H-LOGO_H;
        if(bW>0&&bH>0){
          var tVx=s.vx,tVy=s.vy;
          if(hitX&&!hitY){
            var tx=bW/Math.abs(s.vx);
            var dist=s.vy>0?(bH-s.y):s.y;
            if(dist<bH*0.08)dist+=bH;
            tVy=(s.vy>0?1:-1)*dist/tx;
          }else if(hitY&&!hitX){
            var ty=bH/Math.abs(s.vy);
            var dist=s.vx>0?(bW-s.x):s.x;
            if(dist<bW*0.08)dist+=bW;
            tVx=(s.vx>0?1:-1)*dist/ty;
          }
          var nudge=Math.min(1,CFG.cornerSeek*1.05);
          s.vx=s.vx+(tVx-s.vx)*nudge;
          s.vy=s.vy+(tVy-s.vy)*nudge;
          var ns=Math.sqrt(s.vx*s.vx+s.vy*s.vy);
          if(ns>0.1){s.vx=(s.vx/ns)*CFG.speed;s.vy=(s.vy/ns)*CFG.speed;}
        }
      }
      s.consecutiveCornerHits=0;
    }
  }

  // Spring deformation
  var stiffness=300+(1-elasticity)*400;
  var damping=8+(1-elasticity)*25;
  stepSpring(s.deformX,1,stiffness,damping);
  stepSpring(s.deformY,1,stiffness,damping);
  stepSpring(s.burstScale,1,200,18);
  var rawX=s.deformX.value;
  var rawY=s.deformY.value;
  var area=rawX*rawY;
  var correction=area>0.01?Math.sqrt(1/area):1;
  var blend=0.4;
  var finalScaleX=rawX*(1-blend)+(rawX*correction)*blend;
  var finalScaleY=rawY*(1-blend)+(rawY*correction)*blend;

  // Shake springs
  stepSpring(s.shakeX,0,600,30);
  stepSpring(s.shakeY,0,600,30);

  // Trail recording
  var maxTrail=Math.round(CFG.trail*40);
  if(maxTrail>0){
    s.trailPositions.push({x:s.x,y:s.y});
    while(s.trailPositions.length>maxTrail)s.trailPositions.shift();
  }

  // Particles
  for(var i=s.particles.length-1;i>=0;i--){
    var p=s.particles[i];
    p.x+=p.vx;p.y+=p.vy;
    p.vy+=0.08;p.vx*=0.99;p.vy*=0.99;
    p.rotation+=p.rotationSpeed;
    p.life-=1/p.maxLife;
    if(p.life<=0)s.particles.splice(i,1);
  }

  if(s.celebrating){
    s.celebrateTimer--;
    if(s.celebrateTimer<=0)s.celebrating=false;
  }

  // --- Draw ---
  ctx.clearRect(0,0,W,H);
  var color=COLORS[s.colorIndex];

  ctx.save();
  ctx.translate(s.shakeX.value,s.shakeY.value);

  // Screen flash
  if(s.celebrating&&s.celebrateTimer>130){
    var flashAlpha=((s.celebrateTimer-130)/20)*0.04;
    ctx.fillStyle="rgba(255,255,255,"+flashAlpha+")";
    ctx.fillRect(0,0,W,H);
  }

  // Particles
  for(var i=0;i<s.particles.length;i++){
    var p=s.particles[i];
    ctx.save();
    ctx.globalAlpha=p.life*0.85;
    ctx.fillStyle=p.color;
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rotation);
    if(p.shape==="rect"){
      var w=p.size*p.life;
      var h=w*0.5;
      ctx.fillRect(-w/2,-h/2,w,h);
    }else{
      ctx.beginPath();
      ctx.arc(0,0,p.size*p.life,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;

  // Shadow trail
  if(CFG.trail>0&&s.trailPositions.length>0&&img.complete){
    var tw=Math.ceil(LOGO_W+4);
    var th=Math.ceil(LOGO_H+4);
    tintCanvas.width=tw;
    tintCanvas.height=th;
    var tc=tintCanvas.getContext("2d");
    tc.clearRect(0,0,tw,th);
    tc.drawImage(img,2,2,LOGO_W,LOGO_H);
    tc.globalCompositeOperation="source-in";
    tc.fillStyle=color;
    tc.fillRect(0,0,tw,th);
    tc.globalCompositeOperation="source-over";
    for(var i=0;i<s.trailPositions.length;i++){
      var tp=s.trailPositions[i];
      var t=(i+1)/(s.trailPositions.length+1);
      ctx.save();
      ctx.globalAlpha=t*t*0.06;
      ctx.drawImage(tintCanvas,tp.x+LOGO_W/2-tw/2,tp.y+LOGO_H/2-th/2);
      ctx.restore();
    }
  }

  // Logo (with burst scale)
  var bsW=LOGO_W*s.burstScale.value,bsH=LOGO_H*s.burstScale.value;
  var bsX=s.x-(bsW-LOGO_W)/2,bsY=s.y-(bsH-LOGO_H)/2;
  drawLogo(bsX,bsY,bsW,bsH,color,finalScaleX,finalScaleY);

  // CORNER! text
  if(SHOW_CORNER_TEXT&&s.celebrating){
    var t=s.celebrateTimer/150;
    var alpha=t>0.7?(1-t)/0.3:t>0.2?1:t/0.2;
    ctx.save();
    ctx.globalAlpha=alpha*0.9;
    ctx.fillStyle=color;
    ctx.font='bold 32px "SF Mono","Fira Code",monospace';
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    var yOffset=(1-t)*40;
    ctx.fillText("CORNER!",W/2,H/2-100-yOffset);
    ctx.restore();
  }

  ctx.restore();

  // Update counter
  if(SHOW_COUNTER){
    bEl.textContent=s.bounceCount;
    kEl.textContent=s.cornerCount;
  }

  requestAnimationFrame(frame);
}

img.onload=function(){requestAnimationFrame(frame);};
img.src="${safeSrc}";
})();
</script>
</body>
</html>`;
}
