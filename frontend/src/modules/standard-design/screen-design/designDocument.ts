import { ACTION_DEFS, ALIGN_LABELS, CONTROL_LABELS, DATA_TYPE_LABELS, SCREEN_TYPE_LABELS, STATUS_LABELS, type DesignBody, type ScreenType } from './screenDesign.ts';
import { uncoveredRequirements } from './functionSpec.ts';

/**
 * Screen design document (HTML) renderer. Pure: the same data always gives the same single-file HTML with no external resources.
 * Part A is for business review and Part B is the developer / AI developer work order; both are generated from one data object.
 * Every user or AI text is escaped, the design JSON is shown as escaped text (never inside a script), and neither prompts nor
 * model output of the AI draft are part of the document.
 */

export interface DocEvidence { REQUIREMENT_ID: string; NAME: string; SUMMARY: string }
export interface DesignDocData {
  generatedAt: string;
  projectId: string;
  projectName: string;
  program: { PROGRAM_ID: string; PROGRAM_NAME: string; PROGRAM_KIND_LABEL: string; SOURCE_GROUP_ID: string; SOURCE_GROUP_NAME: string; DESCRIPTION: string };
  design: { VERSION: number; DESIGN_STATUS: 'DRAFT' | 'CONFIRMED' };
  evidence: DocEvidence[];
  body: DesignBody;
}

const STATUS_STAMP = { DRAFT: '초안 · 현업 검토 전', CONFIRMED: '확정' } as const;
const SUMMARY_LIMIT = 200;

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

