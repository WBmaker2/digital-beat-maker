# 리듬 숙제장 - Design Wireframes

## 1. Product Flow
- Landing page에서 서비스 소개와 역할 선택을 제공한다.
- Teacher dashboard에서 과제를 생성하고 제출 현황을 본다.
- Student submission page에서 리듬을 확인하고 제출한다.
- Parent status page에서 학생 이름과 제출 상태를 확인한다.

## 2. Landing Page
- Hero: 서비스 이름, 한 줄 설명, 핵심 가치 3개.
- Primary CTAs: `교사로 시작`, `학생으로 접속`, `학부모로 확인`.
- Supporting area: "리듬 과제 만들기", "링크로 제출", "상태 확인"을 짧게 설명.
- Default state: 시각적으로 명확한 3분기 진입점.
- Empty state: 로그인 전이라도 역할 선택이 가능해야 한다.
- Loading state: 최소한의 스켈레톤 또는 정적 로딩 메시지.
- Error state: 서비스 준비 실패 시 재시도 안내와 대체 진입 링크 표시.

## 3. Teacher Dashboard
- Header: 과제 수, 제출 완료 수, 마감 임박 수를 요약한다.
- Main area: 과제 카드 리스트와 `새 과제 만들기` 버튼.
- Each card: 제목, 마감일, 제출 현황, 공유 링크 상태, 수정/보기 액션.
- Default state: 기존 과제가 1개 이상 보이는 목록.
- Empty state: 첫 과제를 만들라는 안내 카드와 CTA.
- Loading state: 카드 스켈레톤 3개.
- Error state: 과제 목록 조회 실패 시 재시도 버튼과 설명.

## 4. Assignment Creation Form
- Fields: 과제 제목, 설명, 마감일, 대상 학년, 기본 리듬 예시, 공개 여부.
- Bottom actions: `임시 저장`, `과제 발행`.
- Helper text: 학생이 이해하기 쉬운 문장과 리듬 예시 입력을 권장.
- Default state: 빈 폼과 예시 placeholder.
- Empty state: 아직 저장된 값이 없는 새 작성 화면.
- Loading state: 발행 중 버튼 비활성화와 진행 메시지.
- Success state: 발행 완료 후 과제 상세 페이지 또는 대시보드로 이동.
- Error state: 필수값 누락, 마감일 오류, 저장 실패를 필드 단위로 표시.

## 5. Student Submission Page
- Header: 과제 제목, 마감일, 제출 상태.
- Main area: 과제 설명, 리듬 패턴 미리보기, 제출 입력 영역.
- Inputs: 학생 이름, 선택적 메모, 제출 버튼.
- Default state: 과제 내용을 읽고 제출 준비가 된 상태.
- Empty state: 과제가 없으면 유효하지 않은 링크 안내를 보여준다.
- Loading state: 과제 상세를 불러오는 동안 스켈레톤 표시.
- Success state: 제출 완료 확인과 재제출 허용 여부 안내.
- Error state: 링크 만료, 제출 실패, 네트워크 오류를 분리해서 보여준다.

## 6. Parent Status Page
- Header: 학생 이름 검색 또는 직접 입력.
- Main area: 과제별 제출 상태 리스트.
- Each row: 과제명, 제출 여부, 마지막 제출 시각, 확인 상태.
- Default state: 최근 제출 상태가 있는 목록.
- Empty state: 조회 결과가 없을 때 검색어 재확인 안내.
- Loading state: 검색 결과 로딩 스켈레톤.
- Error state: 조회 실패 시 다시 시도할 수 있는 메시지.

## 7. Responsive Rules
- Mobile: 단일 컬럼, 큰 터치 타깃, 카드 간 간격을 넉넉히 둔다.
- Desktop: 대시보드는 요약 영역과 리스트를 2열로 나눌 수 있다.
- Forms: 한 화면에 모든 필드를 밀어 넣지 말고 단계적 섹션으로 읽히게 한다.

## 8. Visual Direction
- 친근하고 교육적인 톤을 유지하되 너무 유아적이지 않게 한다.
- 명확한 색 대비와 큰 제목, 부드러운 카드형 레이아웃을 쓴다.
- 상태 색상은 제출 성공, 진행 중, 오류를 즉시 구분할 수 있어야 한다.
