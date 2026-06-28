import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { menus } from '../config/adminPrograms';
import type { MenuMeta } from '../types/adminShell';

const menuColumns: DataTableColumn<MenuMeta>[] = [
  {
    key: 'menuKey',
    header: '메뉴 키',
    render: (menu) => menu.menuKey,
  },
  {
    key: 'menuName',
    header: '메뉴명',
    render: (menu) => menu.menuName,
  },
  {
    key: 'menuLevel',
    header: 'Depth',
    render: (menu) => menu.menuLevel,
  },
  {
    key: 'programKey',
    header: '프로그램',
    render: (menu) => menu.programKey ?? '-',
  },
  {
    key: 'useYn',
    header: '사용 여부',
    render: (menu) => (menu.useYn === 'Y' ? '사용' : '미사용'),
  },
];

export default function MenuManagePage() {
  return (
    <section className="page">
      <PageHeader
        breadcrumbs={['시스템관리', '메뉴관리']}
        title="메뉴관리"
        description="업무 메뉴 구조와 프로그램 연결 정보를 확인합니다."
      />

      <DataTable
        title="메뉴 목록"
        columns={menuColumns}
        rows={menus}
        getRowKey={(menu) => menu.menuKey}
      />

      <div className="detail-section">
        <h2>메뉴 상세</h2>
        <div className="empty-detail">
          메뉴 상세 편집은 저장 API 연동 단계에서 구현합니다.
        </div>
      </div>
    </section>
  );
}