/** UI-SDPG-3D3D81E2-V3 — the program ID without its fixed prefix, first 8 characters, upper case, plus the design version. */
export function buildDocNo(programId: string, version: number): string {
  const core = programId.replace(/^SDPG-/i, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  return `UI-SDPG-${core || 'UNKNOWN'}-V${version}`;
}
export const docFileName = (programId: string, version: number) => `${buildDocNo(programId, version)}.html`;

const clip = (text: string, limit: number) => text.length > limit ? `${text.slice(0, limit)}…` : text;

/** Program ledger evidence (snapshot JSON as stored) → document rows. A snapshot that cannot be read only loses its text. */
export function evidenceFromProgram(evidence: { REQUIREMENT_ID: string; SNAPSHOT_JSON: string | null }[]): DocEvidence[] {
  return evidence.map(item => {
    let name = '', summary = '';
    try {
      const snapshot = JSON.parse(item.SNAPSHOT_JSON ?? '{}') as { name?: unknown; description?: unknown };
      name = typeof snapshot.name === 'string' ? snapshot.name : '';
      summary = typeof snapshot.description === 'string' ? clip(snapshot.description.replace(/\s+/g, ' ').trim(), SUMMARY_LIMIT) : '';
    } catch { /* keep empty */ }
    return { REQUIREMENT_ID: item.REQUIREMENT_ID, NAME: name, SUMMARY: summary };
  });
}

/** The single data object (also embedded as text for AI developers). Plain keys only; nothing internal. */
export function buildDesignJson(data: DesignDocData) {
  const { body, program } = data;
  return {
    DOC_NO: buildDocNo(program.PROGRAM_ID, data.design.VERSION), GENERATED_AT: data.generatedAt, PROJECT_ID: data.projectId,
    PROGRAM: { PROGRAM_ID: program.PROGRAM_ID, PROGRAM_NAME: program.PROGRAM_NAME, PROGRAM_KIND: program.PROGRAM_KIND_LABEL, SOURCE_GROUP_ID: program.SOURCE_GROUP_ID, SOURCE_GROUP_NAME: program.SOURCE_GROUP_NAME, DESCRIPTION: program.DESCRIPTION },
    DESIGN: { DESIGN_VERSION: data.design.VERSION, DESIGN_STATUS: data.design.DESIGN_STATUS, SCREEN_TYPE: body.SCREEN_TYPE, SCREEN_TYPE_LABEL: SCREEN_TYPE_LABELS[body.SCREEN_TYPE] },
    EVIDENCE: data.evidence,
    SEARCH_FIELDS: body.SEARCH_FIELDS, GRID_COLUMNS: body.GRID_COLUMNS, DETAIL_FIELDS: body.DETAIL_FIELDS,
    ACTIONS: body.ACTION_CODES.map(code => ({ ACTION_CODE: code, LABEL: ACTION_DEFS.find(item => item.code === code)?.label ?? code })),
    FUNCTION_SPECS: body.FUNCTION_SPECS ?? [],
    PERMISSIONS: body.ACTION_CODES.map(code => ({ ROLE_CODE: 'ADMIN', ACTION_CODE: code, ALLOW_YN: 'Y' })),
  };
}

/** Fixed per-screen-type guidance for Part B. Not written by AI, so the instructions never change between runs. */
export function componentGuide(type: ScreenType, searchCount: number): [string, string][] {
  const rows = Math.max(1, Math.ceil(searchCount / 4));
  const search = rows > 5 ? ['SearchPanel', `검색조건 ${searchCount}개는 5단(최대 20개)을 넘습니다. 구현 전에 항목 조정 또는 사전 보고가 필요합니다.`] as [string, string] : ['SearchPanel', `rows=${rows} (한 단에 검색조건 최대 4개)`] as [string, string];
  const header: [string, string] = ['PageHeader', 'breadcrumbs=[Standard Design, 화면 설계], rightContent=ProjectContextSelector'];
  const action: [string, string] = ['ActionButton', '모든 버튼은 ActionButton(data-action-code). 신규 버튼 CSS 금지'];
  const message: [string, string] = ['BaseKitMessage', '저장·오류·이동 차단 안내는 메시지 영역을 사용한다(토스트·alert 신규 도입 금지)'];
  switch (type) {
    case 'GRID_DETAIL': return [header, search, ['MasterDetailMultiGrid', 'master=목록 BaseKitDataGrid, detailTopSizing="content"'], ['BaseKitDataGrid', '목록: title·총건수·toolbarActions, 행 선택=currentRowKey'], action, message];
    case 'GRID_ONLY': return [header, search, ['BaseKitDataGrid', '목록 단독: title·총건수·toolbarActions'], action, message];
    case 'FORM_ONLY': return [header, ['FormField / FormSelect', '입력 항목은 공통 폼 컴포넌트와 RequiredFieldsNotice를 사용한다'], action, message];
    case 'TREE_DETAIL': return [header, ['(공통 Tree 컴포넌트 없음)', '현재 공통 컴포넌트에 Tree가 없습니다. 구현하지 말고 공통 컴포넌트 추가 여부를 사전 보고한다.'], ['MasterDetailMultiGrid', '상세 영역은 detailTop/detailBottom 구성을 따른다'], action, message];
    case 'POPUP': return [['FormModal', '팝업은 공통 FormModal(제목·제출·닫기)을 사용한다'], ['FormField / FormSelect', '입력 항목은 공통 폼 컴포넌트를 사용한다'], action, message];
  }
}

const css = `
:root{--ink:#1d2433;--sub:#475569;--mute:#64748b;--line:#d6deea;--line2:#e8edf4;--bg:#eef2f7;--paper:#fff;--brand:#1f6feb;--brand-soft:#e8f0fe;--brand-dark:#1a56b8;--ai:#6d28d9;--ai-soft:#f5f3ff;--ok:#047857;--ok-soft:#ecfdf5;--warn:#92400e;--warn-soft:#fffbeb;--bad:#b91c1c;--bad-soft:#fef2f2}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 Inter,'Segoe UI','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif;overflow-wrap:anywhere}
.layout{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1280px;margin:0 auto;gap:20px;padding:20px}
nav.toc{position:sticky;top:20px;align-self:start;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px 12px;font-size:12.5px}
nav.toc b{display:block;font-size:11px;letter-spacing:.04em;color:var(--mute);margin:10px 6px 4px}nav.toc b:first-child{margin-top:0}
nav.toc a{display:block;padding:4px 8px;border-radius:5px;color:var(--sub);text-decoration:none}nav.toc a:hover{background:var(--brand-soft);color:var(--brand-dark)}
nav.toc .tools{margin-top:12px;padding-top:10px;border-top:1px solid var(--line2);display:grid;gap:6px}
button.btn{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:#fff;color:var(--sub);border-radius:6px;padding:6px 10px;cursor:pointer}
button.btn:hover{background:#f1f5f9}button.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}
main{min-width:0}
section.sheet{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:26px 30px;margin-bottom:16px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid var(--ink)}h3{font-size:14px;margin:20px 0 8px}
p{margin:6px 0}
.part{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.05em;padding:2px 9px;border-radius:10px;margin-bottom:8px}
.part.a{background:var(--brand-soft);color:var(--brand-dark)}.part.b{background:#1e293b;color:#fff}
.cover .sub{color:var(--mute);margin-bottom:16px}
.stamp{float:right;border:2px solid var(--warn);color:var(--warn);background:var(--warn-soft);font-weight:800;border-radius:6px;padding:4px 12px;transform:rotate(3deg);font-size:13px}
.stamp.ok{border-color:var(--ok);color:var(--ok);background:var(--ok-soft)}
dl.meta{display:grid;grid-template-columns:110px minmax(0,1fr) 110px minmax(0,1fr);border:1px solid var(--line);border-radius:8px;overflow:hidden;margin:14px 0 0}
dl.meta dt,dl.meta dd{margin:0;padding:7px 12px;border-bottom:1px solid var(--line2);font-size:13px}
dl.meta dt{background:#f8fafc;font-weight:700;color:var(--sub)}
table.t{width:100%;border-collapse:collapse;font-size:12.5px;margin:6px 0 4px}
table.t th{background:#f1f5f9;color:var(--sub);text-align:left;font-weight:700;padding:7px 9px;border:1px solid var(--line)}
table.t td{padding:7px 9px;border:1px solid var(--line);vertical-align:top}
table.t td.c,table.t th.c{text-align:center}
table.t td.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:nowrap;color:var(--brand-dark);font-weight:700}
.pre{white-space:pre-wrap}
table.t td code{white-space:nowrap}
.tag{display:inline-block;font-size:11px;font-weight:700;padding:0 7px;line-height:18px;border-radius:9px;border:1px solid transparent;white-space:nowrap}
.tag.ai{background:var(--ai-soft);color:var(--ai);border-color:#ddd6fe}.tag.user{background:#f1f5f9;color:var(--sub);border-color:var(--line)}
.note{border-left:4px solid var(--brand);background:var(--brand-soft);padding:9px 14px;border-radius:0 6px 6px 0;margin:10px 0;font-size:13px}
.note.warn{border-color:#f59e0b;background:var(--warn-soft)}.note.ai{border-color:var(--ai);background:var(--ai-soft)}
ul.tight{margin:4px 0 4px 18px;padding:0}ul.tight li{margin:2px 0}
code{font-family:ui-monospace,Consolas,monospace;font-size:12px;background:#f1f5f9;border-radius:3px;padding:0 4px}
.wf{border:1px solid var(--line);border-radius:8px;background:#f8fafc;padding:12px;font-size:12px}
.wf .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.wf .box{background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin-bottom:8px}
.wf .box>.cap{font-size:11px;font-weight:800;color:var(--mute);margin-bottom:6px}
.wf .fld{display:flex;align-items:center;gap:6px}.wf .fld label{color:var(--sub);font-weight:700}
.wf .inp{border:1px solid #cbd5e1;border-radius:4px;min-width:110px;height:24px;background:#fff;padding:0 6px;display:flex;align-items:center;color:var(--mute);font-size:11px}
.wf .inp.ro{background:#f1f5f9}
.wf .btnx{border:1px solid #cbd5e1;background:#f8fafc;border-radius:4px;padding:2px 10px;font-weight:700;color:#334155}
.wf table{width:100%;border-collapse:collapse}.wf th{background:#f1f5f9;border:1px solid var(--line);padding:4px 6px;text-align:left;font-size:11px}
.wf td{border:1px solid var(--line2);padding:4px 6px;color:var(--mute);font-size:11px}
.co{display:inline-block;background:var(--ai);color:#fff;border-radius:3px;font-size:9.5px;font-weight:800;font-style:normal;line-height:14px;padding:0 4px;margin-right:3px}
.co.b{background:#0f766e}.co.g{background:#b45309}.co.d{background:#be185d}
select.dec,input.cmt,input.sig{font:inherit;font-size:12.5px;border:1px solid #cbd5e1;border-radius:5px;padding:4px 6px;width:100%;background:#fff}
select.dec.ok{background:var(--ok-soft);color:var(--ok);border-color:#a7f3d0}select.dec.fix{background:var(--bad-soft);color:var(--bad);border-color:#fca5a5}select.dec.hold{background:var(--warn-soft);color:var(--warn);border-color:#fcd34d}
.sum{display:flex;gap:14px;font-size:12.5px;margin:8px 0;color:var(--sub)}.sum b{color:var(--ink)}
.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.sign div{border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:12px;color:var(--sub)}.sign input{margin-top:6px}
pre.blk{background:#0f172a;color:#e2e8f0;border-radius:8px;padding:14px 16px;overflow:auto;font:12px/1.55 ui-monospace,Consolas,monospace;margin:8px 0;white-space:pre-wrap;word-break:break-word;max-height:420px}
.copyrow{display:flex;gap:8px;align-items:center;margin:6px 0}.copyrow span{font-size:12px;color:var(--mute)}
.ac{margin:4px 0 0;padding:0;list-style:none}.ac li{padding:3px 0 3px 22px;position:relative;font-size:12.5px}.ac li::before{content:"☐";position:absolute;left:0;color:var(--mute)}
.dont li::before{content:"✕";color:var(--bad)}
@media print{body{background:#fff}.layout{display:block;padding:0}nav.toc,.copyrow button{display:none}section.sheet{border:0;border-radius:0;padding:0 0 10px;margin:0 0 14px}section.sheet.pb{break-before:page}pre.blk{max-height:none;background:#f1f5f9;color:#111}select.dec,input.cmt,input.sig{border:0;border-bottom:1px solid #999;border-radius:0;appearance:none}}`;

/** Fixed text only (no data is ever placed into the script). Copy, print and the review tally are the only scripted parts. */
const script = `
function decide(el){el.className='dec '+el.value;tally();}
function tally(){var ds=[].slice.call(document.querySelectorAll('select.dec'));var n=function(v){return ds.filter(function(d){return d.value===v}).length};var box=document.getElementById('sum');if(box)box.innerHTML='<span>전체 <b>'+ds.length+'</b>건</span><span>승인 <b>'+n('ok')+'</b></span><span>수정요청 <b>'+n('fix')+'</b></span><span>보류 <b>'+n('hold')+'</b></span><span>미검토 <b>'+n('')+'</b></span>';}
function copyText(id,btn){var t=document.getElementById(id).textContent;var done=function(){var o=btn.textContent;btn.textContent='복사됨';setTimeout(function(){btn.textContent=o},1400)};var fb=function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(e){}a.remove()};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done).catch(fb)}else fb()}
tally();`;

const tag = (source: string) => `<span class="tag ${source === 'AI' ? 'ai' : 'user'}">${source === 'AI' ? 'AI 제안' : '직접 작성'}</span>`;
const required = (value: string | undefined) => value === 'Y' ? '필수' : '-';
const code = (value: string) => `<code>${escapeHtml(value)}</code>`;
const table = (head: string[], rows: string[]) => `<table class="t"><thead><tr>${head.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
const list = (lines: readonly string[]) => lines.length ? `<ul class="tight">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '';

function wireframe(data: DesignDocData): string {
  const { body } = data;
  const search = body.SEARCH_FIELDS.map(f => `<span class="fld"><label><i class="co">${escapeHtml(f.FIELD_ID)}</i>${escapeHtml(f.LABEL)}</label><span class="inp">${f.CONTROL_TYPE === 'COMBO' ? '전체 ▾' : f.CONTROL_TYPE === 'DATE' || f.CONTROL_TYPE === 'DATE_RANGE' ? 'YYYY-MM-DD' : ''}</span></span>`).join('');
  const head = body.GRID_COLUMNS.map(c => `<th><i class="co g">${escapeHtml(c.FIELD_ID)}</i>${escapeHtml(c.LABEL)}</th>`).join('');
  const sample = [1, 2].map(() => `<tr>${body.GRID_COLUMNS.map(() => '<td>…</td>').join('')}</tr>`).join('');
  const detail = body.DETAIL_FIELDS.map(f => `<span class="fld" style="width:48%"><label style="min-width:70px"><i class="co d">${escapeHtml(f.FIELD_ID)}</i>${escapeHtml(f.LABEL)}${f.REQUIRED_YN === 'Y' ? '<span style="color:#dc2626">*</span>' : ''}</label><span class="inp${f.READONLY_YN === 'Y' ? ' ro' : ''}" style="flex:1">${f.CONTROL_TYPE === 'COMBO' ? '선택 ▾' : ''}</span></span>`).join('');
  const buttons = body.ACTION_CODES.map(c => `<span class="btnx"><i class="co b">B</i>${escapeHtml(ACTION_DEFS.find(item => item.code === c)?.label ?? c)} <small>(${escapeHtml(c)})</small></span>`).join(' ');
  const type = body.SCREEN_TYPE;
  const showSearch = type === 'GRID_DETAIL' || type === 'GRID_ONLY';
  const showGrid = type === 'GRID_DETAIL' || type === 'GRID_ONLY' || type === 'TREE_DETAIL';
  const showDetail = type !== 'GRID_ONLY';
  return `<div class="wf">${showSearch || !showGrid ? `<div class="box"><div class="cap">${showSearch ? '검색영역 (S)' : '버튼 영역 (B)'}</div><div class="row">${showSearch ? search : ''}<span style="margin-left:auto">${buttons}</span></div></div>` : ''}${showGrid ? `<div class="box"><div class="cap">${type === 'TREE_DETAIL' ? '트리/목록 영역 (G)' : '목록 그리드 (G)'}</div><table><thead><tr>${head}</tr></thead><tbody>${sample}</tbody></table></div>` : ''}${showDetail ? `<div class="box"><div class="cap">${type === 'POPUP' ? '팝업 입력 영역 (D)' : '상세 영역 (D)'}</div><div class="row">${detail}</div></div>` : ''}</div><p style="font-size:12px;color:var(--mute);margin-top:6px">※ 개략 배치도입니다. 실제 화면은 BaseKit 공통 컴포넌트 규격(Part B-2)으로 구현됩니다. 항목 번호는 4장 항목 명세와 같습니다.</p>`;
}

export function buildAiPrompt(data: DesignDocData): string {
  const json = buildDesignJson(data);
  const functions = (data.body.FUNCTION_SPECS ?? []).map(f => `- ${f.FUNCTION_ID} ${f.NAME}${f.ACTION_CODE ? ` (${f.ACTION_CODE})` : ''}`).join('\n') || '- (기능 요건 없음 — 구현 전 설계 담당자에게 확인)';
  return `[역할] 이 저장소(BaseKit, SD 모듈)의 개발자.
[목표] 아래 화면 설계서(${json.DOC_NO}, 설계 v${data.design.VERSION})에 따라 프로그램 "${data.program.PROGRAM_NAME}"(${data.program.PROGRAM_ID}) 화면을 구현한다.
[이번 단계] AGENTS.md 규칙에 따라 PLAN(설계 이해 목록)까지만 보고한다. 승인 전에는 코드를 수정하지 않는다.
[구현 대상 기능]
${functions}
[준수] 화면 유형 ${data.body.SCREEN_TYPE}: BaseKit 공통 컴포넌트(${componentGuide(data.body.SCREEN_TYPE, data.body.SEARCH_FIELDS.length).map(row => row[0]).join(', ')})를 사용하고 신규 CSS·공통 파일 수정은 하지 않는다. 필요하면 구현하지 말고 보고한다.
[금지] 설계서에 없는 기능 추가, 비밀정보 저장, LLM 프런트 직접 호출, 승인 없는 commit/push/PR.
[PLAN에 포함] 1)이해한 요구사항 2)기존 구현과의 차이 3)신규·수정 파일 4)가정 5)승인 필요 사항 6)영향·위험
[설계 데이터] 아래 JSON이 단일 기준이다. 문서 표와 어긋나면 JSON을 따르고 불일치를 보고한다.
${JSON.stringify(json)}`;
}

export function renderDesignDocument(data: DesignDocData): string {
  const { body, program } = data;
  const specs = body.FUNCTION_SPECS ?? [];
  const docNo = buildDocNo(program.PROGRAM_ID, data.design.VERSION);
  const status = data.design.DESIGN_STATUS;
  const evidenceIds = data.evidence.map(item => item.REQUIREMENT_ID);
  const uncovered = uncoveredRequirements(specs, evidenceIds);
  const comps = componentGuide(body.SCREEN_TYPE, body.SEARCH_FIELDS.length);
  const typeLabel = SCREEN_TYPE_LABELS[body.SCREEN_TYPE];

  const functionRows = specs.map(f => `<tr><td class="id">${escapeHtml(f.FUNCTION_ID)}</td><td><b>${escapeHtml(f.NAME)}</b><br>${tag(f.SOURCE)}</td><td>${f.ACTION_CODE ? code(f.ACTION_CODE) : '<span style="color:var(--mute)">-</span>'}</td><td><span class="pre">${escapeHtml(f.DESCRIPTION)}</span>${list(f.RULES)}</td><td>${f.VALIDATIONS.length ? list(f.VALIDATIONS) : '-'}</td><td>${f.REQUIREMENT_IDS.map(code).join(' ')}</td></tr>`);
  const searchRows = body.SEARCH_FIELDS.map(f => `<tr><td class="id">${escapeHtml(f.FIELD_ID)}</td><td>${escapeHtml(f.LABEL)}</td><td>${escapeHtml(CONTROL_LABELS[f.CONTROL_TYPE] ?? f.CONTROL_TYPE)}</td><td class="c">${required(f.REQUIRED_YN)}</td><td>${escapeHtml(f.RULE ?? '')}</td><td>${tag(f.SOURCE)}</td></tr>`);
  const gridRows = body.GRID_COLUMNS.map(f => `<tr><td class="id">${escapeHtml(f.FIELD_ID)}</td><td>${escapeHtml(f.LABEL)}</td><td>${escapeHtml(DATA_TYPE_LABELS[f.DATA_TYPE] ?? f.DATA_TYPE)}</td><td class="c">${escapeHtml(ALIGN_LABELS[f.ALIGN] ?? f.ALIGN)}</td><td class="c">${escapeHtml(f.WIDTH)}</td><td>${tag(f.SOURCE)}</td></tr>`);
  const detailRows = body.DETAIL_FIELDS.map(f => `<tr><td class="id">${escapeHtml(f.FIELD_ID)}</td><td>${escapeHtml(f.LABEL)}</td><td>${escapeHtml(CONTROL_LABELS[f.CONTROL_TYPE] ?? f.CONTROL_TYPE)}</td><td class="c">${required(f.REQUIRED_YN)}</td><td class="c">${f.READONLY_YN === 'Y' ? '읽기전용' : '편집'}</td><td>${tag(f.SOURCE)}</td></tr>`);
  const empty = (columns: number, text: string) => `<tr><td colspan="${columns}" style="color:var(--mute)">${escapeHtml(text)}</td></tr>`;

  const traceBody = data.evidence.map(e => `<tr><td><code>${escapeHtml(e.REQUIREMENT_ID)}</code> ${escapeHtml(e.NAME)}</td>${specs.map(f => `<td class="c">${f.REQUIREMENT_IDS.includes(e.REQUIREMENT_ID) ? '●' : ''}</td>`).join('')}</tr>`);
  const trace = !data.evidence.length ? `<div class="note">근거 요구사항이 없는 프로그램입니다(수동 추가). 추적할 요구사항이 없습니다.</div>`
    : `${table(['요구사항', ...specs.map(f => f.FUNCTION_ID)], traceBody)}${uncovered.length ? `<div class="note warn"><b>누락 후보</b>: ${uncovered.map(escapeHtml).join(', ')} — 반영하는 기능이 없습니다.</div>` : `<div class="note">모든 근거 요구사항이 1개 이상의 기능에 반영되어 있습니다.</div>`}`;

  const reviewItems = ['화면 구성(2장)', '항목 명세(4장)', ...specs.map(f => `${f.FUNCTION_ID} ${f.NAME}`)];
  const reviewRows = reviewItems.map(item => `<tr><td>${escapeHtml(item)}</td><td><input class="cmt" type="text" placeholder="의견 입력"></td><td style="width:120px"><select class="dec" onchange="decide(this)"><option value="">미검토</option><option value="ok">승인</option><option value="fix">수정요청</option><option value="hold">보류</option></select></td></tr>`);

  const contractRows = [
    ...body.SEARCH_FIELDS.map(f => [f.FIELD_ID, '검색조건', f.LABEL, CONTROL_LABELS[f.CONTROL_TYPE] ?? f.CONTROL_TYPE, f.REQUIRED_YN]),
    ...body.GRID_COLUMNS.map(f => [f.FIELD_ID, '목록', f.LABEL, DATA_TYPE_LABELS[f.DATA_TYPE] ?? f.DATA_TYPE, '-']),
    ...body.DETAIL_FIELDS.map(f => [f.FIELD_ID, '상세', f.LABEL, CONTROL_LABELS[f.CONTROL_TYPE] ?? f.CONTROL_TYPE, f.REQUIRED_YN]),
  ].map(r => `<tr><td class="id">${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td><td>${escapeHtml(r[2])}</td><td>${escapeHtml(r[3])}</td><td class="c">${r[4] === 'Y' ? 'Y' : '-'}</td><td style="color:var(--mute)">PLAN에서 제안</td></tr>`);

  const functionInstructions = specs.map(f => `<h3>${escapeHtml(f.FUNCTION_ID)} ${escapeHtml(f.NAME)} ${f.ACTION_CODE ? code(f.ACTION_CODE) : ''}</h3><p class="pre">${escapeHtml(f.DESCRIPTION)}</p><table class="t"><tbody><tr><th style="width:110px">처리 규칙</th><td>${f.RULES.length ? list(f.RULES) : '-'}</td></tr><tr><th>검증·메시지</th><td>${f.VALIDATIONS.length ? list(f.VALIDATIONS) : '-'}</td></tr><tr><th>API</th><td style="color:var(--mute)">PLAN에서 경로·DTO 제안 (기존 API 계약과 응답 형식 <code>{DATA}</code>/<code>{MESSAGE}</code> 준수)</td></tr><tr><th>근거</th><td>${f.REQUIREMENT_IDS.map(code).join(' ') || '-'}</td></tr></tbody></table>`).join('');
  const acceptance = specs.map(f => `<h3>${escapeHtml(f.FUNCTION_ID)} ${escapeHtml(f.NAME)}</h3>${f.ACCEPTANCE.length ? `<ul class="ac">${f.ACCEPTANCE.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : '<p style="color:var(--mute)">수용 기준이 아직 없습니다.</p>'}`).join('');
  const noFunctions = `<div class="note warn"><b>기능 요건이 아직 없습니다.</b> 이 설계에는 기능 요건이 기록되어 있지 않아 기능별 규칙·검증·수용 기준을 확인할 수 없습니다. 설계 담당자에게 기능 요건 작성을 요청하세요.</div>`;

  const nav = `<nav class="toc" aria-label="목차"><b>공통</b><a href="#cover">표지 · 문서 정보</a><b>PART A · 현업 검토용</b><a href="#a1">1. 개요와 근거 요구사항</a><a href="#a2">2. 화면 구성</a><a href="#a3">3. 기능 요건</a><a href="#a4">4. 항목 명세</a><a href="#a5">5. 요구사항 추적표</a><a href="#a6">6. 현업 검토 의견</a><b>PART B · 개발 지시서</b><a href="#b1">1. 구현 범위</a><a href="#b2">2. 화면 구현 지침</a><a href="#b3">3. 데이터 계약</a><a href="#b4">4. 기능별 구현 지시</a><a href="#b5">5. 권한</a><a href="#b6">6. 수용 기준</a><a href="#b7">7. 작업 규칙</a><a href="#b8">8. AI 개발자용 입력</a><div class="tools"><button type="button" class="btn pri" onclick="window.print()">인쇄 / PDF 저장</button></div></nav>`;

  const main = `
<section class="sheet cover" id="cover"><span class="stamp${status === 'CONFIRMED' ? ' ok' : ''}">${STATUS_STAMP[status]}</span><div class="sub">Standard Design · 화면 설계서</div><h1>${escapeHtml(program.PROGRAM_NAME)}</h1><p style="color:var(--sub)" class="pre">${escapeHtml(program.DESCRIPTION)}</p>
<dl class="meta"><dt>문서번호</dt><dd>${escapeHtml(docNo)}</dd><dt>설계 버전</dt><dd>v${escapeHtml(data.design.VERSION)} (${STATUS_LABELS[status]})</dd><dt>프로젝트</dt><dd>${escapeHtml(data.projectName)} (${escapeHtml(data.projectId)})</dd><dt>생성일</dt><dd>${escapeHtml(data.generatedAt)}</dd><dt>프로그램ID</dt><dd>${escapeHtml(program.PROGRAM_ID)}</dd><dt>화면 유형</dt><dd>${escapeHtml(body.SCREEN_TYPE)} · ${escapeHtml(typeLabel)}</dd><dt>출처 그룹</dt><dd>${program.SOURCE_GROUP_ID ? `${escapeHtml(program.SOURCE_GROUP_NAME)} (${escapeHtml(program.SOURCE_GROUP_ID)})` : '수동 추가'}</dd><dt>프로그램 종류</dt><dd>${escapeHtml(program.PROGRAM_KIND_LABEL || '-')}</dd></dl>
<div class="note warn" style="margin-top:14px"><b>이 문서 보는 법</b> — <b>PART A</b>는 현업 담당자가 화면과 기능이 요구사항대로인지 확인하는 부분이고, <b>PART B</b>는 확인이 끝난 설계를 개발자·AI 개발자가 그대로 구현하도록 하는 지시서입니다. 두 부분은 같은 설계 데이터에서 만들어져 서로 어긋나지 않습니다.</div>
<div class="note ai"><span class="tag ai">AI 제안</span> 표시는 AI가 초안으로 만든 항목, <span class="tag user">직접 작성</span>은 사람이 추가·수정한 항목입니다. 검토 후 확정된 문서에서도 출처 표시는 유지됩니다.</div></section>

<section class="sheet" id="a1"><span class="part a">PART A · 현업 검토용</span><h2>1. 개요와 근거 요구사항</h2><p><b>목적</b>: <span class="pre">${escapeHtml(program.DESCRIPTION)}</span></p><h3>근거 요구사항</h3>
${table(['요구사항ID', '요구사항명', '내용 요약'], data.evidence.length ? data.evidence.map(e => `<tr><td class="id">${escapeHtml(e.REQUIREMENT_ID)}</td><td>${escapeHtml(e.NAME)}</td><td>${escapeHtml(e.SUMMARY)}</td></tr>`) : [empty(3, '근거 요구사항이 없습니다(수동 추가).')])}
<p style="font-size:12px;color:var(--mute)">※ 근거는 프로그램 대장에 등록된 시점의 요구사항 스냅샷입니다.</p></section>

<section class="sheet" id="a2"><h2>2. 화면 구성</h2><p>화면 유형: <b>${escapeHtml(typeLabel)}</b> — 이 프로그램이 사용하는 버튼은 개략도의 버튼 위치에 표시됩니다. (실제 버튼 위치는 Part B-2 공통 규격을 따릅니다.)</p>${wireframe(data)}</section>

<section class="sheet pb" id="a3"><h2>3. 기능 요건</h2><p>화면이 제공해야 하는 기능과 처리 규칙입니다. <b>현업에서는 규칙(예: 필수 여부, 수정 가능 조건, 메시지)이 업무와 맞는지 중점 확인</b>해 주세요.</p>${specs.length ? table(['기능ID', '기능명', 'Action', '설명 · 처리 규칙', '검증 · 오류 메시지', '근거 요구사항'], functionRows) : noFunctions}</section>

<section class="sheet" id="a4"><h2>4. 항목 명세</h2><h3>4-1. 검색조건 (S)</h3>${table(['ID', '항목명', '컨트롤', '필수', '검색 규칙', '구분'], searchRows.length ? searchRows : [empty(6, '검색조건이 없습니다.')])}<h3>4-2. 목록 그리드 컬럼 (G)</h3>${table(['ID', '컬럼명', '유형', '정렬', '너비(px)', '구분'], gridRows.length ? gridRows : [empty(6, '그리드 컬럼이 없습니다.')])}<h3>4-3. 상세 입력항목 (D)</h3>${table(['ID', '항목명', '컨트롤', '필수', '편집', '구분'], detailRows.length ? detailRows : [empty(6, '상세 입력항목이 없습니다.')])}</section>

<section class="sheet" id="a5"><h2>5. 요구사항 추적표</h2><p>각 근거 요구사항이 어떤 기능에 반영되었는지 보여 줍니다. 반영되지 않은 요구사항은 누락 후보입니다.</p>${specs.length || !data.evidence.length ? trace : `${noFunctions}<div class="note warn"><b>누락 후보</b>: ${uncovered.map(escapeHtml).join(', ')} — 기능 요건이 없어 모든 근거 요구사항이 미연결입니다.</div>`}</section>

<section class="sheet pb" id="a6"><h2>6. 현업 검토 의견</h2><p>항목별로 의견과 판정을 기록해 주세요. 판정이 모두 <b>승인</b>이면 설계 확정을 진행할 수 있습니다.</p><div class="sum" id="sum"></div>${table(['검토 항목', '의견', '판정'], reviewRows)}
<div class="sign"><div>작성 (설계 담당)<input class="sig" type="text" placeholder="이름 / 일자"></div><div>현업 검토<input class="sig" type="text" placeholder="이름 / 일자"></div><div>승인<input class="sig" type="text" placeholder="이름 / 일자"></div></div>
<p style="font-size:12px;color:var(--mute);margin-top:8px">※ 이 검토란은 인쇄/PDF로 회수하는 방식입니다. 시스템에 저장되는 검토 기능은 별도 결정 사항입니다.</p></section>

<section class="sheet pb" id="b1"><span class="part b">PART B · 개발 지시서 (개발자 / AI 개발자)</span><h2>1. 구현 범위</h2><p><b>구현 대상</b>: 프로그램 <code>${escapeHtml(program.PROGRAM_ID)}</code> (${escapeHtml(program.PROGRAM_NAME)})의 화면과 기능 ${specs.length}건${specs.length ? `(${specs.map(f => escapeHtml(f.FUNCTION_ID)).join(', ')})` : ''}.</p><p><b>구현 기준</b>: 이 문서의 Part A가 현업 검토를 마친 상태(설계 상태 <b>확정</b>)여야 구현을 시작합니다. 현재 상태: <b>${STATUS_LABELS[status]}</b>.</p><h3>비범위</h3><ul class="tight"><li>이 문서에 없는 기능·항목을 임의로 추가하지 않는다.</li><li>공통 컴포넌트·공통 CSS·Core 권한 구조를 변경하지 않는다. 필요하면 구현하지 말고 사전 보고한다.</li><li>DB 스키마·API 계약 변경은 별도 승인 후 진행한다.</li></ul></section>

<section class="sheet" id="b2"><h2>2. 화면 구현 지침</h2><p>화면 유형 <code>${escapeHtml(body.SCREEN_TYPE)}</code>의 표준 구성입니다. 비율·간격·색을 화면에서 직접 CSS로 만들지 않습니다.</p>${table(['공통 컴포넌트', '사용 방법'], comps.map(row => `<tr><td class="id">${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`))}<ul class="tight"><li>검색조건 ${body.SEARCH_FIELDS.length}개, 목록 컬럼 ${body.GRID_COLUMNS.length}개, 상세 항목 ${body.DETAIL_FIELDS.length}개는 4장 명세와 같은 순서·라벨을 사용한다.</li><li>버튼 표시 방식(아이콘+텍스트/아이콘만)은 UI 환경설정을 따른다.</li></ul></section>

<section class="sheet" id="b3"><h2>3. 데이터 계약</h2><p>도메인·API·DTO 필드는 <code>SCREAMING_SNAKE_CASE</code>, UI 내부 상태·props는 camelCase를 사용합니다. 아래 필드ID는 설계 항목과의 연결 키이며 DB 컬럼/API 필드명은 <b>PLAN에서 표준용어집 기준으로 확정</b>합니다.</p>${table(['필드ID', '영역', '라벨', '타입/컨트롤', '필수', 'API 필드명(제안 필요)'], contractRows.length ? contractRows : [empty(6, '항목이 없습니다.')])}</section>

<section class="sheet" id="b4"><h2>4. 기능별 구현 지시</h2>${specs.length ? functionInstructions : noFunctions}</section>

<section class="sheet" id="b5"><h2>5. 권한</h2><p>권한은 <code>ROLE × PROGRAM × ACTION_CODE</code> 기준입니다. 이 프로그램이 사용하는 Action: ${body.ACTION_CODES.map(code).join(', ') || '-'}.</p>${table(['ROLE', 'ACTION_CODE', '허용'], body.ACTION_CODES.map(c => `<tr><td>ADMIN</td><td>${code(c)}</td><td class="c">Y</td></tr>`))}<p style="font-size:12px;color:var(--mute)">※ 모듈 전용 Action이 필요하면 모듈 Manifest에 선언합니다(Core 변경 금지). 표시 UI는 권한에 따라 버튼을 숨기거나 비활성화합니다.</p></section>

<section class="sheet" id="b6"><h2>6. 수용 기준</h2><p>아래를 브라우저에서 확인할 수 있어야 완료입니다.</p>${specs.length ? acceptance : ''}<h3>공통</h3><ul class="ac"><li>1280px 폭에서 레이아웃이 깨지지 않는다.</li><li>미선택·0건·오류 상태가 각각 안내 문구와 함께 표시된다.</li><li><code>npm run build</code>, <code>npm run lint</code>, <code>npm run backend:test</code>, <code>git diff --check</code> 통과.</li></ul></section>

<section class="sheet" id="b7"><h2>7. 작업 규칙</h2><ul class="ac dont"><li>PLAN(설계 이해 목록) 보고 후 승인 전에는 코드를 수정하지 않는다.</li><li>새 branch/worktree 생성, <code>main</code>·<code>dev-pm</code> 직접 수정, 강제 push, reset 금지.</li><li>commit/push/PR은 각각 별도 승인 후에만 수행한다.</li><li>비밀키·토큰·계정정보를 저장소에 넣지 않는다. 회사 LLM은 프런트에서 직접 호출하지 않고 Spring Backend를 경유한다.</li><li>이 문서에 없는 기능을 임의로 확장하지 않는다. 불명확한 점은 구현하지 말고 질문으로 보고한다.</li></ul></section>

<section class="sheet" id="b8"><h2>8. AI 개발자용 입력</h2><p>AI 코딩 도구(Codex, Claude 등)에 그대로 붙여 넣는 지시문과 구조화 데이터입니다. 지시문에 설계 JSON이 포함되어 있습니다.</p>
<div class="copyrow"><button type="button" class="btn pri" onclick="copyText('aiPrompt',this)">지시문 복사</button><span>PLAN 보고까지만 요청하는 안전한 시작 지시문</span></div><pre class="blk" id="aiPrompt">${escapeHtml(buildAiPrompt(data))}</pre>
<div class="copyrow"><button type="button" class="btn" onclick="copyText('jsonOut',this)">설계 JSON 복사</button><span>기계가 읽는 설계 데이터 (이 문서의 모든 표가 이 JSON에서 생성됨)</span></div><pre class="blk" id="jsonOut">${escapeHtml(JSON.stringify(buildDesignJson(data), null, 2))}</pre></section>`;

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>${escapeHtml(`화면 설계서 — ${program.PROGRAM_NAME} (v${data.design.VERSION} · ${STATUS_LABELS[status]})`)}</title>
<style>${css}</style></head><body><div class="layout">${nav}<main id="doc">${main}</main></div><script>${script}</script></body></html>`;
}
