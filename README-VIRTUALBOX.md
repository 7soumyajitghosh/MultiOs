# MyOS — VirtualBox Boot Guide (Multiboot2 / x86_64 / BIOS + GRUB)

This project is a custom x86_64 hobby OS (MultiOs "Prism") booted via
**BIOS + GRUB Multiboot2**. The build preserves the existing kernel logic
(`kernel/`, `boot/boot.asm`, `boot/isr_stubs.asm`) and only changes build
wiring (Makefile, linker `KEEP`, GRUB ISO layout) to produce a VirtualBox-
bootable ISO in the project root:

- Kernel ELF: `./build/myos.elf` (validated Multiboot2)
- ISO root: `./isodir/boot/{myos.elf,grub/grub.cfg}`
- Final ISO: `./myos-virtualbox.iso` (via `grub-mkrescue`)

Architecture is **x86_64**. Multiboot2 is used (not Multiboot1, not a raw
boot-sector image) because `boot/boot.asm` already implements a valid
Multiboot2 header and GRUB (`multiboot2 /boot/myos.elf`) is the proven boot
path for this kernel. No kernel C logic was changed.

## 1. Dependencies

Ubuntu / Debian / WSL-Ubuntu (recommended on Windows):

```sh
sudo apt-get update
sudo apt-get install -y gcc nasm make qemu-system-x86 grub-pc-bin xorriso mtools python3 gdb
```

- `gcc`, `ld` — freestanding x86_64 ELF build (`-ffreestanding -nostdlib -mno-red-zone -m64`)
- `nasm` — assembles `boot/boot.asm`, `boot/isr_stubs.asm` (`-f elf64`)
- `grub-mkrescue`, `grub-file`, `xorriso`, `mtools`, `grub-pc-bin` — Multiboot2 validation + ISO creation
- `qemu-system-x86_64` — fast test without VirtualBox
- `gdb` — for `make debug`
- VirtualBox 7.x — for real VM boot (GUI or `VBoxManage`)
- Windows users: use **WSL-Ubuntu** or Docker (see `Dockerfile`). Native MinGW lacks ELF64 Multiboot tooling.

Check tools:

```sh
make check
# or: bash scripts/check.sh
```

## 2. Build commands

All artifacts stay inside this project directory only:
`./build/`, `./isodir/`, `./backup-before-virtualbox/`, `./myos-virtualbox.iso`

```sh
make all      # kernel + ISO (same as make iso)
make kernel   # ./build/myos.elf only
make iso      # validate + ./isodir/ layout + ./myos-virtualbox.iso
make clean    # removes ./build and ./isodir (+ ISO file)
make check    # host tool check
```

What `make iso` does (exact):

1. Links `./build/myos.elf` via `arch/x86_64/link.ld` (`ENTRY(_start)`, `.multiboot` first with `KEEP`).
2. Validates: `grub-file --is-x86-multiboot2 ./build/myos.elf`
3. Creates ISO tree:
   ```
   ./isodir/
   └── boot/
       ├── grub/
       │   └── grub.cfg
       └── myos.elf
   ```
4. Runs: `grub-mkrescue -o ./myos-virtualbox.iso ./isodir`

`./isodir/boot/grub/grub.cfg` (exact, timeout 0 for VirtualBox):

```
set timeout=0
set default=0

menuentry "My Custom OS" {
    multiboot2 /boot/myos.elf
    boot
}
```

Verify after build:

```sh
make clean
make iso
ls -lh ./myos-virtualbox.iso
file ./build/myos.elf
readelf -h ./build/myos.elf
grub-file --is-x86-multiboot2 ./build/myos.elf && echo "multiboot2: OK"
```

Expected `file`: `ELF 64-bit LSB executable, x86-64 ...`
Expected `readelf -h`: `Machine: Advanced Micro Devices X86-64`, `Entry point: 0x100000` (or near 1 MiB).

## 3. QEMU test command

Use QEMU before VirtualBox — faster iteration:

