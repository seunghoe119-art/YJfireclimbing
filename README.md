# YJfireclimbing

QR 접속용 모바일 현장 사진·GPS 접수 웹사이트. 별도 서버나 빌드 도구 없이 GitHub Pages에서 실행합니다.

## 현재 상태

웹사이트 및 GitHub Pages 자동 배포 파일 준비 완료. GitHub 계정 seunghoe119-art에 공개 저장소를 생성해 배포합니다. `config.js`의 수신 주소가 비어 있어 실제 전송은 차단됩니다.

## 수신 이메일 설정

1. `config.js`의 `recipient: ""`에 수신 이메일을 입력합니다.
2. 배포된 HTTPS 웹사이트에서 테스트 사진과 위치로 전송합니다.
3. 수신함/스팸함의 FormSubmit 인증 이메일을 열어 인증합니다.
4. 인증 완료 후 다시 테스트하여 **사진 첨부와 지도 링크를 실제 이메일에서 확인**합니다. 인증 전 최초 요청의 전달 여부를 가정하지 마세요.
5. 인증 이메일에 제공된 무작위 토큰으로 `recipient`를 바꾸면 주소 직접 노출을 줄일 수 있습니다. 정적 사이트의 토큰 자체는 공개됩니다. 비밀번호/API 키를 넣지 마세요.

`recipientLabel`과 `subject`도 같은 파일에서 수정합니다. 이메일을 정적 공개 저장소에 넣으면 저장소 기록에도 남으므로 토큰 사용을 권장합니다.

## GitHub Pages 배포

GitHub에 공개 저장소 `YJfireclimbing`을 만들고 이 폴더의 파일 전체(숨김 `.github` 포함)를 기본 브랜치 `main`에 올립니다.

저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다. Actions 탭에서 Deploy GitHub Pages를 실행하거나 main에 변경 사항을 올리면 배포됩니다.

GitHub CLI가 연결된 환경에서는 다음 순서로 수행할 수 있습니다:

```sh
git init -b main
git add .
git commit -m "Build mobile field report website"
gh repo create YJfireclimbing --public --source=. --remote=origin --push
# OWNER를 실제 GitHub 사용자 이름으로 바꾸세요.
gh api --method POST repos/OWNER/YJfireclimbing/pages -f build_type=workflow
gh workflow run pages.yml
```

저장소가 이미 있으면 새로 만들지 말고 해당 저장소에 변경을 올리세요. 실제 URL은 Pages 설정 또는 Actions의 deployment 출력에서 확인합니다. 기본 주소 형태는 `https://OWNER.github.io/YJfireclimbing/`입니다. 이 프로젝트의 기본 주소는 https://seunghoe119-art.github.io/YJfireclimbing/ 입니다. 배포 완료 여부는 Pages 설정에서 확인하세요.

## QR 코드

배포가 성공한 후 실제 Pages URL로 QR 코드를 생성하세요. QR을 스캔하여 스마트폰 브라우저에서 사진 촬영·위치 권한·전송을 테스트한 다음 배포합니다. 카카오톡 등의 앱 내부 브라우저에서 카메라 또는 위치가 동작하지 않으면 Safari/Chrome으로 열어 주세요.

## 동작 및 실패 처리

- 촬영/재촬영과 앨범 선택. 모바일의 파일 선택 카메라를 사용하므로 기기별 선택 화면은 다릅니다.
- JPG/PNG/WebP만 허용, 사진 한 장 최대 10MB. HEIC는 JPG 변환 안내.
- 위치 동의 후 버튼을 눌러야 GPS를 요청. 권한 거부·시간 초과·위치 확인 불가 안내. 동의 해제 시 좌표를 지우며 진행 중이던 위치 응답도 무시.
- 사진 선택 시각과 위치 확인 시각을 각각 표시. 사진의 실제 촬영 시각/EXIF를 추정하지 않음.
- 사진·좌표·정확도·Google 지도 링크 미리보기, 메모 입력, 별도의 전송 동의.
- 사진 첨부는 FormSubmit 기본 endpoint로 native multipart/form-data 폼 전송. FormSubmit 확인 화면을 거치며 정상 반환 시 접수 요청 완료 표시. 실제 메일 전달 성공과 구분.
- 중복 클릭 차단. 오프라인·서버 거부·통신/60초 제한 오류 안내. 실패 시 데이터 유지. 통신 오류는 서버 접수 여부가 불명확하므로 재전송 시 중복 가능 안내.
- 브라우저 영구 저장소를 사용하지 않음. 새 기록 버튼으로 사진·위치·동의를 초기화.

## 검증해야 할 운영 항목

수신 이메일이 정해지지 않아 실제 외부 전송과 이메일 수신은 검증하지 않았습니다. 모바일 실기기의 카메라/GPS도 배포 후 확인해야 합니다. 공개 전 관리자가 개인정보 안내에 운영자 연락처·보관기간 등 실제 운영 방침을 추가하세요. 사진 파일의 원본 메타데이터는 제거하지 않습니다.

FormSubmit 파일 첨부/10MB 제한/인증/토큰/AJAX 안내: https://formsubmit.co/documentation
GitHub Pages Actions 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
