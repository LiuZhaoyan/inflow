import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = process.env.AGENT_BROWSER_CLI || 'C:\\Users\\123\\AppData\\Local\\npm-cache\\_npx\\6de2aa2fded2970c\\node_modules\\agent-browser\\bin\\agent-browser.js';
const fixture = path.join(here, 'fixture.js');
const ev = code => `eval -b ${Buffer.from(code).toString('base64')}`;
const commands = [
  'open http://localhost:3000',
  ev(`(async()=>{
    const until=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw Error('timed out waiting for app state')};
    await until(()=>window.__inflowAcceptance&&document.querySelector('#notebook'));
    document.querySelector('nav button[aria-haspopup="dialog"]').click();
    await until(()=>document.querySelector('dialog[open]'));
    [...document.querySelectorAll('dialog button')].find(b=>/import media|导入媒体/i.test(b.innerText)).click();
    await until(()=>document.querySelector('audio')?.duration===8&&window.__inflowAcceptance.stats.transcribeCalls===1&&window.__inflowAcceptance.pendingCount()===1);
    if(window.__inflowAcceptance.stats.transcribeCalls!==1)throw Error('new import did not start exactly one automatic job');
    const audio=document.querySelector('audio');audio.currentTime=3.4;audio.dispatchEvent(new Event('timeupdate',{bubbles:true}));
    const speed=document.querySelector('select[aria-label="Playback speed"]');speed.value='1.25';speed.dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>audio.playbackRate===1.25);
    return {autoJobs:window.__inflowAcceptance.stats.transcribeCalls,duration:audio.duration};
  })()`),
  'click button[aria-label="Play"]',
  ev(`(async()=>{
    const until=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw Error('timed out waiting for playback')};
    const audio=document.querySelector('audio');if(audio.paused)await audio.play();await until(()=>!audio.paused);
    window.__inflowAcceptance.resolveNextTranscribe();
    await until(()=>window.__inflowAcceptance.pendingCount()===0&&document.querySelector('aside .workspace-context-row'));
    await new Promise(r=>setTimeout(r,200));
    if(audio.paused||audio.currentTime<3||audio.playbackRate!==1.25)throw Error('automatic processing reset live playback position, play state, or rate');
    if(!document.querySelector('aside .workspace-context-row[aria-current="true"]')?.getAttribute('aria-label').includes('0:02'))throw Error('processing did not map current position to its sentence');
    return {autoJobs:window.__inflowAcceptance.stats.transcribeCalls,position:audio.currentTime,rate:audio.playbackRate,playing:!audio.paused};
  })()`),
  ev(`(async()=>{
    const until=async test=>{for(let i=0;i<80;i++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw Error('timed out waiting for job')};
    const start=()=>[...document.querySelectorAll('.workspace-stage-status button')].find(b=>/重新处理|开始处理/.test(b.innerText));
    document.querySelector('audio').pause();
    start().click();await until(()=>window.__inflowAcceptance.stats.transcribeCalls===2&&window.__inflowAcceptance.pendingCount()===1);
    document.querySelectorAll('aside .workspace-context-row')[2].click();
    const audio=document.querySelector('audio');
    const contextReady=()=>audio.paused&&Math.abs(audio.currentTime-5.5)<.1&&document.querySelector('.workspace-mode-switch button[aria-pressed="true"]')?.innerText==='Sentence'&&document.querySelectorAll('aside .workspace-context-row')[2]?.getAttribute('aria-current')==='true';
    for(let i=0;i<30&&!contextReady();i++)await new Promise(r=>setTimeout(r,100));
    if(!contextReady())throw Error('context selection did not pause and seek to sentence start');
    window.__inflowAcceptance.resolveNextTranscribe(false);
    await until(()=>window.__inflowAcceptance.pendingCount()===0&&document.querySelector('[role="alert"]')?.innerText.includes('fixture transcription failure'));
    await new Promise(r=>setTimeout(r,500));
    if(window.__inflowAcceptance.stats.transcribeCalls!==2)throw Error('failed manual processing automatically retried');
    start().click();await until(()=>window.__inflowAcceptance.stats.transcribeCalls===3&&window.__inflowAcceptance.pendingCount()===1);
    document.querySelectorAll('aside .workspace-context-row')[1].click();
    const sentenceReady=()=>document.querySelector('.workspace-mode-switch button[aria-pressed="true"]')?.innerText==='Sentence'&&document.querySelectorAll('aside .workspace-context-row')[1]?.getAttribute('aria-current')==='true';
    for(let i=0;i<30&&!sentenceReady();i++)await new Promise(r=>setTimeout(r,100));
    if(!sentenceReady())throw Error('sentence state did not commit after context selection');
    document.querySelector('button[aria-label="Loop sentence"]').click();
    await until(()=>document.querySelector('button[aria-label="Turn sentence loop off"]')?.getAttribute('aria-pressed')==='true');
    if(document.querySelector('button[aria-label="Turn sentence loop off"]')?.getAttribute('aria-pressed')!=='true')throw Error('could not enable sentence loop during processing');
    return {failedCalls:2,retryStarted:window.__inflowAcceptance.stats.transcribeCalls,position:audio.currentTime,paused:audio.paused};
  })()`),
  'click button[aria-label="Play"]',
  ev(`(async()=>{
    const until=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw Error('timed out waiting for retry completion')};
    const audio=document.querySelector('audio');if(audio.paused)await audio.play();await until(()=>!audio.paused);
    window.__inflowAcceptance.resolveNextTranscribe();
    await until(()=>window.__inflowAcceptance.pendingCount()===0&&document.querySelector('aside .workspace-context-row'));
    await new Promise(r=>setTimeout(r,200));
    if(audio.paused||audio.currentTime<2.5||audio.currentTime>=5||document.querySelector('.workspace-mode-switch button[aria-pressed="true"]')?.innerText!=='Sentence')throw Error('reprocessing reset in-flight sentence mode, position, or playback');
    if(document.querySelector('button[aria-label="Turn sentence loop off"]')?.getAttribute('aria-pressed')!=='true'||audio.playbackRate!==1.25)throw Error('reprocessing reset in-flight loop or rate');
    audio.pause();
    document.querySelector('.reveal-trigger').click();
    await until(()=>document.querySelector('[data-reveal-option="all"]'));
    document.querySelector('[data-reveal-option="all"]').click();
    await until(()=>document.querySelector('.meaning-group'));
    const text=document.querySelector('.meaning-group').firstChild,range=document.createRange();range.setStart(text,0);range.setEnd(text,Math.min(2,text.textContent.length));
    const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
    document.querySelector('button[aria-label="Collect selected text"]').click();
    await until(()=>document.querySelector('form[aria-label="词汇审阅"] input[name="meaningZh"]'));
    const input=document.querySelector('form[aria-label="词汇审阅"] input[name="meaningZh"]');
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'draft survives tabs');input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('nav button[aria-label="Video and audio content"]').click();
    await until(()=>!document.querySelector('.workspace-content-grid').hidden&&document.querySelector('.workspace-vocab').hidden);
    [...document.querySelectorAll('nav button')].find(b=>b.innerText==='Vocab').click();
    await until(()=>!document.querySelector('.workspace-vocab').hidden&&document.querySelector('form[aria-label="词汇审阅"] input[name="meaningZh"]')?.value==='draft survives tabs');
    if(!document.querySelector('#notebook .process-button').disabled)throw Error('another manual draft was allowed before resolving collection');
    if(!audio.paused)throw Error('collecting vocabulary did not pause playback');
    return {jobs:window.__inflowAcceptance.stats.transcribeCalls,mode:'sentence',position:audio.currentTime,rate:audio.playbackRate,loop:true,draftRetained:input.value};
  })()`),
];

try {
  const output = execFileSync(process.execPath, [cli, '--json', '--session', 'inflow-acceptance', '--init-script', fixture, 'batch', '--bail', ...commands], {
    cwd: path.resolve(here, '../..'),
    env: { ...process.env, AGENT_BROWSER_EXECUTABLE_PATH: process.env.AGENT_BROWSER_EXECUTABLE_PATH || 'C:\\Users\\123\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe' },
    encoding: 'utf8', timeout: 120_000, maxBuffer: 4_000_000,
  });
  const result = JSON.parse(output.trim());
  assert.ok(result.every(item => item.success), 'every browser batch step completed');
  console.log(JSON.stringify(result.map(item => item.result?.result ?? item.result), null, 2));
} catch (error) {
  process.stderr.write(String(error.stdout ?? '').slice(-3000));
  process.stderr.write(String(error.stderr ?? ''));
  throw error;
}