```sh
make run
# equivalent:
qemu-system-x86_64 -cdrom ./myos-virtualbox.iso -serial stdio -m 512M

# headless / CI log:
make run-serial
# qemu-system-x86_64 -cdrom ./myos-virtualbox.iso -serial stdio -display none -m 512M

# GDB stub (paused, connect gdb on :1234):
make debug
# then in another shell:
# gdb ./build/myos.elf -ex 'target remote :1234' -ex 'break kmain' -ex 'continue'
```

Expected VGA + serial output:

```
MultiOs 0.1.0 "Prism" -- prismkernel
[memory] map parsed ...
[shell] type `help`
multios>
```

Type `help` for shell commands.

## 4. VirtualBox GUI steps (BIOS, no EFI)

1. Open Oracle VirtualBox → **New**.
2. Name: `MyOS`, Type: `Other`, Version: `Other/Unknown (64-bit)`, RAM: `512 MB+`, no disk needed (ISO-only demo).
3. Create VM (skip hard disk is fine).
4. VM → **Settings → System → Motherboard**: uncheck **EFI** (use BIOS), Chipset `PIIX3`, `Enable I/O APIC` on.
5. **Settings → System → Processor**: 1–2 CPUs, **Enable PAE/NX** on.
6. **Settings → Display**: 16–32 MB video, Graphics Controller `VBoxVGA` or `VMSVGA`.
7. **Settings → Storage**: Controller IDE → **Add Optical Drive** → Choose disk → select `./myos-virtualbox.iso` (copy it to the Windows host path accessible by VirtualBox if using WSL: e.g. `\\wsl$\Ubuntu\...` or `D:\Project\MultiOs\myos-virtualbox.iso`).
8. **Settings → Audio/USB**: can disable for test.
9. **Start** → GRUB menu `My Custom OS` boots instantly (`timeout=0`) → same banner + shell as QEMU.
10. To detach ISO later: **Devices → Optical Drives → Remove disk**.

If you built inside WSL, the ISO path from Windows is `D:\Project\MultiOs\myos-virtualbox.iso` (WSL `/mnt/d/Project/MultiOs/myos-virtualbox.iso` maps there directly).

## 5. VBoxManage commands (headless / scripted)

Replace `MyOS` with your VM name and fix `ISOPATH` to your host path:

```sh
# Create VM (BIOS, 512 MB, 1 CPU)
VBoxManage createvm --name "MyOS" --ostype "Other_64" --register
VBoxManage modifyvm "MyOS" --memory 512 --cpus 1 --firmware bios --chipset piix3 --rtcuseutc on --ioapic on --pae on --longmode on
VBoxManage modifyvm "MyOS" --graphicscontroller vmsvga --vram 32
VBoxManage modifyvm "MyOS" --audio none --usb off

# Attach ISO as IDE DVD (if no IDE controller, add one)
VBoxManage storagectl "MyOS" --name "IDE" --add ide --controller PIIX4
VBoxManage storageattach "MyOS" --storagectl "IDE" --port 0 --device 0 --type dvddrive --medium "/full/path/to/myos-virtualbox.iso"

# Optional: serial COM1 to file for kernel logs
VBoxManage modifyvm "MyOS" --uart1 0x3F8 4 --uartmode1 file ./serial.log

# Start (GUI or headless)
VBoxManage startvm "MyOS" --type gui
# VBoxManage startvm "MyOS" --type headless

# Power off / detach when done
VBoxManage controlvm "MyOS" poweroff
VBoxManage storageattach "MyOS" --storagectl "IDE" --port 0 --device 0 --type dvddrive --medium none
```

