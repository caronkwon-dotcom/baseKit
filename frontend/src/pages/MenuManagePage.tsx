import { useState } from 'react';
import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { metadataRepository } from '../repositories/metadataRepository';
import type { MenuMeta } from '../types/adminShell';
import { discoveredPrograms } from '../config/programDiscovery';

const menus = metadataRepository.getMenus();

/*const programOptions = discoveredPrograms.map(program => ({
  value: program.programKey,
  label: `${program.programName} (${program.programKey})`,
}));*/

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
  const [selectedMenu, setSelectedMenu] = useState<MenuMeta | null>(null);

  return (
    <section className="page">
      <PageHeader
        breadcrumbs={['시스템관리', '메뉴관리']}
        description="업무 메뉴 구조와 프로그램 연결 정보를 확인합니다."
      />

      <DataTable
        title="메뉴 목록"
        columns={menuColumns}
        rows={menus}
        getRowKey={(menu) => menu.menuKey}
        onRowClick={setSelectedMenu}
      />

      <div className="detail-section">
        <h2>메뉴 상세</h2>

        {selectedMenu ? (
            <div>
              <div>메뉴 키: {selectedMenu.menuKey}</div>
              <div>메뉴명: {selectedMenu.menuName}</div>
              <div>
                <label htmlFor="programKey">프로그램</label>

                <select
                    id="programKey"
                    value={selectedMenu.programKey ?? ''}
                    onChange={() => {}}
                >
                  <option value="">프로그램 선택</option>

                  {discoveredPrograms.map(program => (
                      <option
                          key={program.programKey}
                          value={program.programKey}
                      >
                        {program.programName} ({program.programKey})
                      </option>
                  ))}
                </select>
              </div>
            </div>
        ) : (
            <div className="empty-detail">
              메뉴를 선택하세요.
            </div>
        )}
      </div>
    </section>
  );
}
