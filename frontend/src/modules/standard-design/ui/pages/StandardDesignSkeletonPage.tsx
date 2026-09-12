import PageHeader from '../../../../components/common/PageHeader';
import type { ReactNode } from 'react';

interface StandardDesignSkeletonPageProps {
  title: string;
  description: string;
  nextStep: string;
  children?: ReactNode;
}

export default function StandardDesignSkeletonPage({
  title,
  description,
  nextStep,
  children,
}: StandardDesignSkeletonPageProps) {
  return (
    <div className="page standard-design-page">
      <PageHeader
        breadcrumbs={['Standard Design', title]}
        description={description}
      />
      <section className="standard-design-skeleton">
        <div>
          <span>PRODUCT MODULE</span>
          <h2>{title}</h2>
          <p>Module Manifest를 통한 화면 진입 Skeleton입니다.</p>
        </div>
        <dl>
          <div><dt>현재 단계</dt><dd>구조 검증</dd></div>
          <div><dt>다음 작업</dt><dd>{nextStep}</dd></div>
        </dl>
      </section>
      {children}
    </div>
  );
}
