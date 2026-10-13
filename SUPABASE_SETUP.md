# Supabase 임시 지도 위치 설정

사진은 기존처럼 FormSubmit 이메일로 담당자에게 전달됩니다. Supabase에는 사진이나 메모를 올리지 않고 좌표, GPS 정확도, 전송 시각만 임시로 저장합니다. 전송 즉시 지도에 파란 점으로 표시되며 7일이 지나면 조회되지 않고, 15분 간격 정리 작업이 레코드를 삭제합니다.

계속 보관할 설치 지점은 담당자가 이메일의 GPS를 확인한 뒤 GPT에게 지점 정보를 말해 locations.json에 넣으면 빨간 점으로 공개됩니다. 임시 파란 점은 별도 승인 화면 없이 자동 만료됩니다.

1. Supabase 프로젝트에서 SQL Editor를 열고 supabase-temp.sql을 한 번 실행합니다.
2. Project Settings → API에서 Project URL과 Publishable key(기존 anon key)를 복사해 config.js의 supabaseUrl, supabaseAnonKey에 입력합니다. service role/secret key는 공유하거나 웹에 넣지 않습니다.
3. 변경된 사이트를 GitHub main에 올리면 Pages가 배포합니다. 기존 홈페이지 이메일 전송은 Supabase 장애 시에도 계속 진행되며, 임시 점 표시만 사용할 수 없게 됩니다.

locations.json의 영구 지점은 GPT에게 “이 위도/경도와 이름을 영구 설치 지점으로 지도에 추가해 GitHub에 반영해줘”라고 요청하면 됩니다. 이메일의 정확한 좌표를 그대로 사용하세요.
