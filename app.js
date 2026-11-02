(function(){
'use strict';
const $=id=>document.getElementById(id);const {questions,types,tips,evaluate,encodeProgress,decodeProgress}=LoveQuiz;
const SAVE_KEY='love-rating-progress-v2';let saveUnavailable=false;
let answers=[],orders=[],index=0,locked=false,result=null,timer,toastTimer,activeScreen='welcome';
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function show(name){activeScreen=name;['welcome','quiz','result'].forEach(s=>$(s).hidden=s!==name);window.scrollTo({top:0,behavior:'instant'})}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3000)}
function saveProgress(){
 try{localStorage.setItem(SAVE_KEY,encodeProgress(answers,index,orders))}catch{if(!saveUnavailable){saveUnavailable=true;toast('浏览器无法保存进度，请勿关闭页面')}}
}
function render(){
 const q=questions[index];$('question').textContent=q.q;$('scene').textContent=q.scene;$('step').textContent=`Q${index+1} / ${questions.length}`;$('progress').style.width=`${(index+1)/questions.length*100}%`;$('back').disabled=index===0;
 $('options').replaceChildren();orders[index].forEach((answer,pos)=>{
  const b=document.createElement('button');b.className='option'+(answers[index]===answer?' selected':'');b.type='button';b.setAttribute('aria-pressed',String(answers[index]===answer));
  const mark=document.createElement('span');mark.className='letter';mark.textContent=String.fromCharCode(65+pos);mark.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent=q.options[answer];b.append(mark,label);
  b.addEventListener('click',()=>choose(answer,b));$('options').append(b);
 });
 saveProgress();$('save-status').textContent=saveUnavailable?'本次进度暂未保存，请勿关闭页面':'进度已自动保存在本浏览器';$('question').focus({preventScroll:true});
}
function choose(answer,button){
 if(locked||activeScreen!=='quiz')return;locked=true;answers[index]=answer;saveProgress();
 for(const b of $('options').children){b.disabled=true;b.classList.remove('selected');b.setAttribute('aria-pressed','false')}
 button.classList.add('selected');button.setAttribute('aria-pressed','true');$('back').disabled=true;
 timer=setTimeout(()=>{locked=false;if(index===questions.length-1){showResult()}else{index++;render()}},240);
}
function start(){clearTimeout(timer);answers=Array(questions.length).fill(null);orders=questions.map(()=>shuffle([0,1,2,3]));index=0;locked=false;result=null;show('quiz');render()}
function showResult(){
 result=evaluate(answers);const r=result.result;
 $('symbol').textContent=r.symbol;$('type').textContent=r.title;$('tagline').textContent=r.line;$('description').textContent=r.desc;
 $('strength').textContent=result.strength;$('focus').textContent=result.focus;$('reply-scene').textContent=`给你的现实提醒 · ${result.scene}`;$('reply').textContent=result.reply;
 $('dimensions').replaceChildren();result.dimensions.forEach(d=>{const row=document.createElement('div');row.className='dimension';const name=document.createElement('span');name.textContent=d.name;const label=document.createElement('strong');label.textContent=d.label;row.append(name,label);$('dimensions').append(row)});saveProgress();
 show('result');$('type').tabIndex=-1;$('type').focus({preventScroll:true});
}
let saved=null;try{saved=decodeProgress(localStorage.getItem(SAVE_KEY))}catch{}
if(saved){$('resume').hidden=false;$('clear-progress').hidden=false;$('start').hidden=true}
$('resume').addEventListener('click',()=>{answers=saved.answers.slice();orders=saved.orders;index=saved.index;locked=false;if(answers.every(a=>a!==null))showResult();else{show('quiz');render()}});
$('clear-progress').addEventListener('click',()=>{try{localStorage.removeItem(SAVE_KEY)}catch{}saved=null;$('resume').hidden=true;$('clear-progress').hidden=true;$('start').hidden=false;toast('已清除本浏览器保存的答题进度')});
$('edit-answers').addEventListener('click',()=>{if(!result)return;index=questions.length-1;show('quiz');render()});
$('save-now').addEventListener('click',()=>{saveProgress();toast(saveUnavailable?'当前浏览器无法保存，请勿关闭页面':'进度已保存，下次用同一浏览器打开可继续')});
$('start').addEventListener('click',start);$('retry').addEventListener('click',start);
$('back').addEventListener('click',()=>{if(locked||index===0)return;index--;render()});
tips.forEach(([title,body],i)=>{const d=document.createElement('details');const s=document.createElement('summary');s.textContent=`${String(i+1).padStart(2,'0')}  ${title}`;const p=document.createElement('p');p.textContent=body;d.append(s,p);$('tips').append(d)});
function shareText(){const url=/^https?:$/.test(location.protocol)?location.href.split('#')[0]:'';return `我在 Love Rating 测出「${result.result.title}」：${result.result.line}\n12 个现实选择题，你会是什么类型？\n${url||'把这个网页发给朋友，一起来测测。'}\n（趣味测试，非专业心理测评）`}
$('share').addEventListener('click',async()=>{
 if(!result)return;const text=shareText();
 try{if(navigator.share){await navigator.share({title:'Love Rating · 我的心动档案',text});toast('已完成分享');return}}catch(e){if(e.name==='AbortError')return}
 try{if(!navigator.clipboard)throw new Error('unavailable');await navigator.clipboard.writeText(text);toast('已复制结果文案和网站地址');return}catch{}
 $('share-text').value=text;$('share-dialog').showModal();$('share-text').select();
});
$('close-dialog').addEventListener('click',()=>$('share-dialog').close());
// Draw text directly to a canvas so saving requires no remote fonts or screenshot libraries.
function wrap(ctx,text,x,y,width,lineHeight){let line='';for(const char of text){if(ctx.measureText(line+char).width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line=char}else line+=char}if(line)ctx.fillText(line,x,y);return y+lineHeight}
function drawCard(){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=2100;const c=canvas.getContext('2d');if(!c)throw new Error('canvas unavailable');
 c.fillStyle='#faf6f1';c.fillRect(0,0,1080,2100);c.fillStyle='#fffaf7';c.fillRect(55,55,970,1990);c.strokeStyle='#e4d6dc';c.lineWidth=2;c.strokeRect(55,55,970,1990);
 const font='"Microsoft YaHei", "PingFang SC", sans-serif';
 c.textAlign='left';c.fillStyle='#81658e';c.font=`24px ${font}`;c.fillText('LOVE RATING  /  你的心动档案',100,130);
 c.textAlign='center';c.fillStyle='#b391a5';c.font=`112px ${font}`;c.fillText(result.result.symbol,540,290);
 c.fillStyle='#786e68';c.font=`24px ${font}`;c.fillText('这一次，你更像',540,355);
 c.fillStyle='#70547e';c.font=`bold 66px ${font}`;c.fillText(result.result.title,540,450);
 c.fillStyle='#b87c85';c.font=`29px ${font}`;c.fillText(result.result.line,540,515);
 c.textAlign='left';c.fillStyle='#786e68';c.font=`28px ${font}`;let y=wrap(c,result.result.desc,110,600,860,48)+35;
 function section(label,text){c.fillStyle='#81658e';c.font=`24px ${font}`;c.fillText(label,110,y);y+=48;c.fillStyle='#454039';c.font=`29px ${font}`;y=wrap(c,text,110,y,860,47)+28}
 section('✧ 你的一个优势',result.strength);section('♡ 给自己的小提醒',result.focus);section('给你的现实提醒',result.reply);
 c.fillStyle='#786e68';c.font=`21px ${font}`;c.textAlign='center';c.fillText('没有高低排名 · 趣味自我探索，非专业心理测评',540,1920);c.fillText('Love Rating · Made by Lexie',540,1965);
 const url=/^https?:$/.test(location.protocol)?location.origin+location.pathname:'将网页分享给朋友，一起来测测';c.font=`18px ${font}`;c.fillText(url,540,2010,860);
 return canvas;
}
$('download').addEventListener('click',()=>{
 if(!result)return;const button=$('download');button.disabled=true;
 try{drawCard().toBlob(blob=>{button.disabled=false;if(!blob){toast('图片生成失败，请重试');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Love-Rating-${result.result.title}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('结果卡已生成；若未自动保存，请查看浏览器下载')},'image/png')}catch{button.disabled=false;toast('当前浏览器暂不支持保存图片，可截图保存结果卡')}
});
})();
