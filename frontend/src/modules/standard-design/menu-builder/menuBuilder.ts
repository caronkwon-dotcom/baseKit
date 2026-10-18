export interface MenuNode {
  MENU_ID: string;
  PARENT_ID: string | null;
  MENU_NAME: string;
  DESCRIPTION: string;
  MENU_TYPE: 'FOLDER' | 'SCREEN';
  REQUIREMENTS: { REQUIREMENT_ID: string; REQUIREMENT_NAME: string }[];
  GROUP_NAME: string;
  AI_REASON: string;
}
export type Position = 'before' | 'inside' | 'after';
export interface TreeRow { node: MenuNode; depth: number }
export const STORAGE_KEY = 'sd-menu-builder-prototype-v1';
export function rows(nodes: MenuNode[], parent: string | null = null, depth = 1): TreeRow[] {
  return nodes.filter(n => n.PARENT_ID === parent).flatMap(node => [{ node, depth }, ...rows(nodes, node.MENU_ID, depth + 1)]);
}
export function moveMenu(nodes: MenuNode[], id: string, targetId: string, position: Position): { nodes: MenuNode[]; error?: string } {
  const flat = rows(nodes);
  const source = flat.find(r => r.node.MENU_ID === id);
  const target = flat.find(r => r.node.MENU_ID === targetId);
  if (!source || !target) return { nodes, error: '이동할 메뉴를 찾을 수 없습니다.' };
  const start = flat.indexOf(source);
  let end = start + 1;
  while (end < flat.length && flat[end].depth > source.depth) end++;
  const subtree = flat.slice(start, end);
  if (subtree.some(r => r.node.MENU_ID === targetId)) return { nodes, error: '자기 자신 또는 후손 아래로 이동할 수 없습니다.' };
  const depth = position === 'inside' ? target.depth + 1 : target.depth;
  if (Math.max(...subtree.map(r => r.depth)) + depth - source.depth > 3) return { nodes, error: '자손을 포함하여 최대 3Depth까지만 배치할 수 있습니다.' };
  const remaining = flat.filter(r => !subtree.includes(r));
  let index = remaining.findIndex(r => r.node.MENU_ID === targetId);
  if (position !== 'before') {
    index++;
    while (index < remaining.length && remaining[index].depth > target.depth) index++;
  }
  const parent = position === 'inside' ? targetId : target.node.PARENT_ID;
  const moved = subtree.map(r => r.node.MENU_ID === id ? { ...r.node, PARENT_ID: parent } : r.node);
  return { nodes: [...remaining.slice(0, index).map(r => r.node), ...moved, ...remaining.slice(index).map(r => r.node)] };
}
export function auxiliaryTarget(nodes: MenuNode[], id: string, direction: 'up' | 'down' | 'indent' | 'outdent'): { id: string; position: Position } | null {
  const node = nodes.find(n => n.MENU_ID === id);
  if (!node) return null;
  const siblings = nodes.filter(n => n.PARENT_ID === node.PARENT_ID);
  const i = siblings.indexOf(node);
  if (direction === 'outdent') return node.PARENT_ID ? { id: node.PARENT_ID, position: 'after' } : null;
  const target = direction === 'down' ? siblings[i + 1] : siblings[i - 1];
  return target ? { id: target.MENU_ID, position: direction === 'indent' ? 'inside' : direction === 'down' ? 'after' : 'before' } : null;
}
export function parseDraft(raw: string): MenuNode[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length === 0 || data.length > 2000) throw new Error('지원하지 않는 초안입니다.');
  const ids = new Set<string>();
  for (const n of data) {
    if (!n || typeof n.MENU_ID !== 'string' || !n.MENU_ID || ids.has(n.MENU_ID) || !(n.PARENT_ID === null || typeof n.PARENT_ID === 'string') || !['MENU_NAME', 'DESCRIPTION', 'GROUP_NAME', 'AI_REASON'].every(k => typeof n[k] === 'string') || !['FOLDER', 'SCREEN'].includes(n.MENU_TYPE) || !Array.isArray(n.REQUIREMENTS) || !n.REQUIREMENTS.every((r: Record<string, unknown>) => r && typeof r.REQUIREMENT_ID === 'string' && typeof r.REQUIREMENT_NAME === 'string')) throw new Error('초안 형식이 올바르지 않습니다.');
    ids.add(n.MENU_ID);
  }
  for (const n of data) {
    const seen = new Set([n.MENU_ID]);
    let parent = n.PARENT_ID;
    while (parent !== null) {
      if (seen.has(parent) || !ids.has(parent) || seen.size >= 3) throw new Error('메뉴 계층이 올바르지 않습니다.');
      seen.add(parent);
      parent = data.find(p => p.MENU_ID === parent).PARENT_ID;
    }
  }
  return rows(data).map(r => r.node);
}
export const sampleMenus: MenuNode[] = [
  ['sales', null, '영업 관리', '영업 현황과 주문을 한곳에서 관리합니다.', 'FOLDER', '영업·주문', '주문 흐름과 고객 요구사항을 하나의 업무 영역으로 묶었습니다.'],
  ['dashboard', 'sales', '영업 대시보드', '매출 추이와 주요 지표를 확인합니다.', 'SCREEN', '영업·주문', '영업 현황 조회 요구사항을 대표 화면으로 구성했습니다.'],
  ['orders', 'sales', '주문 관리', '주문 접수부터 처리 현황까지 관리합니다.', 'FOLDER', '영업·주문', '주문 등록과 조회의 공통 업무 맥락을 반영했습니다.'],
  ['order-list', 'orders', '주문 조회', '조건별로 주문과 진행 상태를 조회합니다.', 'SCREEN', '영업·주문', '주문 검색 및 상세 조회 요구사항을 연결했습니다.'],
  ['order-create', 'orders', '주문 등록', '고객별 신규 주문을 작성합니다.', 'SCREEN', '영업·주문', '주문 입력을 별도의 화면 후보로 제안했습니다.'],
  ['customers', 'sales', '고객 관리', '고객 정보와 거래 내역을 조회합니다.', 'SCREEN', '고객 정보', '고객 기본정보와 거래 이력의 연관성을 반영했습니다.'],
  ['inventory', null, '재고·물류', '재고 수량과 입출고 흐름을 관리합니다.', 'FOLDER', '재고·물류', '재고와 물류의 연속된 업무 흐름을 묶었습니다.'],
  ['stock', 'inventory', '재고 현황', '품목별 가용 재고를 확인합니다.', 'SCREEN', '재고·물류', '재고 조회 요구사항을 독립 화면으로 구성했습니다.'],
  ['delivery', 'inventory', '출고 관리', '주문에 따른 출고 작업을 관리합니다.', 'SCREEN', '재고·물류', '출고 지시와 처리 상태 요구사항을 함께 연결했습니다.'],
  ['reports', null, '분석·리포트', '업무 성과를 분석합니다.', 'FOLDER', '실적 분석', '분석성 조회 기능을 업무 처리 화면과 구분했습니다.'],
  ['monthly', 'reports', '월간 실적', '월별 매출과 실적을 비교합니다.', 'SCREEN', '실적 분석', '기간별 실적 비교 요구사항을 반영했습니다.'],
  ['settings', null, '기준 정보', '업무에 필요한 기준 정보를 관리합니다.', 'FOLDER', '기준 정보', '여러 업무에서 재사용되는 기준 정보를 묶었습니다.'],
  ['products', 'settings', '품목 관리', '품목과 분류 정보를 관리합니다.', 'SCREEN', '기준 정보', '품목 기본정보 요구사항을 대표 화면에 연결했습니다.'],
].map((a, i) => ({ MENU_ID: a[0]!, PARENT_ID: a[1], MENU_NAME: a[2]!, DESCRIPTION: a[3]!, MENU_TYPE: a[4] as MenuNode['MENU_TYPE'], GROUP_NAME: a[5]!, AI_REASON: a[6]!, REQUIREMENTS: [{ REQUIREMENT_ID: `REQ-${String(i + 1).padStart(3, '0')}`, REQUIREMENT_NAME: `${a[2]} 기능 및 조회` }] }));
