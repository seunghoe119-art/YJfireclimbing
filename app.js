'use strict';
const $ = id => document.getElementById(id);
const config = window.APP_CONFIG || {};
const recipient = (config.recipient || '').trim();
const configured = /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(recipient) || /^[a-f0-9]{20,64}$/i.test(recipient);
let photo = null, photoURL = null, position = null, busy = false, completed = false, locating = false, locationRequest = 0, selectedAt = null;
$('setup').hidden = configured;
$('recipient').textContent = configured ? `수신: ${config.recipientLabel || '현장 접수 담당자'} · 전송 서비스: FormSubmit.co` : '수신 이메일 설정 전에는 전송할 수 없습니다.';
function status(message, type = '') { $('status').textContent = message; $('status').className = type; }
function update() {
  $('send').disabled = !configured || !photo || !position || !$('gpsConsent').checked || !$('sendConsent').checked || busy || completed || locating;
  $('locate').disabled = !$('gpsConsent').checked || busy || completed || locating;
  for (const id of ['camera','album','gpsConsent','sendConsent','note']) $(id).disabled = busy || completed;
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
  if (photoURL) URL.revokeObjectURL(photoURL);
  photo = candidate; photoURL = url; selectedAt = new Date();
  $('preview').src = url; $('preview').hidden = false; $('placeholder').hidden = true;
  $('photoInfo').textContent = `${candidate.name} · ${(candidate.size / 1000000).toFixed(2)}MB · 선택 시각 ${selectedAt.toLocaleString('ko-KR')}`;
  $('sendConsent').checked = false; status(''); update();
}
$('camera').addEventListener('change', choose); $('album').addEventListener('change', choose);
$('gpsConsent').addEventListener('change', () => {
  if (!$('gpsConsent').checked) { ++locationRequest; locating = false; position = null; $('map').hidden = true; $('map').removeAttribute('href'); $('locationInfo').textContent = '동의를 해제하여 위치정보를 지웠습니다.'; }
  $('sendConsent').checked = false; update();
});
$('sendConsent').addEventListener('change', update);
$('note').addEventListener('input', () => { $('sendConsent').checked = false; update(); });
$('locate').addEventListener('click', () => {
  if (!$('gpsConsent').checked || busy || locating) return;
  if (!window.isSecureContext || !navigator.geolocation) { status('위치 기능을 사용할 수 없습니다. HTTPS 주소를 Safari 또는 Chrome에서 열어 주세요.', 'error'); return; }
  const request = ++locationRequest;
  position = null; locating = true; $('map').hidden = true; $('sendConsent').checked = false;
  $('locationInfo').textContent = '현재 위치를 확인하고 있습니다…'; status(''); update();
  navigator.geolocation.getCurrentPosition(result => {
    if (request !== locationRequest || !$('gpsConsent').checked) return;
    locating = false;
    position = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy, timestamp: result.timestamp };
    $('locationInfo').textContent = `위도 ${position.latitude.toFixed(6)} · 경도 ${position.longitude.toFixed(6)}\n정확도 약 ${Math.round(position.accuracy)}m · ${new Date(position.timestamp).toLocaleString('ko-KR')}`;
    $('map').href = `https://www.google.com/maps?q=${position.latitude},${position.longitude}`; $('map').hidden = false; update();
  }, error => {
    if (request !== locationRequest) return;
    locating = false; position = null;
    $('locationInfo').textContent = ({1:'위치 권한이 거부되었습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.',2:'현재 위치를 확인할 수 없습니다. 실외나 신호가 잘 잡히는 곳에서 다시 시도해 주세요.',3:'위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.'})[error.code] || '위치 확인에 실패했습니다. 다시 시도해 주세요.';
    update();
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});
$('report').addEventListener('submit', async event => {
  event.preventDefault(); update(); if ($('send').disabled) return;
  if (navigator.onLine === false) { status('인터넷 연결이 없습니다. 연결 후 다시 전송해 주세요.', 'error'); return; }
  const data = new FormData();
  data.append('attachment', photo, photo.name);
  data.append('_subject', config.subject || '[YJfireclimbing] 현장 접수'); data.append('_template', 'table');
  data.append('접수번호', crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  data.append('사진 선택 시각', selectedAt.toISOString());
  data.append('전송 요청 시각', new Date().toISOString());
  data.append('위도', String(position.latitude)); data.append('경도', String(position.longitude));
  data.append('GPS 정확도(m)', String(position.accuracy));
  data.append('위치 확인 시각', new Date(position.timestamp).toISOString());
  data.append('Google 지도', $('map').href); data.append('현장 메모', $('note').value.trim());
  data.append('위치 및 전송 동의', '사용자가 명시적으로 동의함');
  busy = true; status('사진과 위치를 전송하고 있습니다. 이 화면을 닫지 마세요.'); update();
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {method:'POST', body:data, headers:{Accept:'application/json'}, signal:controller.signal});
    const result = await response.json();
    if (!response.ok || !(result.success === true || result.success === 'true')) throw new Error('rejected');
    completed = true; status('FormSubmit이 접수 요청을 받았습니다.\n최초 설정 시에는 수신 이메일 인증이 필요합니다. 이 메시지는 담당자의 이메일 수신 완료를 보장하지 않습니다.', 'success');
    $('reset').hidden = false;
  } catch (error) {
    status(error.message === 'rejected' ? '접수 서비스가 요청을 처리하지 못했습니다. 수신 주소와 이메일 인증 상태를 관리자에게 확인해 주세요. 사진과 위치는 유지됩니다.' : '통신 문제로 접수 결과를 확인하지 못했습니다. 사진과 위치는 유지됩니다. 수신 여부를 먼저 확인한 뒤 다시 시도해 주세요. 재전송하면 중복 접수될 수 있습니다.', 'error');
  } finally { clearTimeout(timer); busy = false; update(); }
});
$('reset').addEventListener('click', () => {
  ++locationRequest; locating = false; completed = false; photo = null; position = null; selectedAt = null;
  if (photoURL) URL.revokeObjectURL(photoURL); photoURL = null;
  $('report').reset(); $('preview').removeAttribute('src'); $('preview').hidden = true; $('placeholder').hidden = false;
  $('map').hidden = true; $('map').removeAttribute('href'); $('locationInfo').textContent = '아직 위치를 가져오지 않았습니다.';
  $('photoInfo').textContent = '사진은 전송하기 전까지 이 화면에만 보관됩니다.'; $('reset').hidden = true; status(''); update(); window.scrollTo({top:0,behavior:'smooth'});
});
update();
