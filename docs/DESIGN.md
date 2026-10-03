# MultiOs DESIGN (v0.1.0 "Prism") — original notes

## Goals
Standalone x86_64 hobby OS, educational, fully original code.
Prototype boots via GRUB Multiboot2, runs a VGA + serial shell.

## Memory map
- Kernel linked at 0x100000 (1 MiB).
- Bootstrap identity-maps first 1 GiB with 2 MiB huge pages
  (PML4 -> PDPT -> PD, present + writable + huge).
- PMM bitmap tracks up to 4 GiB (1M pages), allocates only below 1 GiB.
- Low 1 MiB + kernel image reserved. Heap (64 pages initial) on top of PMM.

## Boot flow
GRUB -> `_start` (32-bit) -> checks (multiboot magic, CPUID, long mode)
-> page tables -> EFER.LME -> GDT64 -> `long_mode_start` (64-bit)
-> `kmain(magic, info)`.

## Interrupts
- PIC remapped 0x20-0x2F, IRQ0 timer + IRQ1 keyboard unmasked.
- IDT 256 interrupt gates, stubs in `boot/isr_stubs.asm`.
- PIT 100 Hz, keyboard Set-1 ring buffer.

## Console
- VGA 80x25 + COM1 38400 8N1. `kprintf` mirrors to both.
- `klog(tag, fmt)` prefix, `panic()` halts with message.

## Shell (prismsh)
`help/clear/info/mem/uptime/echo/logo/halt/reboot`, line editing
with backspace, prompt `multios> `.

## Roadmap
VMM + syscalls, AHCI/VirtIO + mfs, user mode + ELF + scheduler,
framebuffer GUI with original widgets.
