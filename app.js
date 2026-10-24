'use strict';
const $ = id => document.getElementById(id);
const config = window.APP_CONFIG || {};
const recipient = (config.recipient || '').trim();
const configured = /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(recipient) || /^[a-f0-9]{20,64}$/i.test(recipient);
const supabaseReady = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') && Boolean(config.supabaseAnonKey);
let supabaseClientPromise;
const CANCEL_STORAGE_KEY = 'yjfireclimbing.cancelTokens.v1';
function createCancelToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function hashCancelToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function rememberCancelToken(id, token) {
  try {
    const entries = JSON.parse(localStorage.getItem(CANCEL_STORAGE_KEY) || '[]')
      .filter(item => item.expiresAt > Date.now() && item.id !== id);
    entries.push({ id, token, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    localStorage.setItem(CANCEL_STORAGE_KEY, JSON.stringify(entries.slice(-100)));
  } catch (error) { console.warn('Could not store temporary report cancellation token', error); }
}
function getSupabase() {
  if (!supabaseReady) throw new Error('Supabase project URL과 publishable key 설정이 필요합니다.');
  if (!supabaseClientPromise) supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => createClient(config.supabaseUrl, config.supabaseAnonKey));
  return supabaseClientPromise;
}
const compressedPhoto=file=>window.YJManagement.compress(file);
let gpsPreviewMap=null,gpsPreviewMarker=null;
function showGpsPreview(){
 const holder=$('gpsPreview');holder.hidden=false;
 $('address').textContent='위도 '+position.latitude.toFixed(5)+' · 경도 '+position.longitude.toFixed(5);
 if(!window.L){holder.textContent='아래 Google 지도 링크에서 설치 위치를 확인해 주세요.';return;}
 if(!gpsPreviewMap){gpsPreviewMap=L.map(holder,{scrollWheelZoom:false}).setView([position.latitude,position.longitude],17);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(gpsPreviewMap);gpsPreviewMarker=L.circleMarker([position.latitude,position.longitude],{radius:9,color:'#fff',weight:3,fillColor:'#1683c4',fillOpacity:1,interactive:false}).addTo(gpsPreviewMap);}
 else{gpsPreviewMap.setView([position.latitude,position.longitude],17);gpsPreviewMarker.setLatLng([position.latitude,position.longitude]);}
 gpsPreviewMap.invalidateSize();
}
let afterPhoto=null,afterPhotoURL=null,activePhotoStage='before';
let photo = null, photoURL = null, position = null, busy = false, completed = false, locating = false, locationRequest = 0, selectedAt = null;
$('setup').hidden = configured;
$('recipient').textContent = !configured ? '수신 이메일 설정 전에는 전송할 수 없습니다.' : '수신: ' + (config.recipientLabel || '현장 접수 담당자') + ' · 이메일: FormSubmit.co · 최근 위치: 7일간 지도 표시';
function status(message, type = '') { $('status').textContent = message; $('status').className = type; }
function update() {
  const missing=[];if(!photo)missing.push('설치 전 사진');if(!afterPhoto)missing.push('설치 후 사진');if(!$('gpsConsent').checked)missing.push('동의 체크');if(!position)missing.push('현재 위치');$('remainingSteps').textContent=completed?'':busy?'':missing.length?'아직 필요한 항목: '+missing.join(' · '):'준비되었습니다. 전송 버튼을 눌러주세요.';

  $('send').disabled = !configured || !photo || !afterPhoto || !position || !$('gpsConsent').checked || busy || completed || locating;
  $('locate').disabled = !$('gpsConsent').checked || busy || completed || locating;
  $('locate').textContent=locating?'현재 위치 확인 중…':position?'현재 위치 다시 가져오기':'현재 위치 가져오기';
  for (const id of ['camera','album','cameraAfter','albumAfter','gpsConsent','note','volunteerTeam']) $(id).disabled = busy || completed;
  $('send').textContent = busy ? '전송 중… 잠시 기다려 주세요' : completed ? '접수 요청 완료' : '사진과 위치 전송하기 ↗';
}
async function choose(event) {
  const candidate = event.target.files[0];
  if (!candidate) return;
  event.target.value = '';
  if (!['image/jpeg','image/png','image/webp'].includes(candidate.type)) { status('JPG, PNG 또는 WebP 사진을 선택해 주세요. HEIC 사진은 JPG로 변환한 뒤 다시 선택해 주세요.', 'error'); return; }
  if (!candidate.size || candidate.size > 10 * 1000 * 1000) { status('사진은 10MB 이하여야 합니다. 더 작은 사진을 선택해 주세요.', 'error'); return; }
  const url = URL.createObjectURL(candidate);
  const test = new Image();
  try { test.src = url; await test.decode(); }
  catch { URL.revokeObjectURL(url); status('사진을 열 수 없습니다. 다른 사진으로 다시 시도해 주세요.', 'error'); return; }
  const after=event.target.id.endsWith('After');
  const previous=after?afterPhotoURL:photoURL;if(previous)URL.revokeObjectURL(previous);
  if(after){afterPhoto=candidate;afterPhotoURL=url;}else{photo=candidate;photoURL=url;}selectedAt=new Date();
  const suffix=after?'After':'';$('preview'+suffix).src=url;$('preview'+suffix).hidden=false;$('placeholder'+suffix).hidden=true;
  $('photoInfo'+suffix).textContent=candidate.name+' · '+(candidate.size/1000000).toFixed(2)+'MB';
  $('photoInfo'+suffix).hidden=false;
   status(''); update();
}
$('camera').addEventListener('change', choose); $('album').addEventListener('change', choose);$('cameraAfter').addEventListener('change',choose);$('albumAfter').addEventListener('change',choose);
$('gpsConsent').addEventListener('change', () => {
  if (!$('gpsConsent').checked) { ++locationRequest; locating = false; position = null; $('gpsPreview').hidden=true;$('address').textContent='현재 위치를 가져오면 위도·경도가 자동으로 입력됩니다.'; $('map').hidden = true; $('map').removeAttribute('href'); $('locationInfo').textContent = ''; }
   update();
});

$('note').addEventListener('input', () => {  update(); });
$('volunteerTeam').addEventListener('change', () => {  update(); });
$('locate').addEventListener('click', () => {
  if (!$('gpsConsent').checked || busy || locating) return;
  if (!window.isSecureContext || !navigator.geolocation) { status('위치 기능을 사용할 수 없습니다. HTTPS 주소를 Safari 또는 Chrome에서 열어 주세요.', 'error'); return; }
  const request = ++locationRequest;
  position = null;$('gpsPreview').hidden=true;$('address').textContent='위치 확인 중…'; locating = true; $('map').hidden = true; 
  $('locationInfo').textContent = '현재 위치를 확인하고 있습니다…'; status(''); update();
  navigator.geolocation.getCurrentPosition(result => {
    if (request !== locationRequest || !$('gpsConsent').checked) return;
    locating = false;
    position = { latitude: Number(result.coords.latitude.toFixed(5)), longitude: Number(result.coords.longitude.toFixed(5)), accuracy: result.coords.accuracy, timestamp: result.timestamp };
    $('locationInfo').textContent = `위치 확인 완료 · 위치 오차 약 ${Math.round(position.accuracy)}m`;
    $('map').href = `https://www.google.com/maps?q=${position.latitude},${position.longitude}`; $('map').hidden = false;showGpsPreview(); update();
  }, error => {
    if (request !== locationRequest) return;
    locating = false; position = null;$('address').textContent='위치를 확인하지 못했습니다. 다시 시도해 주세요.';
    $('locationInfo').textContent = ({1:'위치 권한이 거부되었습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.',2:'현재 위치를 확인할 수 없습니다. 실외나 신호가 잘 잡히는 곳에서 다시 시도해 주세요.',3:'위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.'})[error.code] || '위치 확인에 실패했습니다. 다시 시도해 주세요.';
    update();
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});
$('report').addEventListener('submit', async event => {
  event.preventDefault(); update(); if ($('send').disabled) return;
  if (navigator.onLine === false) { status('인터넷 연결이 없습니다. 연결 후 다시 전송해 주세요.', 'error'); return; }
  busy = true; update();
  let beforeData,afterData;
  try{status('사진을 준비하고 있습니다…');[beforeData,afterData]=await Promise.all([compressedPhoto(photo),compressedPhoto(afterPhoto)]);}catch(error){busy=false;status(error.message||'사진 압축에 실패했습니다. 다시 선택해 주세요.','error');update();return;}
  let reportId = crypto.randomUUID();
  let mapSaved = false;
  let cancelTokenSaved = false;
  let approvalURL = '';
  try{if(window.YJManagement?.local){await window.YJManagement.local.put('points',[{id:reportId,_owned:true,latitude:position.latitude,longitude:position.longitude,accuracy_m:Math.round(position.accuracy),submitted_at:new Date().toISOString(),expires_at:new Date(Date.now()+7*86400000).toISOString(),name:'',address:position ? ('위도 '+position.latitude.toFixed(5)+' · 경도 '+position.longitude.toFixed(5)) : '',note:$('note').value.trim(),volunteer_team:$('volunteerTeam').value,photo_before_data:beforeData,photo_after_data:afterData}]);const url=new URL('admin.html',window.location.href);url.searchParams.set('id',reportId);approvalURL=url.href;}}catch(error){console.warn('Local report copy could not be saved',error);}
  if (supabaseReady) {
    try {
      status('위치를 임시 지도에 등록하고 있습니다…');
      const client = await getSupabase();
      const cancelToken = createCancelToken();
      const cancelTokenHash = await hashCancelToken(cancelToken);
      let metadataSaved = true;
      let result = await client.from('temporary_reports').insert({
        id: reportId, latitude: position.latitude, longitude: position.longitude,
        accuracy_m: Math.round(position.accuracy), cancel_token_hash: cancelTokenHash,
        name: '', address: position ? ('위도 '+position.latitude.toFixed(5)+' · 경도 '+position.longitude.toFixed(5)) : '', note: $('note').value.trim(),
        volunteer_team: $('volunteerTeam').value, photo_before_data:beforeData,photo_after_data:afterData
      });
      if (result.error) {
        metadataSaved = false;
        // Preserve GPS/email submission if the new schema is not yet available.
        result = await client.from('temporary_reports').insert({
          id: reportId, latitude: position.latitude, longitude: position.longitude,
          accuracy_m: Math.round(position.accuracy)
        });
      } else {
        rememberCancelToken(reportId, cancelToken);
        cancelTokenSaved = true;
        const approveURL = new URL('admin.html', window.location.href);
        approveURL.searchParams.set('id', reportId);
        approvalURL = approveURL.href;
      }
      if (result.error) throw result.error;
      mapSaved = true;
      if (!metadataSaved) console.warn('Report saved without photo metadata; administrator schema setup required.');
    } catch (error) {
      console.error('Temporary map location could not be saved', error);
    }
  }
  const data = new FormData();
  data.append('attachment_before',window.YJManagement.dataFile(beforeData,'installation-before.jpg'));
  data.append('attachment_after',window.YJManagement.dataFile(afterData,'installation-after.jpg'));
  data.append('_captcha', 'false');
  data.append('_honey', '');
  data.append('_subject', config.subject || '[YJfireclimbing] 현장 접수'); data.append('_template', 'table');
  data.append('접수번호', reportId);
  data.append('영구 등록 승인', approvalURL ? approvalURL : mapSaved ? '승인 링크 미생성 · Supabase 승인 기능 설정을 확인해 주세요.' : 'Supabase 임시 지도 등록을 사용할 수 없어 승인 링크가 없습니다.');
  data.append('임시 지도 표시', mapSaved ? (cancelTokenSaved ? '지도에 표시됨 · 7일 후 자동 삭제 · 이 기기의 지도에서 요청 취소 가능' : '지도에 표시됨 · 7일 후 자동 삭제') : '지도 자동 등록을 사용할 수 없음 · GPS 좌표는 아래에 포함');
  data.append('사진 선택 시각', selectedAt.toISOString());
  data.append('전송 요청 시각', new Date().toISOString());
  data.append('위도', String(position.latitude)); data.append('경도', String(position.longitude));
  data.append('GPS 정확도(m)', String(position.accuracy));
  data.append('위치 확인 시각', new Date(position.timestamp).toISOString());
  data.append('설치 위치 (GPS)', position ? ('위도 '+position.latitude.toFixed(5)+' · 경도 '+position.longitude.toFixed(5)) : '');
  data.append('Google 지도', $('map').href); data.append('현장 메모', $('note').value.trim());
  data.append('점검/등록 의용소방대', $('volunteerTeam').value || '선택 안 함');
  data.append('위치 및 전송 동의', '사용자가 명시적으로 동의함');
  // File attachments use FormSubmit's documented native multipart endpoint.
  const submission = document.createElement('form');
  submission.method = 'POST'; submission.enctype = 'multipart/form-data';
  submission.action = `https://formsubmit.co/${encodeURIComponent(recipient)}`;
  submission.hidden = true;
  try {
    for (const [name, value] of data.entries()) {
      const input = document.createElement('input'); input.name = name;
      if (value instanceof File) {
        input.type = 'file';
        const transfer = new DataTransfer(); transfer.items.add(value); input.files = transfer.files;
        if (input.files.length !== 1) throw new Error('attachment');
      } else { input.type = 'hidden'; input.value = value; }
      submission.append(input);
    }
    const next = document.createElement('input'); next.type = 'hidden'; next.name = '_next';
    const returnURL = new URL(window.location.href); returnURL.search = '?sent=1'; returnURL.hash = '';
    next.value = returnURL.href; submission.append(next);
    document.body.append(submission);
    status(mapSaved ? '사진과 위치를 이메일로 전송하고, 위치를 7일간 지도에 표시합니다…' : '사진과 위치를 이메일로 전송합니다…'); update();
    HTMLFormElement.prototype.submit.call(submission);
  } catch {
    busy = false; submission.remove();
    status('사진 첨부를 준비하지 못했습니다. 최신 Safari 또는 Chrome에서 다시 시도해 주세요. 사진과 위치는 유지됩니다.', 'error'); update();
  }
});
window.addEventListener('pageshow', () => { busy = false; update(); });
if (new URLSearchParams(window.location.search).get('sent') === '1') {
  completed = true; status('사진과 위치 전송 요청이 완료되었습니다.', 'success');
  $('sendToast').hidden = false;
  window.setTimeout(() => { $('sendToast').hidden = true; }, 3000);
  $('reset').hidden = false; update();
  window.history.replaceState(null, '', window.location.pathname);
}

$('reset').addEventListener('click', () => { window.location.reload(); });
update();

$('placeholder').addEventListener('click', () => { if (!busy && !completed){activePhotoStage='before';$('photoChoice').showModal();} });
$('chooseCamera').addEventListener('click', () => { $('photoChoice').close(); $(activePhotoStage==='after'?'cameraAfter':'camera').click(); });
$('chooseAlbum').addEventListener('click', () => { $('photoChoice').close(); $(activePhotoStage==='after'?'albumAfter':'album').click(); });
$('closePhotoChoice').addEventListener('click', () => $('photoChoice').close());


$('placeholderAfter').addEventListener('click',()=>{if(!busy&&!completed){activePhotoStage='after';$('photoChoice').showModal();}});

function showInstall(yes){$('taskMenu').hidden=yes;$('installHeading').hidden=!yes;$('report').hidden=!yes;document.querySelector('.intro').hidden=yes;if(yes&&gpsPreviewMap)setTimeout(()=>gpsPreviewMap.invalidateSize(),0);}
$('startInstall').addEventListener('click',()=>{history.replaceState(null,'','#install');showInstall(true);$('installHeading').scrollIntoView({behavior:'smooth'});});
$('backToTasks').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);showInstall(false);$('taskMenu').scrollIntoView({behavior:'smooth'});});
showInstall(location.hash==='#install'||completed);
