# MultiOs Branding & Legal — Originality Statement

MultiOs is an original name coined for this hobby project. It does not use
Apple, Microsoft, Linux, Ubuntu, macOS, Windows, Android, BSD, or any other
trademark in its branding, code, or assets.

## What "original" means here

- No kernel, userspace, init system, package manager, desktop environment,
  or source code is reused from Ubuntu, Debian, Arch, Fedora, Linux, BSD,
  Android, Windows, macOS, or any existing OS.
- No proprietary or third-party icons, fonts, wallpapers, sounds, logos,
  or UI assets are copied or embedded.
- Build/development tools only (allowed): GCC, Clang, NASM, QEMU, GRUB,
  GNU Make, Python, Git. GRUB is used solely as a Multiboot2 boot loader
  for the first prototype; it is not part of MultiOs itself. QEMU is only
  an emulator for testing.

## Original design choices (v0.1.0 "Prism")

- Kernel name: `prismkernel` (original).
- Shell name: `prismsh` (original).
- Palette ("Prism Dusk", original combination):
  - Void Navy background `#0B1026`
  - Prism Teal accent `#2DD4BF`
  - Signal Amber highlight `#FBBF24`
  - Mist text `#E2E8F0`
  - VGA mapping: background uses VGA blue/black, accent uses cyan/yellow —
    chosen to echo the palette within 16-color text limits.
- Logo: original ASCII hexagonal prism drawn with `/ \ _ |` characters
  (see shell `logo` command and boot banner). No image file is bundled.
- Icons: none bundled in v0.1.0. The shell uses text glyphs such as `>`,
  `*`, `#` as functional markers, not copied icon sets.
- Fonts: no font files bundled. The text console uses the VGA adapter's
  built-in ROM glyphs (hardware feature, not a copied asset). Documentation
  mentions `DejaVu Sans` only as an example host-side editor font, not
  embedded. A future original "Prism Sans" typeface is planned and does
  not exist yet, so nothing is copied.
- Sounds/wallpapers: none included.

## UI inspiration vs copying

The text UI is inspired only by general modern desktop usability
(prompt + commands + status lines + help text). Layout, wording, colors,
and ASCII art are newly authored for MultiOs.

## Compliance checklist for contributors

1. Write all code from scratch or from CPU/spec datasheets you cite.
2. Do not vendor code, binaries, fonts, or art from other OS projects.
3. Do not name-drop trademarks in the product name, banner, or themes.
4. If you consult the Multiboot2 specification or Intel SDM, cite the
   section — facts and constants (e.g. magic `0xE85250D6`) are not branding.