Windows (`cmd`/`PowerShell`) example — adjust VirtualBox install path if needed:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" createvm --name "MyOS" --ostype "Other_64" --register
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" modifyvm "MyOS" --memory 512 --firmware bios --ioapic on --pae on
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" storagectl "MyOS" --name "IDE" --add ide
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" storageattach "MyOS" --storagectl "IDE" --port 0 --device 0 --type dvddrive --medium "D:\Project\MultiOs\myos-virtualbox.iso"
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "MyOS" --type gui
```

WSL → Windows path note: WSL file `/mnt/d/Project/MultiOs/myos-virtualbox.iso` is `D:\Project\MultiOs\myos-virtualbox.iso` from Windows/VirtualBox.

## 6. Multiboot2 compliance (why no Multiboot1 / raw image)

- `boot/boot.asm` section `.multiboot` (`align 8`): magic `0xE85250D6`, arch `0`, `len = mb2_end-mb2_start`, checksum `-(magic+arch+len)`, tags: info-request (type 1, requests 2/4/6/8), framebuffer (type 5, optional, 1024×768×32), end (type 0, size 8).
- `arch/x86_64/link.ld`: `ENTRY(_start)`, base `0x100000`, `.multiboot` first with `KEEP(*(.multiboot))` so `--gc-sections`-style discards cannot drop the header; header stays within first 32 KiB.
- Stack: 16 KiB `.bss` (`stack_bottom`/`stack_top`), `mov esp,stack_top` in 32-bit `_start`, `mov rsp,stack_top` in `long_mode_start` before `call kmain`.
- Entry: `ENTRY(_start)` → checks (multiboot magic `0x36D76289`, CPUID, long mode) → 1 GiB identity paging (PML4/PDPT/PD, 2 MiB pages) → `EFER.LME` → `GDT64` → `jmp 0x08:long_mode_start` → `call kmain(magic, info)`.
- No return: `kmain` ends with `shell_run()` + `for(;;) hlt()`; asm fallback `.hang: hlt; jmp .hang`.
- Because the image is Multiboot2, `grub.cfg` correctly uses `multiboot2 /boot/myos.elf` (not legacy `multiboot`). A raw boot-sector image path was rejected: the kernel is ELF64 + >512 bytes and relies on GRUB to enter protected mode with Multiboot2 info (mmap); forcing a 512-byte MBR stub would be incompatible.

## 7. Troubleshooting

- `grub-mkrescue: not found` → `sudo apt-get install -y grub-pc-bin xorriso mtools`
- `grub-file: ... is not multiboot2` → check `boot/boot.asm` header checksum/alignment, `link.ld` `KEEP`, and that `.multiboot` is first section: `readelf -S ./build/myos.elf`, `objdump -s -j .multiboot ./build/myos.elf`
- `nasm: command not found` → `sudo apt-get install -y nasm`
- `ld: cannot find arch/x86_64/link.ld` → run `make` from project root
- Triple fault / reboot loop in QEMU/VBox → verify GRUB used `multiboot2` (not `multiboot`), magic `0x36D76289` in `check_multiboot`, and 1 GiB identity map covers kernel at `0x100000`
- QEMU window empty → check serial: `make run-serial`; VGA needs 80×25 text
- VirtualBox: black screen / `Guru Meditation` → ensure **EFI off (BIOS)**, **I/O APIC on**, **PAE/NX on**, 512 MB+ RAM, IDE optical with ISO attached; try `VMSVGA` vs `VBoxVGA`
- VirtualBox cannot see WSL ISO → copy/use Windows path `D:\Project\MultiOs\myos-virtualbox.iso`, not bare `/mnt/...` or `\\wsl$` without permissions
- `make` line-ending errors (`\r: command not found`) → ensure `Makefile` LF endings: `file Makefile`, `dos2unix Makefile` if needed
- Permission / `sudo` → never use `sudo` except `apt-get install`; builds run unprivileged; only `make clean` removes `./build`/`./isodir`
- Backups: pre-change originals in `./backup-before-virtualbox/` (`Makefile.bak`, `link.ld.bak`, `boot.asm.bak`, `grub.cfg.bak`, `README-VIRTUALBOX.md.bak`)

## 8. Files changed / created (VirtualBox enablement)

- Modified: `Makefile` (ISO output `myos-virtualbox.iso`, kernel staged as `/boot/myos.elf`, GRUB entry `"My Custom OS"`, `grub-file` validation; `make all`/`kernel`/`iso`/`run`/`debug`/`clean`/`check`)
- Modified: `arch/x86_64/link.ld` (`.multiboot` now `KEEP(*(.multiboot))` with comment)
- Verified (no change): `boot/boot.asm` (header, checksum, align 8, stack, `ENTRY(_start)`, no-return hang already correct)
- Generated on build: `./build/myos.elf`, `./isodir/boot/myos.elf`, `./isodir/boot/grub/grub.cfg`, `./myos-virtualbox.iso`
- Backups: `./backup-before-virtualbox/`
- Docs: this file
