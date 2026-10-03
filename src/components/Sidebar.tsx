import { NAV_SECTIONS } from '../data/mock';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  storageLabel?: string;
}

/**
 * Grouped app sidebar. Sections have compact uppercase labels;
 * rows use SidebarItem for the rounded selected state.
 */
export function Sidebar({ activeId, onSelect, storageLabel }: SidebarProps) {
  return (
    <nav aria-label="App sections" className="flex h-full flex-col gap-4 overflow-y-auto px-2 py-1">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
            {section.title}
          </p>
          <ul className="flex flex-col gap-[2px]">
            {section.items.map((item) => (
              <li key={item.id}>
                <SidebarItem
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  selected={activeId === item.id}
                  onSelect={() => onSelect(item.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-auto rounded-[12px] border border-black/[0.06] bg-white/60 p-3">
        <p className="text-[12px] font-semibold text-neutral-800">Storage</p>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          {storageLabel ?? '18.2 of 25 GB used'}
        </p>
        <div
          role="progressbar"
          aria-valuenow={73}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Storage used"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.08]"
        >
          <div className="h-full w-[73%] rounded-full bg-[#0071e3]" />
        </div>
      </div>
    </nav>
  );
}
