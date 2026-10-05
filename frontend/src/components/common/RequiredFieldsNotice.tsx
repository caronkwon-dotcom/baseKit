const messages = {
  ko: '빨간 점은 필수 입력 항목입니다',
  en: 'A red dot indicates a required field',
  ja: '赤い点は必須入力項目を示します',
};

export default function RequiredFieldsNotice({ language = document.documentElement.lang || 'ko' }: { language?: string }) {
  const locale = language.split('-')[0] as keyof typeof messages;
  return <p className="standard-form-required-notice">{messages[locale] ?? messages.en}</p>;
}
