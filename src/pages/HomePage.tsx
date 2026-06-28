import PageHeader from '../components/common/PageHeader';

export default function HomePage() {
  return (
    <section className="page">
      <PageHeader
        title="BaseKit 대시보드"
        description="좌측 메뉴를 선택하면 프로그램 탭이 열리고 작업 영역에서 화면을 확인할 수 있습니다."
      />

      <div className="dashboard-grid">
        <section>
          <h2>오늘 구현 범위</h2>
          <p>Admin Shell, MDI 탭, 사용자관리 mock 조회 흐름</p>
        </section>
        <section>
          <h2>확장 기준</h2>
          <p>Menu, Program, Action 메타데이터 기준으로 화면을 확장합니다.</p>
        </section>
      </div>
    </section>
  );
}
