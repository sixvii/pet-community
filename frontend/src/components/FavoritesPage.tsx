import type { Provider } from "../data/models";
import {
  IconHeart,
  IconMapPin,
  IconStarFilled,
  IconX,
} from "@tabler/icons-react";

export function FavoritesPage({
  providers,
  onProvider,
  onRemove,
  onDiscover,
}: {
  providers: Provider[];
  onProvider: (provider: Provider) => void;
  onRemove: (provider: Provider) => void;
  onDiscover: () => void;
}) {
  return (
    <div className="mx-auto min-h-full w-full max-w-[780px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:max-w-[820px] min-[1280px]:px-10">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--pawly-border)] pt-[17px] pb-[14px]">
        <h1 className="m-0 text-base font-semibold">Saved care</h1>
        <span className="text-[14.5px] text-[var(--pawly-muted)]">
          {providers.length} {providers.length === 1 ? "provider" : "providers"}
        </span>
      </div>
      {providers.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pt-4 max-[700px]:grid-cols-1">
          {providers.map((provider) => (
            <article className="relative overflow-hidden rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)]" key={provider.id}>
              <button
                className="flex w-full cursor-pointer flex-col border-0 bg-transparent p-0 text-left text-inherit max-[700px]:grid max-[700px]:grid-cols-[110px_minmax(0,1fr)] max-[700px]:items-stretch"
                onClick={() => onProvider(provider)}
              >
                <img className="block h-[130px] w-full object-cover max-[700px]:h-full max-[700px]:min-h-[145px]" src={provider.image} alt="" loading="lazy" decoding="async" />
                <span className="flex flex-col gap-1 px-3 pt-[11px] pb-3">
                  <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px]">{provider.name}</strong>
                  <small className="text-[14.5px] text-[var(--pawly-muted)]">{provider.type}</small>
                  <span className="mt-[3px] flex gap-[11px] text-[14.5px] text-[var(--pawly-secondary-text)]">
                    <span className="flex items-center gap-1 text-[var(--pawly-accent)]">
                      <IconStarFilled size={13} /> {provider.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconMapPin size={13} className="text-[var(--pawly-accent)]" />
                      {provider.location}
                    </span>
                  </span>
                  <span className="mt-[3px] text-[14.5px] font-semibold">{provider.price}</span>
                </span>
              </button>
              <button
                className="absolute top-2 right-2 grid size-[31px] cursor-pointer place-items-center rounded-full border border-white/20 bg-[#191919]/80 text-[var(--pawly-text)]"
                aria-label={`Remove ${provider.name} from favorites`}
                onClick={() => onRemove(provider)}
              >
                <IconX size={17} />
              </button>
              <span className="absolute top-[15px] left-[15px] grid place-items-center text-[#e9a8aa] max-[700px]:hidden" aria-hidden="true">
                <IconHeart size={17} fill="currentColor" />
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center rounded-lg border border-[var(--pawly-border-strong)] bg-[var(--pawly-card)] px-3.5 text-[14.5px] font-semibold text-[var(--pawly-text)]" onClick={onDiscover}>
            Find pet care
          </button>
        </div>
      )}
    </div>
  );
}
