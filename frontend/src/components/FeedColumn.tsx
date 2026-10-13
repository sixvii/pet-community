import type { ReactNode } from "react";

const layoutClasses = "mx-auto min-h-full w-full max-w-[780px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:max-w-[820px] min-[1280px]:px-10";

export function FeedColumn({
  children,
  className = "",
  lang,
}: {
  children: ReactNode;
  className?: string;
  lang?: string;
}) {
  return (
    <div lang={lang} className={`pawly-feed-column ${layoutClasses} ${className}`.trim()}>
      {children}
    </div>
  );
}