declare module 'virtual:basekit-documents' {
  export interface BaseKitDocument {
    key: string;
    path: string;
    title: string;
    category: 'RELEASE' | 'STATUS' | 'DECISION' | 'GUIDE' | 'SAMPLE' | 'IDEA';
    status: string;
    content: string;
  }

  const documents: BaseKitDocument[];
  export default documents;
}
